import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from ml_model import EnhancedStockPredictor, get_prediction, get_detailed_prediction

app = Flask(__name__)
CORS(app)

# In-memory prediction cache: symbol -> {data, timestamp}
_cache = {}
_CACHE_TTL = 3600  # seconds (1 hour)


def _cached_prediction(symbol):
    """Return cached result if fresh, otherwise compute and cache."""
    now = time.time()
    entry = _cache.get(symbol)
    if entry and (now - entry['ts']) < _CACHE_TTL:
        return entry['data'], True  # (result, from_cache)

    result = get_prediction(symbol)
    if result:
        _cache[symbol] = {'data': result, 'ts': now}
    return result, False


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

        return jsonify({
            'symbol': sym,
            'timestamp': datetime.now().isoformat(),
            'cached': from_cache,
            'model': 'RF + GradientBoosting + XGBoost Ensemble (inverse-MAPE weighted)',
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
            return jsonify({
                'symbol': sym,
                'timestamp': datetime.now().isoformat(),
                'cached': True,
                'model': 'RF + GradientBoosting + XGBoost Ensemble (inverse-MAPE weighted)',
                **entry['data'],
            })

        result = get_detailed_prediction(sym)
        if not result:
            return jsonify({
                'error': 'Unable to generate detailed prediction',
                'symbol': sym,
            }), 400

        _cache[cache_key] = {'data': result, 'ts': now}
        return jsonify({
            'symbol': sym,
            'timestamp': datetime.now().isoformat(),
            'cached': False,
            'model': 'RF + GradientBoosting + XGBoost Ensemble (inverse-MAPE weighted)',
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
                results.append({'symbol': sym, 'cached': from_cache, **result})

        return jsonify({'predictions': results, 'count': len(results)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    _cache.clear()
    return jsonify({'status': 'cache cleared'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
