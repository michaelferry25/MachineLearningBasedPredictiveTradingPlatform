import os
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from ml_model import EnhancedStockPredictor, get_prediction, get_detailed_prediction
from sentiment_analyzer import SentimentAnalyzer

app = Flask(__name__)
CORS(app)

# In-memory prediction cache: symbol -> {data, timestamp}
_cache = {}
_CACHE_TTL = 3600  # seconds (1 hour)

# Sentiment analyzer + cache
_sentiment_analyzer = SentimentAnalyzer()
_sentiment_cache = {}
_SENTIMENT_CACHE_TTL = 1800  # 30 minutes


def _cached_prediction(symbol):
    """Return cached result if fresh, otherwise compute and cache."""
    now = time.time()
    entry = _cache.get(symbol)
    if entry and (now - entry['ts']) < _CACHE_TTL:
        return entry['data'], True

    result = get_prediction(symbol)
    if result:
        _cache[symbol] = {'data': result, 'ts': now}
    return result, False


def _cached_sentiment(symbol):
    """Return cached sentiment if fresh, otherwise compute and cache."""
    now = time.time()
    entry = _sentiment_cache.get(symbol)
    if entry and (now - entry['ts']) < _SENTIMENT_CACHE_TTL:
        return entry['data']

    try:
        result = _sentiment_analyzer.get_combined_sentiment(symbol)
        _sentiment_cache[symbol] = {'data': result, 'ts': now}
        return result
    except Exception as e:
        print(f"Sentiment fetch failed for {symbol}: {e}")
        return None


def _apply_sentiment_fusion(result, sentiment):
    """
    Fuse sentiment signal into ML prediction.

    The ML model predicts based on technicals. Sentiment acts as a
    confirmation/contradiction signal that adjusts confidence and can
    shift the final signal.

    - Agreement (ML bullish + sentiment positive): confidence boosted
    - Disagreement (ML bullish + sentiment negative): confidence reduced
    - Strong sentiment can shift borderline signals (Hold -> Buy/Sell)
    """
    if not sentiment or not result:
        return result

    combined = sentiment.get('combined', {})
    sent_score = combined.get('score', 0)
    sent_label = combined.get('label', 'Neutral')
    agreement = combined.get('agreement', 'mixed')

    ml_direction = result.get('direction', 'NEUTRAL')
    ml_confidence = result.get('confidence', 70)
    ml_signal = result.get('signal', 'HOLD')
    price_change = result.get('price_change_percent', 0)

    # Determine if sentiment agrees with ML direction
    sent_bullish = sent_score > 0.05
    sent_bearish = sent_score < -0.05
    ml_bullish = ml_direction == 'UP'
    ml_bearish = ml_direction == 'DOWN'

    # Calculate confidence adjustment
    conf_adjustment = 0
    if (ml_bullish and sent_bullish) or (ml_bearish and sent_bearish):
        # Agreement: boost confidence proportional to sentiment strength
        conf_adjustment = min(8, abs(sent_score) * 20)
    elif (ml_bullish and sent_bearish) or (ml_bearish and sent_bullish):
        # Disagreement: reduce confidence
        conf_adjustment = -min(8, abs(sent_score) * 15)

    # Extra boost if news and Reddit agree with each other
    if agreement == 'strong':
        conf_adjustment += 3 if conf_adjustment > 0 else -2

    adjusted_confidence = max(50, min(97, ml_confidence + conf_adjustment))

    # Signal adjustment: sentiment can shift borderline signals
    adjusted_signal = ml_signal
    trend_strength = abs(price_change)

    if ml_signal == 'HOLD' and trend_strength < 1.5:
        # Borderline hold — sentiment can tip it
        if sent_bullish and sent_score > 0.15 and ml_direction != 'DOWN':
            adjusted_signal = 'BUY'
        elif sent_bearish and sent_score < -0.15 and ml_direction != 'UP':
            adjusted_signal = 'SELL'
    elif ml_signal == 'BUY' and sent_bullish and sent_score > 0.2 and adjusted_confidence >= 75:
        adjusted_signal = 'STRONG BUY'
    elif ml_signal == 'SELL' and sent_bearish and sent_score < -0.2 and adjusted_confidence >= 75:
        adjusted_signal = 'STRONG SELL'

    # Build the fused result
    fused = dict(result)
    fused['confidence'] = round(adjusted_confidence, 2)
    fused['signal'] = adjusted_signal
    fused['sentiment_fusion'] = {
        'enabled': True,
        'sentiment_score': round(sent_score, 3),
        'sentiment_label': sent_label,
        'source_agreement': agreement,
        'confidence_before': round(ml_confidence, 2),
        'confidence_after': round(adjusted_confidence, 2),
        'confidence_delta': round(conf_adjustment, 2),
        'signal_before': ml_signal,
        'signal_after': adjusted_signal,
        'signal_shifted': adjusted_signal != ml_signal,
    }

    return fused


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'ml-prediction'})


