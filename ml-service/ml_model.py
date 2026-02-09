import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')

class EnhancedStockPredictor:
    def __init__(self, symbol):
        self.symbol = symbol
        self.scaler = StandardScaler()
        self.rf_model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
        self.gb_model = GradientBoostingRegressor(n_estimators=100, random_state=42, max_depth=5)
        
    def fetch_data(self, period='6mo'):
        ticker = yf.Ticker(self.symbol)
        df = ticker.history(period=period)
        return df
    
    def calculate_technical_indicators(self, df):
        df['SMA_10'] = df['Close'].rolling(window=10).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        
        df['EMA_12'] = df['Close'].ewm(span=12, adjust=False).mean()
        df['EMA_26'] = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = df['EMA_12'] - df['EMA_26']
        df['Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        df['BB_middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['BB_upper'] = df['BB_middle'] + (bb_std * 2)
        df['BB_lower'] = df['BB_middle'] - (bb_std * 2)
        df['BB_width'] = (df['BB_upper'] - df['BB_lower']) / df['BB_middle']
        
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        df['Price_Change'] = df['Close'].pct_change()
        df['Volatility'] = df['Price_Change'].rolling(window=20).std()
        
        df['High_Low_Ratio'] = (df['High'] - df['Low']) / df['Close']
        df['Close_Open_Ratio'] = (df['Close'] - df['Open']) / df['Open']
        
        for lag in [1, 2, 3, 5, 10]:
            df[f'Lag_{lag}'] = df['Close'].shift(lag)
            df[f'Return_{lag}'] = df['Close'].pct_change(lag)
        
        df['Momentum'] = df['Close'] - df['Close'].shift(10)
        df['ROC'] = ((df['Close'] - df['Close'].shift(12)) / df['Close'].shift(12)) * 100
        
        return df.dropna()
    
    def prepare_features(self, df):
        feature_columns = [
            'SMA_10', 'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26', 'MACD', 'Signal',
            'RSI', 'BB_width', 'Volume_Ratio', 'Volatility', 'High_Low_Ratio',
            'Close_Open_Ratio', 'Lag_1', 'Lag_2', 'Lag_3', 'Lag_5', 'Lag_10',
            'Return_1', 'Return_2', 'Return_3', 'Return_5', 'Return_10',
            'Momentum', 'ROC'
        ]
        
        X = df[feature_columns].values
        y = df['Close'].shift(-1).values
        
        valid_idx = ~np.isnan(y)
        X = X[valid_idx]
        y = y[valid_idx]
        
        return X, y, feature_columns
    
    def train_models(self, X, y):
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.rf_model.fit(X_train_scaled, y_train)
        self.gb_model.fit(X_train_scaled, y_train)
        
        rf_score = self.rf_model.score(X_test_scaled, y_test)
        gb_score = self.gb_model.score(X_test_scaled, y_test)
        
        rf_pred = self.rf_model.predict(X_test_scaled)
        gb_pred = self.gb_model.predict(X_test_scaled)
        
        rf_mape = np.mean(np.abs((y_test - rf_pred) / y_test)) * 100
        gb_mape = np.mean(np.abs((y_test - gb_pred) / y_test)) * 100
        
        ensemble_pred = (rf_pred + gb_pred) / 2
        ensemble_mape = np.mean(np.abs((y_test - ensemble_pred) / y_test)) * 100
        
        return {
            'rf_r2': rf_score,
            'gb_r2': gb_score,
            'rf_mape': rf_mape,
            'gb_mape': gb_mape,
            'ensemble_mape': ensemble_mape,
            'test_size': len(y_test)
        }
    
    def predict_next_price(self, df):
        df_tech = self.calculate_technical_indicators(df)
        X, y, feature_columns = self.prepare_features(df_tech)
        
        metrics = self.train_models(X, y)
        
        latest_features = X[-1].reshape(1, -1)
        latest_features_scaled = self.scaler.transform(latest_features)
        
        rf_prediction = self.rf_model.predict(latest_features_scaled)[0]
        gb_prediction = self.gb_model.predict(latest_features_scaled)[0]
        ensemble_prediction = (rf_prediction + gb_prediction) / 2
        
        current_price = df['Close'].iloc[-1]
        price_change = ((ensemble_prediction - current_price) / current_price) * 100
        
        base_confidence = max(60, 100 - metrics['ensemble_mape'])
        
        volatility_penalty = min(20, df_tech['Volatility'].iloc[-1] * 500)
        final_confidence = max(55, min(95, base_confidence - volatility_penalty))
        
        direction = "UP" if ensemble_prediction > current_price else "DOWN" if ensemble_prediction < current_price else "NEUTRAL"
        
        trend_strength = abs(price_change)
        if trend_strength < 0.5:
            signal = "HOLD"
        elif direction == "UP" and trend_strength > 2:
            signal = "STRONG BUY"
        elif direction == "UP":
            signal = "BUY"
        elif direction == "DOWN" and trend_strength > 2:
            signal = "STRONG SELL"
        else:
            signal = "SELL"
        
        return {
            'prediction': round(ensemble_prediction, 2),
            'current_price': round(current_price, 2),
            'price_change_percent': round(price_change, 2),
            'confidence': round(final_confidence, 2),
            'direction': direction,
            'signal': signal,
            'rf_prediction': round(rf_prediction, 2),
            'gb_prediction': round(gb_prediction, 2),
            'model_metrics': {
                'ensemble_mape': round(metrics['ensemble_mape'], 2),
                'rf_r2': round(metrics['rf_r2'], 4),
                'gb_r2': round(metrics['gb_r2'], 4)
            },
            'technical_indicators': {
                'rsi': round(df_tech['RSI'].iloc[-1], 2),
                'macd': round(df_tech['MACD'].iloc[-1], 4),
                'volatility': round(df_tech['Volatility'].iloc[-1], 4),
                'volume_ratio': round(df_tech['Volume_Ratio'].iloc[-1], 2)
            }
        }

def get_prediction(symbol):
    try:
        predictor = EnhancedStockPredictor(symbol)
        df = predictor.fetch_data()
        
        if df is None or len(df) < 60:
            return None
            
        result = predictor.predict_next_price(df)
        return result
    except Exception as e:
        print(f"Error getting prediction for {symbol}: {str(e)}")
        return None