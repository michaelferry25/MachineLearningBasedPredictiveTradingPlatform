import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
import warnings
warnings.filterwarnings('ignore')


class EnhancedStockPredictor:
    def __init__(self, symbol):
        self.symbol = symbol
        self.scaler = StandardScaler()
        self.rf_model = RandomForestRegressor(
            n_estimators=200, random_state=42, max_depth=12,
            min_samples_split=5, n_jobs=-1
        )
        self.gb_model = GradientBoostingRegressor(
            n_estimators=200, random_state=42, max_depth=5,
            learning_rate=0.05, subsample=0.8
        )
        self.xgb_model = XGBRegressor(
            n_estimators=200, random_state=42, max_depth=6,
            learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
            verbosity=0
        )
        self.model_weights = None

    def fetch_data(self, period='2y'):
        ticker = yf.Ticker(self.symbol)
        df = ticker.history(period=period)
        return df

    def calculate_technical_indicators(self, df):
        # SMAs
        df['SMA_10'] = df['Close'].rolling(window=10).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()

        # EMAs and MACD
        df['EMA_12'] = df['Close'].ewm(span=12, adjust=False).mean()
        df['EMA_26'] = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = df['EMA_12'] - df['EMA_26']
        df['Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['MACD_Hist'] = df['MACD'] - df['Signal']

        # RSI (14-period)
        delta = df['Close'].diff()
        gain = delta.where(delta > 0, 0).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))

        # Bollinger Bands
        df['BB_middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['BB_upper'] = df['BB_middle'] + (bb_std * 2)
        df['BB_lower'] = df['BB_middle'] - (bb_std * 2)
        df['BB_width'] = (df['BB_upper'] - df['BB_lower']) / df['BB_middle']
        bb_range = (df['BB_upper'] - df['BB_lower']).replace(0, np.nan)
        df['BB_pct'] = (df['Close'] - df['BB_lower']) / bb_range

        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']

        # On Balance Volume (vectorised)
        df['OBV'] = (np.sign(df['Close'].diff()) * df['Volume']).fillna(0).cumsum()
        df['OBV_EMA'] = df['OBV'].ewm(span=20, adjust=False).mean()
        obv_ema_abs = df['OBV_EMA'].abs().replace(0, np.nan)
        df['OBV_Signal'] = (df['OBV'] - df['OBV_EMA']) / obv_ema_abs

        # ATR (Average True Range)
        high_low = df['High'] - df['Low']
        high_close = (df['High'] - df['Close'].shift()).abs()
        low_close = (df['Low'] - df['Close'].shift()).abs()
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df['ATR'] = true_range.rolling(window=14).mean()
        df['ATR_Ratio'] = df['ATR'] / df['Close']

        # Stochastic Oscillator
        low_14 = df['Low'].rolling(window=14).min()
        high_14 = df['High'].rolling(window=14).max()
        hl_range = (high_14 - low_14).replace(0, np.nan)
        df['Stoch_K'] = 100 * (df['Close'] - low_14) / hl_range
        df['Stoch_D'] = df['Stoch_K'].rolling(window=3).mean()

        # Williams %R
        df['Williams_R'] = -100 * (high_14 - df['Close']) / hl_range

        # Price action features
        df['Price_Change'] = df['Close'].pct_change()
        df['Volatility'] = df['Price_Change'].rolling(window=20).std()
        df['High_Low_Ratio'] = (df['High'] - df['Low']) / df['Close']
        df['Close_Open_Ratio'] = (df['Close'] - df['Open']) / df['Open']

        # Lagged price and return features
        for lag in [1, 2, 3, 5, 10]:
            df[f'Lag_{lag}'] = df['Close'].shift(lag)
            df[f'Return_{lag}'] = df['Close'].pct_change(lag)

        # Momentum indicators
        df['Momentum'] = df['Close'] - df['Close'].shift(10)
        df['ROC'] = ((df['Close'] - df['Close'].shift(12)) / df['Close'].shift(12)) * 100

        # Price relative to 52-week high/low
        df['High_52w'] = df['High'].rolling(window=252).max()
        df['Low_52w'] = df['Low'].rolling(window=252).min()
        df['Pct_from_52w_high'] = (df['Close'] - df['High_52w']) / df['High_52w']
        df['Pct_from_52w_low'] = (df['Close'] - df['Low_52w']) / df['Low_52w']

        return df.dropna()

    def prepare_features(self, df):
        feature_columns = [
            'SMA_10', 'SMA_20', 'SMA_50',
            'EMA_12', 'EMA_26',
            'MACD', 'Signal', 'MACD_Hist',
            'RSI',
            'BB_width', 'BB_pct',
            'Volume_Ratio',
            'OBV_Signal',
            'ATR_Ratio',
            'Stoch_K', 'Stoch_D',
            'Williams_R',
            'Volatility', 'High_Low_Ratio',
            'Close_Open_Ratio',
            'Lag_1', 'Lag_2', 'Lag_3', 'Lag_5', 'Lag_10',
            'Return_1', 'Return_2', 'Return_3', 'Return_5', 'Return_10',
            'Momentum', 'ROC',
            'Pct_from_52w_high', 'Pct_from_52w_low',
        ]

        X = df[feature_columns].values
        y = df['Close'].shift(-1).values

        valid_idx = ~np.isnan(y)
        X = X[valid_idx]
        y = y[valid_idx]

        return X, y, feature_columns

    @staticmethod
    def _mape(y_true, y_pred):
        return np.mean(np.abs((y_true - y_pred) / y_true)) * 100

    @staticmethod
    def _r2(y_true, y_pred):
        ss_res = np.sum((y_true - y_pred) ** 2)
        ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
        return 1 - ss_res / ss_tot if ss_tot != 0 else 0.0

    def train_models(self, X, y):
        # Hold-out: last 20% for evaluation
        split = int(len(X) * 0.8)
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        # Fit scaler on training data only, then transform both splits
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        self.rf_model.fit(X_train_scaled, y_train)
        self.gb_model.fit(X_train_scaled, y_train)
        self.xgb_model.fit(X_train_scaled, y_train)

        rf_pred = self.rf_model.predict(X_test_scaled)
        gb_pred = self.gb_model.predict(X_test_scaled)
        xgb_pred = self.xgb_model.predict(X_test_scaled)

        rf_mape = self._mape(y_test, rf_pred)
        gb_mape = self._mape(y_test, gb_pred)
        xgb_mape = self._mape(y_test, xgb_pred)

        # Inverse-MAPE weighting: lower error → higher weight
        inv = np.array([1.0 / rf_mape, 1.0 / gb_mape, 1.0 / xgb_mape])
        self.model_weights = inv / inv.sum()

        ensemble_pred = (
            self.model_weights[0] * rf_pred
            + self.model_weights[1] * gb_pred
            + self.model_weights[2] * xgb_pred
        )
        ensemble_mape = self._mape(y_test, ensemble_pred)

        return {
            'rf_r2': self._r2(y_test, rf_pred),
            'gb_r2': self._r2(y_test, gb_pred),
            'xgb_r2': self._r2(y_test, xgb_pred),
            'rf_mape': rf_mape,
            'gb_mape': gb_mape,
            'xgb_mape': xgb_mape,
            'ensemble_mape': ensemble_mape,
            'model_weights': self.model_weights.tolist(),
            'test_size': len(y_test),
            'split': split,
            'y_test': y_test.tolist(),
            'ensemble_pred': ensemble_pred.tolist(),
        }

    def predict_next_price(self, df):
        df_tech = self.calculate_technical_indicators(df)
        X, y, feature_columns = self.prepare_features(df_tech)

        metrics = self.train_models(X, y)

        # Scale the full dataset with the fitted scaler, then predict from last row
        latest_features = X[-1].reshape(1, -1)
        latest_features_scaled = self.scaler.transform(latest_features)

        rf_prediction = float(self.rf_model.predict(latest_features_scaled)[0])
        gb_prediction = float(self.gb_model.predict(latest_features_scaled)[0])
        xgb_prediction = float(self.xgb_model.predict(latest_features_scaled)[0])

        ensemble_prediction = (
            self.model_weights[0] * rf_prediction
            + self.model_weights[1] * gb_prediction
            + self.model_weights[2] * xgb_prediction
        )

        current_price = float(df['Close'].iloc[-1])
        price_change = ((ensemble_prediction - current_price) / current_price) * 100

        # Confidence: penalise high MAPE and high recent volatility
        base_confidence = max(60, 100 - metrics['ensemble_mape'] * 2)
        volatility_penalty = min(20, float(df_tech['Volatility'].iloc[-1]) * 500)
        final_confidence = max(55, min(95, base_confidence - volatility_penalty))

        direction = (
            'UP' if ensemble_prediction > current_price
            else 'DOWN' if ensemble_prediction < current_price
            else 'NEUTRAL'
        )

        trend_strength = abs(price_change)
        if trend_strength < 0.5:
            signal = 'HOLD'
        elif direction == 'UP' and trend_strength > 2:
            signal = 'STRONG BUY'
        elif direction == 'UP':
            signal = 'BUY'
        elif direction == 'DOWN' and trend_strength > 2:
            signal = 'STRONG SELL'
        else:
            signal = 'SELL'

        return {
            'prediction': round(float(ensemble_prediction), 2),
            'current_price': round(current_price, 2),
            'price_change_percent': round(float(price_change), 2),
            'confidence': round(float(final_confidence), 2),
            'direction': direction,
            'signal': signal,
            'rf_prediction': round(rf_prediction, 2),
            'gb_prediction': round(gb_prediction, 2),
            'xgb_prediction': round(xgb_prediction, 2),
            'model_metrics': {
                'ensemble_mape': round(float(metrics['ensemble_mape']), 2),
                'rf_r2': round(float(metrics['rf_r2']), 4),
                'gb_r2': round(float(metrics['gb_r2']), 4),
                'xgb_r2': round(float(metrics['xgb_r2']), 4),
                'model_weights': {
                    'rf': round(float(self.model_weights[0]), 3),
                    'gb': round(float(self.model_weights[1]), 3),
                    'xgb': round(float(self.model_weights[2]), 3),
                },
            },
            'model_details': {
                'metrics': {
                    'rf_r2': round(float(metrics['rf_r2']), 4),
                    'gb_r2': round(float(metrics['gb_r2']), 4),
                    'xgb_r2': round(float(metrics['xgb_r2']), 4),
                    'ensemble_mape': round(float(metrics['ensemble_mape']), 2),
                },
            },
            'technical_indicators': {
                'rsi': round(float(df_tech['RSI'].iloc[-1]), 2),
                'macd': round(float(df_tech['MACD'].iloc[-1]), 4),
                'macd_signal': round(float(df_tech['Signal'].iloc[-1]), 4),
                'stoch_k': round(float(df_tech['Stoch_K'].iloc[-1]), 2),
                'stoch_d': round(float(df_tech['Stoch_D'].iloc[-1]), 2),
                'williams_r': round(float(df_tech['Williams_R'].iloc[-1]), 2),
                'atr_ratio': round(float(df_tech['ATR_Ratio'].iloc[-1]), 4),
                'volatility': round(float(df_tech['Volatility'].iloc[-1]), 4),
                'volume_ratio': round(float(df_tech['Volume_Ratio'].iloc[-1]), 2),
                'bb_pct': round(float(df_tech['BB_pct'].iloc[-1]), 4),
                'obv_signal': round(float(df_tech['OBV_Signal'].iloc[-1]), 4),
            },
        }

    def predict_next_price_detailed(self, df):
        """Extended prediction that includes timeseries, backtest, and feature importance."""
        df_tech = self.calculate_technical_indicators(df)
        X, y, feature_columns = self.prepare_features(df_tech)

        metrics = self.train_models(X, y)

        latest_features = X[-1].reshape(1, -1)
        latest_features_scaled = self.scaler.transform(latest_features)

        rf_prediction = float(self.rf_model.predict(latest_features_scaled)[0])
        gb_prediction = float(self.gb_model.predict(latest_features_scaled)[0])
        xgb_prediction = float(self.xgb_model.predict(latest_features_scaled)[0])

        ensemble_prediction = (
            self.model_weights[0] * rf_prediction
            + self.model_weights[1] * gb_prediction
            + self.model_weights[2] * xgb_prediction
        )

        current_price = float(df['Close'].iloc[-1])
        price_change = ((ensemble_prediction - current_price) / current_price) * 100

        base_confidence = max(60, 100 - metrics['ensemble_mape'] * 2)
        volatility_penalty = min(20, float(df_tech['Volatility'].iloc[-1]) * 500)
        final_confidence = max(55, min(95, base_confidence - volatility_penalty))

        direction = (
            'UP' if ensemble_prediction > current_price
            else 'DOWN' if ensemble_prediction < current_price
            else 'NEUTRAL'
        )

        trend_strength = abs(price_change)
        if trend_strength < 0.5:
            signal = 'HOLD'
        elif direction == 'UP' and trend_strength > 2:
            signal = 'STRONG BUY'
        elif direction == 'UP':
            signal = 'BUY'
        elif direction == 'DOWN' and trend_strength > 2:
            signal = 'STRONG SELL'
        else:
            signal = 'SELL'

        # Feature importance from Random Forest
        importances = self.rf_model.feature_importances_
        feature_importance = sorted(
            [{'feature': col, 'importance': round(float(imp), 6)}
             for col, imp in zip(feature_columns, importances)],
            key=lambda x: x['importance'],
            reverse=True,
        )

        # Model comparison
        w = self.model_weights
        model_comparison = {
            'models': [
                {'name': 'Random Forest', 'prediction': round(rf_prediction, 2),
                 'weight': round(float(w[0]), 3), 'r2': round(float(metrics['rf_r2']), 4),
                 'mape': round(float(metrics['rf_mape']), 2)},
                {'name': 'Gradient Boosting', 'prediction': round(gb_prediction, 2),
                 'weight': round(float(w[1]), 3), 'r2': round(float(metrics['gb_r2']), 4),
                 'mape': round(float(metrics['gb_mape']), 2)},
                {'name': 'XGBoost', 'prediction': round(xgb_prediction, 2),
                 'weight': round(float(w[2]), 3), 'r2': round(float(metrics['xgb_r2']), 4),
                 'mape': round(float(metrics['xgb_mape']), 2)},
            ],
            'ensemble_prediction': round(float(ensemble_prediction), 2),
            'ensemble_mape': round(float(metrics['ensemble_mape']), 2),
            'current_price': round(current_price, 2),
        }

        # Indicator timeseries (last 60 rows)
        tail = df_tech.tail(60)
        dates = [d.isoformat() for d in tail.index]
        indicator_timeseries = {
            'dates': dates,
            'close': [round(float(v), 2) for v in tail['Close']],
            'sma_20': [round(float(v), 2) for v in tail['SMA_20']],
            'sma_50': [round(float(v), 2) for v in tail['SMA_50']],
            'bb_upper': [round(float(v), 2) for v in tail['BB_upper']],
            'bb_lower': [round(float(v), 2) for v in tail['BB_lower']],
            'rsi': [round(float(v), 2) for v in tail['RSI']],
            'macd': [round(float(v), 4) for v in tail['MACD']],
            'macd_signal': [round(float(v), 4) for v in tail['Signal']],
            'macd_hist': [round(float(v), 4) for v in tail['MACD_Hist']],
            'stoch_k': [round(float(v), 2) for v in tail['Stoch_K']],
            'stoch_d': [round(float(v), 2) for v in tail['Stoch_D']],
            'volume': [round(float(v), 0) for v in tail['Volume']],
            'volume_sma': [round(float(v), 0) for v in tail['Volume_SMA']],
        }

        # Backtest (predicted vs actual from test split)
        split = metrics['split']
        # Map test indices back to df_tech dates (offset by valid_idx removal)
        valid_df = df_tech.iloc[:-1]  # rows used after shift(-1) removed last NaN
        test_dates_idx = valid_df.index[split:split + len(metrics['y_test'])]
        backtest = {
            'dates': [d.isoformat() for d in test_dates_idx],
            'actual': [round(v, 2) for v in metrics['y_test']],
            'predicted': [round(v, 2) for v in metrics['ensemble_pred']],
        }

        return {
            'prediction': round(float(ensemble_prediction), 2),
            'current_price': round(current_price, 2),
            'price_change_percent': round(float(price_change), 2),
            'confidence': round(float(final_confidence), 2),
            'direction': direction,
            'signal': signal,
            'rf_prediction': round(rf_prediction, 2),
            'gb_prediction': round(gb_prediction, 2),
            'xgb_prediction': round(xgb_prediction, 2),
            'model_metrics': {
                'ensemble_mape': round(float(metrics['ensemble_mape']), 2),
                'rf_r2': round(float(metrics['rf_r2']), 4),
                'gb_r2': round(float(metrics['gb_r2']), 4),
                'xgb_r2': round(float(metrics['xgb_r2']), 4),
                'model_weights': {
                    'rf': round(float(w[0]), 3),
                    'gb': round(float(w[1]), 3),
                    'xgb': round(float(w[2]), 3),
                },
            },
            'technical_indicators': {
                'rsi': round(float(df_tech['RSI'].iloc[-1]), 2),
                'macd': round(float(df_tech['MACD'].iloc[-1]), 4),
                'macd_signal': round(float(df_tech['Signal'].iloc[-1]), 4),
                'stoch_k': round(float(df_tech['Stoch_K'].iloc[-1]), 2),
                'stoch_d': round(float(df_tech['Stoch_D'].iloc[-1]), 2),
                'williams_r': round(float(df_tech['Williams_R'].iloc[-1]), 2),
                'atr_ratio': round(float(df_tech['ATR_Ratio'].iloc[-1]), 4),
                'volatility': round(float(df_tech['Volatility'].iloc[-1]), 4),
                'volume_ratio': round(float(df_tech['Volume_Ratio'].iloc[-1]), 2),
                'bb_pct': round(float(df_tech['BB_pct'].iloc[-1]), 4),
                'obv_signal': round(float(df_tech['OBV_Signal'].iloc[-1]), 4),
            },
            'feature_importance': feature_importance,
            'model_comparison': model_comparison,
            'indicator_timeseries': indicator_timeseries,
            'backtest': backtest,
        }


def get_prediction(symbol):
    try:
        predictor = EnhancedStockPredictor(symbol)
        df = predictor.fetch_data(period='2y')

        if df is None or len(df) < 100:
            return None

        return predictor.predict_next_price(df)
    except Exception as e:
        print(f'Error getting prediction for {symbol}: {e}')
        return None


def get_detailed_prediction(symbol):
    try:
        predictor = EnhancedStockPredictor(symbol)
        df = predictor.fetch_data(period='2y')

        if df is None or len(df) < 100:
            return None

        return predictor.predict_next_price_detailed(df)
    except Exception as e:
        print(f'Error getting detailed prediction for {symbol}: {e}')
        return None
