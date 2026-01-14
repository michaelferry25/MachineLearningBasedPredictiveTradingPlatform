from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import requests
import os
import json

app = Flask(__name__)
CORS(app)

def get_historical_data_yahoo(symbol, days=30):
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}?interval=1d&range=1mo"
        
        headers = {
            'User-Agent': 'Mozilla/5.0'
        }
        
        response = requests.get(url, headers=headers)
        data = response.json()
        
        if 'chart' in data and 'result' in data['chart'] and len(data['chart']['result']) > 0:
            result = data['chart']['result'][0]
            if 'indicators' in result and 'quote' in result['indicators']:
                closes = result['indicators']['quote'][0].get('close', [])
                prices = [p for p in closes if p is not None]
                return prices if prices else None
        
        return None
    except Exception as e:
        print(f"Error fetching Yahoo data: {e}")
        return None

def simple_moving_average_prediction(prices, window=5):
    if len(prices) < window:
        return None
    
    recent_prices = prices[-window:]
    sma = sum(recent_prices) / len(recent_prices)
    
    x_vals = list(range(len(recent_prices)))
    x_mean = sum(x_vals) / len(x_vals)
    y_mean = sum(recent_prices) / len(recent_prices)
    
    numerator = sum((x_vals[i] - x_mean) * (recent_prices[i] - y_mean) for i in range(len(x_vals)))
    denominator = sum((x_vals[i] - x_mean) ** 2 for i in range(len(x_vals)))
    
    trend = numerator / denominator if denominator != 0 else 0
    
    prediction = sma + trend
    
    confidence = min(95, max(60, 80 - abs(trend) * 10))
    
    direction = "UP" if trend > 0 else "DOWN" if trend < 0 else "NEUTRAL"
    
    return {
        "prediction": round(prediction, 2),
        "confidence": round(confidence, 2),
        "direction": direction,
        "current_price": round(prices[-1], 2),
        "change_percent": round(((prediction - prices[-1]) / prices[-1]) * 100, 2)
    }

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "ml-prediction"})

@app.route('/predict/<symbol>', methods=['GET'])
def predict(symbol):
    try:
        prices = get_historical_data_yahoo(symbol.upper())
        
        if not prices:
            return jsonify({
                "error": "Unable to fetch historical data",
                "symbol": symbol.upper()
            }), 400
        
        prediction = simple_moving_average_prediction(prices)
        
        if not prediction:
            return jsonify({
                "error": "Insufficient data for prediction",
                "symbol": symbol.upper()
            }), 400
        
        return jsonify({
            "symbol": symbol.upper(),
            "timestamp": datetime.now().isoformat(),
            "model": "Simple Moving Average + Trend",
            **prediction
        })
    
    except Exception as e:
        return jsonify({
            "error": str(e),
            "symbol": symbol.upper()
        }), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        
        results = []
        for symbol in symbols:
            prices = get_historical_data_yahoo(symbol)
            if prices:
                prediction = simple_moving_average_prediction(prices)
                if prediction:
                    results.append({
                        "symbol": symbol.upper(),
                        **prediction
                    })
        
        return jsonify({
            "predictions": results,
            "count": len(results)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)