import os
import time
import threading
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from ml_model import EnhancedStockPredictor, get_prediction, get_detailed_prediction
from sentiment_analyzer import SentimentAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# In-memory prediction cache: symbol -> {data, timestamp}
_cache = {}
_CACHE_TTL = 1800  # seconds (30 minutes)

# Sentiment analyzer + cache
_sentiment_analyzer = SentimentAnalyzer()
_sentiment_cache = {}
_SENTIMENT_CACHE_TTL = 1800  # 30 minutes


def _cached_prediction(symbol, sentiment_snapshot=None):
    """Return cached result if fresh, otherwise compute and cache."""
    now = time.time()
    entry = _cache.get(symbol)
    if entry and (now - entry['ts']) < _CACHE_TTL:
        return entry['data'], True

    result = get_prediction(symbol, sentiment_snapshot=sentiment_snapshot)
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
        logger.warning(f"Sentiment fetch failed for {symbol}: {e}")
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

    # New model already integrates sentiment into the forecast target.
    sentiment_context = result.get('sentiment_context')
    if isinstance(sentiment_context, dict) and sentiment_context.get('blend', {}).get('integrated_in_model'):
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
        sentiment = _cached_sentiment(sym)
        result, from_cache = _cached_prediction(sym, sentiment_snapshot=sentiment)

        if not result:
            return jsonify({
                'error': 'Unable to generate prediction — insufficient data or fetch error',
                'symbol': sym,
            }), 400

        # Legacy fallback fusion if response does not already include in-model sentiment integration
        if sentiment:
            result = _apply_sentiment_fusion(result, sentiment)

        return jsonify({
            'symbol': sym,
            'timestamp': datetime.now().isoformat(),
            'cached': from_cache,
            'model': 'Return-Based RF/GB/XGB Ensemble + Regime + Integrated Sentiment',
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
        sentiment = _cached_sentiment(sym)
        entry = _cache.get(cache_key)
        if entry and (now - entry['ts']) < _CACHE_TTL:
            data = entry['data']
            if sentiment:
                data = _apply_sentiment_fusion(data, sentiment)
            return jsonify({
                'symbol': sym,
                'timestamp': datetime.now().isoformat(),
                'cached': True,
                'model': 'Return-Based RF/GB/XGB Ensemble + Regime + Integrated Sentiment',
                **data,
            })

        result = get_detailed_prediction(sym, sentiment_snapshot=sentiment)
        if not result:
            return jsonify({
                'error': 'Unable to generate detailed prediction',
                'symbol': sym,
            }), 400

        _cache[cache_key] = {'data': result, 'ts': now}

        if sentiment:
            result = _apply_sentiment_fusion(result, sentiment)

        return jsonify({
            'symbol': sym,
            'timestamp': datetime.now().isoformat(),
            'cached': False,
            'model': 'Return-Based RF/GB/XGB Ensemble + Regime + Integrated Sentiment',
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
            sentiment = _cached_sentiment(sym)
            result, from_cache = _cached_prediction(sym, sentiment_snapshot=sentiment)
            if result:
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


@app.route('/predict/<symbol>/live-confidence', methods=['GET'])
def live_confidence(symbol):
    """
    Dynamic confidence that evolves throughout the trading day.

    The idea: a prediction made at market close has a base confidence. As the
    NEXT trading day unfolds, confidence adjusts based on how reality is
    tracking the forecast:

    - Time factor: closer to close = less uncertainty = confidence rises
    - Direction alignment: price moving toward prediction = confidence boost
    - Price proximity: current price near predicted = confidence boost
    - Intraday volatility: low vol day = more predictable = confidence boost

    This gives users a LIVE, evolving confidence score they can watch.
    """
    import yfinance as yf
    from datetime import timezone
    import pytz

    try:
        sym = symbol.upper()
        et = pytz.timezone('US/Eastern')
        now_et = datetime.now(et)

        # Get the base prediction from cache
        entry = _cache.get(sym)
        if not entry or not entry.get('data'):
            return jsonify({'error': 'No prediction available', 'symbol': sym}), 404

        pred_data = entry['data']
        base_confidence = float(pred_data.get('confidence', 50))
        predicted_price = float(pred_data.get('prediction', 0))
        original_price = float(pred_data.get('current_price', 0))
        predicted_direction = pred_data.get('direction', 'NEUTRAL')

        if predicted_price <= 0 or original_price <= 0:
            return jsonify({'error': 'Invalid prediction data', 'symbol': sym}), 400

        # Fetch current intraday price
        try:
            ticker = yf.Ticker(sym)
            fast = ticker.fast_info
            current_price = float(fast.get('last_price', 0) or fast.get('lastPrice', 0))
            if current_price <= 0:
                hist = ticker.history(period="1d", interval="1m")
                if not hist.empty:
                    current_price = float(hist["Close"].iloc[-1])
        except Exception:
            current_price = original_price

        if current_price <= 0:
            current_price = original_price

        # === Factor 1: Time progression (0 to +12%) ===
        # Market hours: 9:30 AM - 4:00 PM ET = 390 minutes
        market_open = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
        market_close = now_et.replace(hour=16, minute=0, second=0, microsecond=0)

        is_market_hours = market_open <= now_et <= market_close and now_et.weekday() < 5

        if is_market_hours:
            elapsed = (now_et - market_open).total_seconds() / 60.0
            total = 390.0
            time_progress = min(elapsed / total, 1.0)
            # Exponential curve: confidence accelerates toward close
            time_factor = 12.0 * (time_progress ** 1.5)
        else:
            # Outside market hours: no time boost
            time_factor = 0.0
            time_progress = 0.0

        # === Factor 2: Direction alignment (-5% to +8%) ===
        price_move = (current_price - original_price) / original_price
        predicted_move = (predicted_price - original_price) / original_price

        if abs(predicted_move) > 0.001:
            # How much of the predicted move has been realized in the right direction?
            if predicted_move > 0 and price_move > 0:
                alignment = min(price_move / predicted_move, 2.0)
                direction_factor = 8.0 * min(alignment, 1.0)
            elif predicted_move < 0 and price_move < 0:
                alignment = min(abs(price_move) / abs(predicted_move), 2.0)
                direction_factor = 8.0 * min(alignment, 1.0)
            elif abs(price_move) < 0.002:
                direction_factor = 0.0
                alignment = 0.0
            else:
                # Moving opposite to prediction
                alignment = -min(abs(price_move) / abs(predicted_move), 1.0)
                direction_factor = -5.0 * min(abs(alignment), 1.0)
        else:
            alignment = 0.0
            direction_factor = 0.0

        # === Factor 3: Price proximity to target (0 to +6%) ===
        distance_pct = abs(current_price - predicted_price) / predicted_price
        if distance_pct < 0.005:
            proximity_factor = 6.0
        elif distance_pct < 0.01:
            proximity_factor = 4.0
        elif distance_pct < 0.02:
            proximity_factor = 2.0
        elif distance_pct < 0.03:
            proximity_factor = 1.0
        else:
            proximity_factor = 0.0

        # === Factor 4: Intraday volatility (0 to +4%) ===
        try:
            intraday = ticker.history(period="1d", interval="5m")
            if len(intraday) > 10:
                intraday_returns = intraday["Close"].pct_change().dropna()
                intraday_vol = float(intraday_returns.std())
                if intraday_vol < 0.003:
                    vol_factor = 4.0
                elif intraday_vol < 0.006:
                    vol_factor = 2.0
                elif intraday_vol < 0.01:
                    vol_factor = 0.0
                else:
                    vol_factor = -2.0
            else:
                vol_factor = 0.0
                intraday_vol = 0.0
        except Exception:
            vol_factor = 0.0
            intraday_vol = 0.0

        # === Compute dynamic confidence ===
        total_adjustment = time_factor + direction_factor + proximity_factor + vol_factor
        dynamic_confidence = max(25.0, min(96.0, base_confidence + total_adjustment))

        # Build beginner-friendly explanation
        explanations = []
        if time_factor > 2:
            explanations.append(f"Closer to market close (+{time_factor:.1f}%)")
        if direction_factor > 2:
            explanations.append(f"Price moving in predicted direction (+{direction_factor:.1f}%)")
        elif direction_factor < -2:
            explanations.append(f"Price moving against prediction ({direction_factor:.1f}%)")
        if proximity_factor > 2:
            explanations.append(f"Current price near target (+{proximity_factor:.1f}%)")
        if vol_factor > 1:
            explanations.append(f"Low volatility today (+{vol_factor:.1f}%)")
        elif vol_factor < -1:
            explanations.append(f"High volatility today ({vol_factor:.1f}%)")

        trend_word = "rising" if total_adjustment > 1.5 else "falling" if total_adjustment < -1.5 else "steady"

        return jsonify({
            'symbol': sym,
            'base_confidence': round(base_confidence, 2),
            'dynamic_confidence': round(dynamic_confidence, 2),
            'confidence_change': round(total_adjustment, 2),
            'confidence_trend': trend_word,
            'current_price': round(current_price, 2),
            'predicted_price': round(predicted_price, 2),
            'original_price': round(original_price, 2),
            'direction': predicted_direction,
            'is_market_hours': is_market_hours,
            'market_progress_percent': round(time_progress * 100, 1),
            'factors': {
                'time': round(time_factor, 2),
                'direction_alignment': round(direction_factor, 2),
                'price_proximity': round(proximity_factor, 2),
                'volatility': round(vol_factor, 2),
            },
            'explanation': explanations,
            'summary': (
                f"Confidence is {trend_word} at {dynamic_confidence:.1f}% "
                f"({'+' if total_adjustment >= 0 else ''}{total_adjustment:.1f}% from base). "
                + (explanations[0] + "." if explanations else "No significant changes yet.")
            ),
        })

    except Exception as e:
        return jsonify({'error': str(e), 'symbol': symbol.upper()}), 500


@app.route('/optimize-portfolio', methods=['POST'])
def optimize_portfolio_endpoint():
    """
    Markowitz mean-variance portfolio optimization.

    Accepts a list of stock symbols and returns:
    - Optimal portfolio (max Sharpe ratio)
    - Minimum variance portfolio
    - Efficient frontier curve
    - Per-stock statistics
    - Correlation matrix
    """
    try:
        from portfolio_optimizer import optimize_portfolio

        data = request.get_json()
        symbols = data.get('symbols', [])
        risk_free_rate = float(data.get('risk_free_rate', 0.05))

        if len(symbols) < 2:
            return jsonify({'error': 'At least 2 stock symbols are required'}), 400

        if len(symbols) > 15:
            return jsonify({'error': 'Maximum 15 symbols allowed'}), 400

        # Clean symbols
        symbols = [s.upper().strip() for s in symbols if s.strip()]

        result = optimize_portfolio(symbols, risk_free_rate=risk_free_rate)
        return jsonify(result)

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Portfolio optimization failed: {e}")
        return jsonify({'error': f'Optimization failed: {str(e)}'}), 500


@app.route('/backtest', methods=['POST'])
def backtest_endpoint():
    """
    Walk-forward backtesting engine.

    Trains the ML model on historical data and simulates a trading strategy
    on the unseen test period to evaluate real predictive performance.
    """
    try:
        from backtester import run_backtest

        data = request.get_json()
        symbol = data.get('symbol', 'AAPL').upper().strip()
        initial_capital = float(data.get('initial_capital', 100000))

        if initial_capital < 1000:
            return jsonify({'error': 'Minimum initial capital is $1,000'}), 400

        result = run_backtest(symbol, initial_capital=initial_capital)
        return jsonify(result)

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Backtest failed for {data.get('symbol', '?')}: {e}")
        return jsonify({'error': f'Backtest failed: {str(e)}'}), 500


@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    _cache.clear()
    _sentiment_cache.clear()
    return jsonify({'status': 'cache cleared'})


@app.route('/market-fear', methods=['GET'])
def market_fear():
    """
    Fear & Greed index (0-100) derived from VIX and SPY signals.
    0 = Extreme Fear, 50 = Neutral, 100 = Extreme Greed.
    """
    try:
        import yfinance as yf

        # Fetch VIX
        vix = yf.download("^VIX", period="1mo", interval="1d", progress=False)
        spy = yf.download("SPY", period="3mo", interval="1d", progress=False)

        if vix.empty or spy.empty:
            return jsonify({'error': 'Market data unavailable'}), 503

        vix_level = float(vix["Close"].iloc[-1].iloc[0]) if hasattr(vix["Close"].iloc[-1], 'iloc') else float(vix["Close"].iloc[-1])
        vix_prev = float(vix["Close"].iloc[-6].iloc[0]) if hasattr(vix["Close"].iloc[-6], 'iloc') else float(vix["Close"].iloc[-6]) if len(vix) > 5 else vix_level
        vix_change = ((vix_level - vix_prev) / vix_prev) * 100 if vix_prev != 0 else 0

        spy_close = spy["Close"].squeeze() if hasattr(spy["Close"], 'squeeze') else spy["Close"]
        spy_sma50 = float(spy_close.rolling(50).mean().iloc[-1])
        spy_price = float(spy_close.iloc[-1])
        spy_vs_sma = ((spy_price - spy_sma50) / spy_sma50) * 100 if spy_sma50 != 0 else 0
        spy_ret_5d = ((spy_price - float(spy_close.iloc[-6])) / float(spy_close.iloc[-6])) * 100 if len(spy) > 5 else 0

        # --- Score components (each 0-100, 100 = Greed) ---
        # VIX level: <12 = extreme greed, >35 = extreme fear
        vix_score = max(0, min(100, 100 - ((vix_level - 12) / 23) * 100))

        # VIX momentum: falling VIX = greed, rising VIX = fear
        vix_mom_score = max(0, min(100, 50 - vix_change * 5))

        # SPY vs SMA50: above = greed, below = fear
        spy_trend_score = max(0, min(100, 50 + spy_vs_sma * 10))

        # SPY 5-day momentum
        spy_mom_score = max(0, min(100, 50 + spy_ret_5d * 15))

        # Weighted composite
        score = round(
            vix_score * 0.40 +
            vix_mom_score * 0.20 +
            spy_trend_score * 0.25 +
            spy_mom_score * 0.15
        )
        score = max(0, min(100, score))

        if score <= 20:
            label = "Extreme Fear"
        elif score <= 40:
            label = "Fear"
        elif score <= 60:
            label = "Neutral"
        elif score <= 80:
            label = "Greed"
        else:
            label = "Extreme Greed"

        return jsonify({
            'score': score,
            'label': label,
            'components': {
                'vix_level': round(vix_level, 2),
                'vix_score': round(vix_score),
                'vix_momentum': round(vix_change, 2),
                'vix_momentum_score': round(vix_mom_score),
                'spy_trend': round(spy_vs_sma, 2),
                'spy_trend_score': round(spy_trend_score),
                'spy_momentum': round(spy_ret_5d, 2),
                'spy_momentum_score': round(spy_mom_score),
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Background Prediction Scheduler ---
TRACKED_SYMBOLS = os.getenv(
    'TRACKED_SYMBOLS', 'AAPL,MSFT,TSLA,AMZN,NVDA,META,NFLX,GOOGL'
).split(',')
SCHEDULER_INTERVAL = int(os.getenv('SCHEDULER_INTERVAL', '3600'))  # seconds

_scheduler_results = {}


def _run_scheduled_predictions():
    """Background thread that runs predictions for all tracked symbols."""
    while True:
        logger.info(f"[Scheduler] Running predictions for {len(TRACKED_SYMBOLS)} symbols...")
        for sym in TRACKED_SYMBOLS:
            try:
                sentiment = _cached_sentiment(sym)
                result = get_prediction(sym, sentiment_snapshot=sentiment)
                if result:
                    if sentiment:
                        result = _apply_sentiment_fusion(result, sentiment)
                    _cache[sym] = {'data': result, 'ts': time.time()}
                    _scheduler_results[sym] = {
                        'last_run': datetime.now().isoformat(),
                        'status': 'success',
                        'signal': result.get('signal', 'N/A'),
                        'confidence': result.get('confidence', 0),
                    }
                    logger.info(f"[Scheduler] {sym}: {result.get('signal')} (confidence: {result.get('confidence')}%)")
                else:
                    _scheduler_results[sym] = {
                        'last_run': datetime.now().isoformat(),
                        'status': 'no_data',
                    }
            except Exception as e:
                logger.error(f"[Scheduler] {sym} failed: {e}")
                _scheduler_results[sym] = {
                    'last_run': datetime.now().isoformat(),
                    'status': 'error',
                    'error': str(e),
                }
        logger.info(f"[Scheduler] Done. Next run in {SCHEDULER_INTERVAL}s")
        time.sleep(SCHEDULER_INTERVAL)


@app.route('/scheduler/status', methods=['GET'])
def scheduler_status():
    return jsonify({
        'enabled': True,
        'interval_seconds': SCHEDULER_INTERVAL,
        'tracked_symbols': TRACKED_SYMBOLS,
        'results': _scheduler_results,
    })


if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

    # Start the background scheduler
    scheduler = threading.Thread(target=_run_scheduled_predictions, daemon=True)
    scheduler.start()
    logger.info(f"[Scheduler] Started — tracking {TRACKED_SYMBOLS} every {SCHEDULER_INTERVAL}s")

    app.run(host='0.0.0.0', port=5001, debug=debug)