@app.route('/predict/<symbol>', methods=['GET'])
def predict(symbol):
    try:
        sym = symbol.upper()
        result, from_cache = _cached_prediction(sym)

        if not result:
            return jsonify({
                'error': 'Unable to generate prediction — insufficient data or fetch error',
                'symbol': sym,
            }), 400

        # Fuse sentiment into prediction (uses cache, won't slow down)
        sentiment = _cached_sentiment(sym)
        if sentiment:
            result = _apply_sentiment_fusion(result, sentiment)

        return jsonify({
            'symbol': sym,
            'timestamp': datetime.now().isoformat(),
            'cached': from_cache,
            'model': 'RF + GradientBoosting + XGBoost Ensemble + Sentiment Fusion',
            **result,
        })

    except Exception as e:
        return jsonify({'error': str(e), 'symbol': symbol.upper()}), 500


@app.route('/predict/<symbol>/detailed', methods=['GET'])
def predict_detailed(symbol):
    try:
        sym = symbol.upper()
        cache_key = sym + '_detailed'
        now = time.time()
        entry = _cache.get(cache_key)
        if entry and (now - entry['ts']) < _CACHE_TTL:
            data = entry['data']
            sentiment = _cached_sentiment(sym)
            if sentiment:
                data = _apply_sentiment_fusion(data, sentiment)
            return jsonify({
                'symbol': sym,
                'timestamp': datetime.now().isoformat(),
                'cached': True,
                'model': 'RF + GradientBoosting + XGBoost Ensemble + Sentiment Fusion',
                **data,
            })

        result = get_detailed_prediction(sym)
        if not result:
            return jsonify({
                'error': 'Unable to generate detailed prediction',
                'symbol': sym,
            }), 400

        _cache[cache_key] = {'data': result, 'ts': now}

        sentiment = _cached_sentiment(sym)
        if sentiment:
            result = _apply_sentiment_fusion(result, sentiment)

        return jsonify({
            'symbol': sym,
            'timestamp': datetime.now().isoformat(),
            'cached': False,
            'model': 'RF + GradientBoosting + XGBoost Ensemble + Sentiment Fusion',
            **result,
        })

    except Exception as e:
        return jsonify({'error': str(e), 'symbol': symbol.upper()}), 500


@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])

        results = []
        for symbol in symbols:
            sym = symbol.upper()
            result, from_cache = _cached_prediction(sym)
            if result:
                sentiment = _cached_sentiment(sym)
                if sentiment:
                    result = _apply_sentiment_fusion(result, sentiment)
                results.append({'symbol': sym, 'cached': from_cache, **result})

        return jsonify({'predictions': results, 'count': len(results)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/sentiment/<symbol>', methods=['GET'])
def get_sentiment(symbol):
    try:
        sym = symbol.upper()
        now = time.time()
        entry = _sentiment_cache.get(sym)
        if entry and (now - entry['ts']) < _SENTIMENT_CACHE_TTL:
            return jsonify({**entry['data'], 'symbol': sym, 'cached': True})

        result = _sentiment_analyzer.get_combined_sentiment(sym)
        _sentiment_cache[sym] = {'data': result, 'ts': now}
        return jsonify({**result, 'symbol': sym, 'cached': False})
    except Exception as e:
        return jsonify({'error': str(e), 'symbol': symbol.upper()}), 500


@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    _cache.clear()
    _sentiment_cache.clear()
    return jsonify({'status': 'cache cleared'})


if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=5001, debug=debug)
