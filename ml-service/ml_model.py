import logging
import os
import warnings

import numpy as np
import pandas as pd
import requests as http_requests
import yfinance as yf
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")


class EnhancedStockPredictor:
    """
    Return-based ensemble predictor with sentiment-aware fusion.

    Key upgrades vs a raw next-price regressor:
    - Trains on next-period returns (better stationarity than raw prices)
    - Uses train/validation/test split (70/15/15) for weight selection
    - Benchmarks against a naive no-move baseline
    - Calibrates confidence from validation errors + model disagreement
    - Integrates AI sentiment in-model and via controlled return fusion
    """

    MIN_SAMPLES = 280

    def __init__(self, symbol, sentiment_snapshot=None):
        self.symbol = symbol.upper()
        self.sentiment_snapshot = sentiment_snapshot or {}

        self.scaler = StandardScaler()
        self.rf_model = RandomForestRegressor(
            n_estimators=300,
            random_state=42,
            max_depth=8,
            min_samples_split=5,
            min_samples_leaf=4,
            n_jobs=-1,
        )
        self.gb_model = GradientBoostingRegressor(
            n_estimators=250,
            random_state=42,
            max_depth=4,
            learning_rate=0.02,
            subsample=0.8,
            min_samples_leaf=5,
        )
        self.xgb_model = XGBRegressor(
            n_estimators=300,
            random_state=42,
            max_depth=5,
            learning_rate=0.02,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_alpha=0.3,
            reg_lambda=2.0,
            objective="reg:squarederror",
            verbosity=0,
        )

        self.feature_columns = [
            "SMA_20",
            "SMA_50",
            "SMA_20_vs_50",
            "Close_vs_SMA_200",
            "MACD",
            "MACD_Hist",
            "Dist_SMA_200",
            "RSI",
            "BB_width",
            "BB_pct",
            "Volume_Ratio",
            "OBV_Signal",
            "ATR_Ratio",
            "Stoch_K",
            "ADX",
            "Volatility",
            "Return_1",
            "Return_5",
            "Return_10",
            "Momentum_10",
            "ROC_12",
            "Pct_from_52w_high",
            "Pct_from_52w_low",
            "sentiment_score",
            "sentiment_confidence",
            "VIX_level",
            "VIX_change_5d",
            "SPY_vs_SMA50",
            "SPY_Return_5",
        ]

        self.model_weights = np.array([1.0 / 3, 1.0 / 3, 1.0 / 3], dtype=float)
        self.validation_profile = {}

    def fetch_data(self, period="5y"):
        ticker = yf.Ticker(self.symbol)
        return ticker.history(period=period)

    @staticmethod
    def _to_float(value, fallback=0.0):
        if value is None:
            return float(fallback)
        if isinstance(value, (int, float, np.integer, np.floating)):
            return float(value)
        try:
            return float(str(value))
        except Exception:
            return float(fallback)

    def _extract_sentiment_features(self, sentiment_snapshot=None):
        """Extract sentiment features: score, confidence (FinBERT-powered), and total_sources.

        `total_sources` is surfaced so downstream consumers can distinguish a
        genuine neutral signal (sources > 0, score ~= 0) from a failed sentiment
        fetch (sources == 0, score defaulted to 0). Previously this field was
        dropped here which caused the detailed-prediction endpoint to always
        report `total_sources: 0` regardless of analyzer state.
        """
        snapshot = sentiment_snapshot or self.sentiment_snapshot or {}
        if not isinstance(snapshot, dict):
            snapshot = {}
        combined = snapshot.get("combined", snapshot)
        if not isinstance(combined, dict):
            combined = {}

        score = np.clip(self._to_float(combined.get("score", 0.0)), -1.0, 1.0)
        confidence = np.clip(self._to_float(combined.get("confidence", 50.0)), 0.0, 100.0) / 100.0
        total_sources = max(0, int(self._to_float(combined.get("total_sources", 0))))

        return {
            "sentiment_score": float(score),
            "sentiment_confidence": float(confidence),
            "sentiment_total_sources": float(total_sources),
        }

    def _fetch_macro_data(self, df):
        """Fetch VIX and SPY data for macro context features."""
        try:
            start_date = df.index.min()
            end_date = df.index.max() + pd.Timedelta(days=5)

            vix_data = yf.Ticker("^VIX").history(start=start_date, end=end_date)
            spy_data = yf.Ticker("^GSPC").history(start=start_date, end=end_date)

            if vix_data.empty or spy_data.empty:
                raise ValueError("Empty macro data")

            # Normalize index to remove timezone info for alignment
            if hasattr(df.index, 'tz') and df.index.tz is not None:
                df.index = df.index.tz_localize(None)
            if hasattr(vix_data.index, 'tz') and vix_data.index.tz is not None:
                vix_data.index = vix_data.index.tz_localize(None)
            if hasattr(spy_data.index, 'tz') and spy_data.index.tz is not None:
                spy_data.index = spy_data.index.tz_localize(None)

            # VIX features
            vix_close = vix_data["Close"].reindex(df.index, method="ffill")
            df["VIX_level"] = vix_close / 100.0  # Normalize: VIX 20 -> 0.20
            df["VIX_change_5d"] = vix_close.pct_change(5)

            # SPY features
            spy_close = spy_data["Close"].reindex(df.index, method="ffill")
            spy_sma50 = spy_close.rolling(window=50).mean()
            spy_sma50_safe = spy_sma50.replace(0, np.nan)
            df["SPY_vs_SMA50"] = (spy_close - spy_sma50) / spy_sma50_safe
            df["SPY_Return_5"] = spy_close.pct_change(5)

        except Exception as e:
            logger.warning(f"Macro data fetch error (non-fatal): {e}")
            df["VIX_level"] = 0.20
            df["VIX_change_5d"] = 0.0
            df["SPY_vs_SMA50"] = 0.0
            df["SPY_Return_5"] = 0.0

        return df

    def calculate_technical_indicators(self, df, sentiment_snapshot=None):
        df = df.copy()

        # Core trend structure
        df["SMA_10"] = df["Close"].rolling(window=10).mean()
        df["SMA_20"] = df["Close"].rolling(window=20).mean()
        df["SMA_50"] = df["Close"].rolling(window=50).mean()
        df["SMA_200"] = df["Close"].rolling(window=200).mean()

        df["EMA_12"] = df["Close"].ewm(span=12, adjust=False).mean()
        df["EMA_26"] = df["Close"].ewm(span=26, adjust=False).mean()
        df["EMA_50"] = df["Close"].ewm(span=50, adjust=False).mean()

        sma_20_safe = df["SMA_20"].replace(0, np.nan)
        sma_50_safe = df["SMA_50"].replace(0, np.nan)
        sma_200_safe = df["SMA_200"].replace(0, np.nan)

        df["SMA_10_vs_20"] = (df["SMA_10"] - df["SMA_20"]) / sma_20_safe
        df["SMA_20_vs_50"] = (df["SMA_20"] - df["SMA_50"]) / sma_50_safe
        df["SMA_50_vs_200"] = (df["SMA_50"] - df["SMA_200"]) / sma_200_safe
        df["Close_vs_SMA_20"] = (df["Close"] - df["SMA_20"]) / sma_20_safe
        df["Close_vs_SMA_200"] = (df["Close"] - df["SMA_200"]) / sma_200_safe

        # Momentum
        df["MACD"] = df["EMA_12"] - df["EMA_26"]
        df["Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()
        df["MACD_Hist"] = df["MACD"] - df["Signal"]
        df["Dist_SMA_200"] = (df["Close"] - df["SMA_200"]) / sma_200_safe

        delta = df["Close"].diff()
        gain = delta.where(delta > 0, 0).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss.replace(0, np.nan)
        df["RSI"] = 100 - (100 / (1 + rs))

        df["BB_middle"] = df["Close"].rolling(window=20).mean()
        bb_std = df["Close"].rolling(window=20).std()
        df["BB_upper"] = df["BB_middle"] + (bb_std * 2)
        df["BB_lower"] = df["BB_middle"] - (bb_std * 2)
        bb_middle_safe = df["BB_middle"].replace(0, np.nan)
        df["BB_width"] = (df["BB_upper"] - df["BB_lower"]) / bb_middle_safe
        bb_range = (df["BB_upper"] - df["BB_lower"]).replace(0, np.nan)
        df["BB_pct"] = (df["Close"] - df["BB_lower"]) / bb_range

        # Volume and volatility
        df["Volume_SMA"] = df["Volume"].rolling(window=20).mean()
        df["Volume_Ratio"] = df["Volume"] / df["Volume_SMA"].replace(0, np.nan)

        df["OBV"] = (np.sign(df["Close"].diff()) * df["Volume"]).fillna(0).cumsum()
        df["OBV_EMA"] = df["OBV"].ewm(span=20, adjust=False).mean()
        obv_ema_abs = df["OBV_EMA"].abs().replace(0, np.nan)
        df["OBV_Signal"] = (df["OBV"] - df["OBV_EMA"]) / obv_ema_abs

        high_low = df["High"] - df["Low"]
        high_close = (df["High"] - df["Close"].shift()).abs()
        low_close = (df["Low"] - df["Close"].shift()).abs()
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df["ATR"] = true_range.rolling(window=14).mean()
        df["ATR_Ratio"] = df["ATR"] / df["Close"].replace(0, np.nan)

        low_14 = df["Low"].rolling(window=14).min()
        high_14 = df["High"].rolling(window=14).max()
        hl_range = (high_14 - low_14).replace(0, np.nan)
        df["Stoch_K"] = 100 * (df["Close"] - low_14) / hl_range
        df["Stoch_D"] = df["Stoch_K"].rolling(window=3).mean()
        df["Williams_R"] = -100 * (high_14 - df["Close"]) / hl_range

        plus_dm = df["High"].diff()
        minus_dm = -df["Low"].diff()
        plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
        minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0)
        atr_safe = df["ATR"].replace(0, np.nan)
        plus_di = 100 * (plus_dm.rolling(14).mean() / atr_safe)
        minus_di = 100 * (minus_dm.rolling(14).mean() / atr_safe)
        di_sum = (plus_di + minus_di).replace(0, np.nan)
        dx = 100 * ((plus_di - minus_di).abs() / di_sum)
        df["ADX"] = dx.rolling(14).mean()

        df["Price_Change"] = df["Close"].pct_change()
        df["Volatility"] = df["Price_Change"].rolling(window=20).std()
        df["High_Low_Ratio"] = (df["High"] - df["Low"]) / df["Close"].replace(0, np.nan)
        df["Close_Open_Ratio"] = (df["Close"] - df["Open"]) / df["Open"].replace(0, np.nan)

        for lag in [1, 5, 10]:
            df[f"Return_{lag}"] = df["Close"].pct_change(lag)

        df["Momentum_10"] = (df["Close"] - df["Close"].shift(10)) / df["Close"].shift(10).replace(0, np.nan)
        df["ROC_12"] = (df["Close"] - df["Close"].shift(12)) / df["Close"].shift(12).replace(0, np.nan)

        df["High_52w"] = df["High"].rolling(window=252).max()
        df["Low_52w"] = df["Low"].rolling(window=252).min()
        df["Pct_from_52w_high"] = (df["Close"] - df["High_52w"]) / df["High_52w"].replace(0, np.nan)
        df["Pct_from_52w_low"] = (df["Close"] - df["Low_52w"]) / df["Low_52w"].replace(0, np.nan)

        # Sentiment features (FinBERT-powered)
        sentiment_features = self._extract_sentiment_features(sentiment_snapshot)
        for key, value in sentiment_features.items():
            df[key] = value

        # Macro context features (VIX + SPY)
        df = self._fetch_macro_data(df)

        return df.dropna()

    def prepare_features(self, df):
        X_all = df[self.feature_columns].values
        # Predict 5-day forward return to capture trend and filter daily noise
        y_return = df["Close"].pct_change(5).shift(-5).values
        close_values = df["Close"].values

        valid_idx = np.isfinite(y_return)
        X = X_all[valid_idx]
        y = np.clip(y_return[valid_idx], -0.25, 0.25)
        current_close = close_values[valid_idx]
        row_indices = np.where(valid_idx)[0]

        latest_features = X_all[-1].reshape(1, -1)
        latest_close = float(close_values[-1])

        return (
            X,
            y,
            current_close,
            latest_features,
            latest_close,
            list(self.feature_columns),
            row_indices,
        )

    @staticmethod
    def _mae(y_true, y_pred):
        return float(np.mean(np.abs(y_true - y_pred)))

    @staticmethod
    def _rmse(y_true, y_pred):
        return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

    @staticmethod
    def _mape(y_true, y_pred):
        safe = np.clip(np.abs(y_true), 1e-9, None)
        return float(np.mean(np.abs((y_true - y_pred) / safe)) * 100)

    @staticmethod
    def _r2(y_true, y_pred):
        ss_res = np.sum((y_true - y_pred) ** 2)
        ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
        return float(1 - ss_res / ss_tot) if ss_tot != 0 else 0.0

    @staticmethod
    def _direction_accuracy(y_true_return, y_pred_return):
        true_dir = np.sign(y_true_return)
        pred_dir = np.sign(y_pred_return)
        return float(np.mean(true_dir == pred_dir) * 100)

    def _split_indices(self, n_samples):
        train_end = int(n_samples * 0.70)
        val_end = int(n_samples * 0.85)

        train_end = max(train_end, int(n_samples * 0.60))
        val_end = max(val_end, train_end + 20)
        val_end = min(val_end, n_samples - 20)

        return train_end, val_end

    def train_models(self, X, y, current_close=None, optimize=False):
        if len(X) < self.MIN_SAMPLES:
            raise ValueError(
                f"Insufficient training samples: {len(X)}. Need at least {self.MIN_SAMPLES} rows."
            )

        if current_close is None:
            current_close = np.ones(len(y), dtype=float)

        train_end, val_end = self._split_indices(len(X))

        X_train, X_val, X_test = X[:train_end], X[train_end:val_end], X[val_end:]
        y_train, y_val, y_test = y[:train_end], y[train_end:val_end], y[val_end:]
        close_test = current_close[val_end:]

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)

        if optimize:
            logger.info(f"[{self.symbol}] Running GridSearchCV with TimeSeriesSplit to auto-tune models...")
            # TimeSeriesSplit prevents data leakage by ensuring we only train on past data to predict future data
            tscv = TimeSeriesSplit(n_splits=3)
            
            # Tune Random Forest dynamically
            rf_grid = {'n_estimators': [100, 300], 'max_depth': [5, 8]}
            rf_search = GridSearchCV(self.rf_model, rf_grid, cv=tscv, scoring='neg_mean_absolute_error', n_jobs=-1)
            rf_search.fit(X_train_scaled, y_train)
            self.rf_model = rf_search.best_estimator_
            
            # Tune XGBoost dynamically
            xgb_grid = {'n_estimators': [100, 300], 'learning_rate': [0.01, 0.05], 'max_depth': [3, 5]}
            xgb_search = GridSearchCV(self.xgb_model, xgb_grid, cv=tscv, scoring='neg_mean_absolute_error')
            xgb_search.fit(X_train_scaled, y_train)
            self.xgb_model = xgb_search.best_estimator_
            
            # Train GB normally to save compute time, or you can add a grid for it too
            self.gb_model.fit(X_train_scaled, y_train)
            
            logger.info(f"[{self.symbol}] Optimization complete. RF params: {rf_search.best_params_} | XGB params: {xgb_search.best_params_}")
        else:
            self.rf_model.fit(X_train_scaled, y_train)
            self.gb_model.fit(X_train_scaled, y_train)
            self.xgb_model.fit(X_train_scaled, y_train)

        rf_val = self.rf_model.predict(X_val_scaled)
        gb_val = self.gb_model.predict(X_val_scaled)
        xgb_val = self.xgb_model.predict(X_val_scaled)

        val_mae = np.array(
            [
                self._mae(y_val, rf_val),
                self._mae(y_val, gb_val),
                self._mae(y_val, xgb_val),
            ],
            dtype=float,
        )
        inv = 1.0 / np.clip(val_mae, 1e-9, None)
        self.model_weights = inv / inv.sum()

        rf_test = self.rf_model.predict(X_test_scaled)
        gb_test = self.gb_model.predict(X_test_scaled)
        xgb_test = self.xgb_model.predict(X_test_scaled)

        ensemble_val = (
            self.model_weights[0] * rf_val
            + self.model_weights[1] * gb_val
            + self.model_weights[2] * xgb_val
        )
        ensemble_test = (
            self.model_weights[0] * rf_test
            + self.model_weights[1] * gb_test
            + self.model_weights[2] * xgb_test
        )

        y_test_price = close_test * (1 + y_test)
        rf_test_price = close_test * (1 + rf_test)
        gb_test_price = close_test * (1 + gb_test)
        xgb_test_price = close_test * (1 + xgb_test)
        ensemble_test_price = close_test * (1 + ensemble_test)

        baseline_test_return = np.zeros_like(y_test)
        baseline_test_price = close_test

        rf_mape = self._mape(y_test_price, rf_test_price)
        gb_mape = self._mape(y_test_price, gb_test_price)
        xgb_mape = self._mape(y_test_price, xgb_test_price)
        ensemble_mape = self._mape(y_test_price, ensemble_test_price)
        baseline_mape = self._mape(y_test_price, baseline_test_price)

        val_disagreement = np.std(np.vstack([rf_val, gb_val, xgb_val]), axis=0)

        self.validation_profile = {
            "val_mae_return": self._mae(y_val, ensemble_val),
            "val_rmse_return": self._rmse(y_val, ensemble_val),
            "val_direction_accuracy": self._direction_accuracy(y_val, ensemble_val),
            "val_error_p50": float(np.percentile(np.abs(y_val - ensemble_val), 50)),
            "val_error_p75": float(np.percentile(np.abs(y_val - ensemble_val), 75)),
            "val_error_p90": float(np.percentile(np.abs(y_val - ensemble_val), 90)),
            "val_disagreement_ref": float(np.mean(val_disagreement)),
            "train_end": train_end,
            "val_end": val_end,
        }

        outperformance = (
            ((baseline_mape - ensemble_mape) / baseline_mape) * 100 if baseline_mape > 0 else 0.0
        )

        return {
            "rf_r2": self._r2(y_test, rf_test),
            "gb_r2": self._r2(y_test, gb_test),
            "xgb_r2": self._r2(y_test, xgb_test),
            "rf_mape": rf_mape,
            "gb_mape": gb_mape,
            "xgb_mape": xgb_mape,
            "ensemble_mape": ensemble_mape,
            "baseline_mape": baseline_mape,
            "mape_outperformance_vs_baseline": outperformance,
            "direction_accuracy": self._direction_accuracy(y_test, ensemble_test),
            "baseline_direction_accuracy": self._direction_accuracy(y_test, baseline_test_return),
            "validation_mae_return": self.validation_profile["val_mae_return"],
            "validation_rmse_return": self.validation_profile["val_rmse_return"],
            "validation_disagreement_ref": self.validation_profile["val_disagreement_ref"],
            "model_weights": self.model_weights.tolist(),
            "test_size": len(y_test),
            "split": val_end,
            "y_test": y_test_price.tolist(),
            "ensemble_pred": ensemble_test_price.tolist(),
            "y_test_return": y_test.tolist(),
            "ensemble_pred_return": ensemble_test.tolist(),
        }

    def _fetch_historical_accuracy(self):
        """Fetch past prediction accuracy from backend for self-calibration."""
        try:
            url = f"{BACKEND_URL}/api/ml/predictions/{self.symbol}?limit=80"
            resp = http_requests.get(url, timeout=5)
            if not resp.ok:
                return None

            logs = resp.json()
            evaluated = [log for log in logs if log.get("actualPrice") is not None]
            if len(evaluated) < 8:
                return None

            hit_count = sum(1 for log in evaluated if log.get("hit") is True)
            hit_rate = hit_count / len(evaluated)
            errors = [
                self._to_float(log.get("percentError"), np.nan)
                for log in evaluated
                if log.get("percentError") is not None
            ]
            errors = [x for x in errors if np.isfinite(x)]
            avg_error = float(np.mean(errors)) if errors else 0.0

            return {
                "hit_rate": float(hit_rate),
                "avg_error": avg_error,
                "count": len(evaluated),
            }
        except Exception:
            return None

    def _blend_with_sentiment(self, model_return, sentiment_features):
        """Blend model prediction with FinBERT-powered sentiment.
        Higher trust than TextBlob: max 2% return contribution, 40% blend ceiling."""
        score = sentiment_features["sentiment_score"]
        conf = sentiment_features["sentiment_confidence"]

        if abs(score) < 0.03 or conf < 0.25:
            return model_return, {
                "integrated_in_model": True,
                "blend_weight": 0.0,
                "sentiment_return_component": 0.0,
                "agreement": "mixed",
            }

        # FinBERT is more reliable: higher max return and blend ceiling
        sentiment_return = float(np.clip(score * 0.018, -0.020, 0.020))
        blend_weight = float(min(0.40, 0.10 + (conf * 0.22)))

        agreement = "mixed"
        if model_return * sentiment_return > 0:
            agreement = "aligned"
            # Alignment bonus: boost blend when model and sentiment agree
            blend_weight = min(0.40, blend_weight * 1.15)
        elif model_return * sentiment_return < 0:
            agreement = "opposed"
            blend_weight *= 0.55

        fused_return = ((1 - blend_weight) * model_return) + (blend_weight * sentiment_return)

        return fused_return, {
            "integrated_in_model": True,
            "blend_weight": round(float(blend_weight), 4),
            "sentiment_return_component": round(float(sentiment_return), 4),
            "agreement": agreement,
        }

    def _calibrate_confidence(self, final_return, model_returns, metrics, sentiment_blend):
        val_mae = max(metrics.get("validation_mae_return", 0.003), 1e-6)
        signal_to_noise = min(abs(final_return) / (val_mae * 1.5), 2.0)

        disagreement = float(np.std(model_returns))
        disagreement_ref = max(metrics.get("validation_disagreement_ref", disagreement + 1e-6), 1e-6)
        agreement_score = max(0.0, 1.0 - (disagreement / disagreement_ref))

        confidence = 48.0
        confidence += 22.0 * (signal_to_noise / 2.0)
        confidence += 14.0 * agreement_score

        outperformance = metrics.get("mape_outperformance_vs_baseline", 0.0)
        if outperformance >= 0:
            confidence += min(10.0, outperformance / 2.0)
        else:
            confidence += max(-24.0, outperformance / 1.4)

        # If we are losing to baseline, force conservative confidence ceilings.
        if outperformance < -10:
            confidence = min(confidence, 64.0)
        if outperformance < -30:
            confidence = min(confidence, 56.0)

        if sentiment_blend.get("agreement") == "aligned":
            confidence += min(6.0, sentiment_blend.get("blend_weight", 0) * 22)
        elif sentiment_blend.get("agreement") == "opposed":
            confidence -= min(8.0, sentiment_blend.get("blend_weight", 0) * 24)

        return float(np.clip(confidence, 35.0, 94.0))

    def _stability_guardrail(self, df_tech, proposed_return, metrics):
        recent_returns = df_tech["Close"].pct_change().dropna().tail(180)
        if recent_returns.empty:
            return float(proposed_return), {
                "enabled": False,
                "raw_return_percent": round(float(proposed_return) * 100, 3),
            }

        abs_returns = recent_returns.abs().values
        p95 = float(np.percentile(abs_returns, 95))

        atr_ratio = float(df_tech["ATR_Ratio"].iloc[-1])
        vol = float(df_tech["Volatility"].iloc[-1])
        if not np.isfinite(atr_ratio):
            atr_ratio = 0.01
        if not np.isfinite(vol):
            vol = 0.01

        cap_from_dist = float(np.clip(p95 * 1.35, 0.012, 0.07))
        cap_from_risk = float(np.clip((atr_ratio * 2.0) + (vol * 1.8), 0.012, 0.07))
        cap = min(cap_from_dist, cap_from_risk)

        outperformance = float(metrics.get("mape_outperformance_vs_baseline", 0.0))
        if outperformance < 0:
            cap *= float(np.clip(1.0 + (outperformance / 120.0), 0.45, 1.0))
        cap = float(np.clip(cap, 0.008, 0.07))

        guarded_return = float(np.tanh(proposed_return / max(cap, 1e-9)) * cap)

        return guarded_return, {
            "enabled": True,
            "raw_return_percent": round(float(proposed_return) * 100, 3),
            "guarded_return_percent": round(float(guarded_return) * 100, 3),
            "cap_percent": round(float(cap) * 100, 3),
        }

    @staticmethod
    def _direction_from_return(expected_return):
        if expected_return > 0.0001:
            return "UP"
        if expected_return < -0.0001:
            return "DOWN"
        return "NEUTRAL"

    @staticmethod
    def _compute_signal(direction, price_change_percent, confidence, outperformance_vs_baseline):
        trend_strength = abs(price_change_percent)

        if trend_strength < 0.35 or confidence < 48:
            return "HOLD"

        if outperformance_vs_baseline < -10 and confidence < 65:
            return "HOLD"

        if direction == "UP":
            if trend_strength >= 1.6 and confidence >= 78:
                return "STRONG BUY"
            return "BUY"

        if direction == "DOWN":
            if trend_strength >= 1.6 and confidence >= 78:
                return "STRONG SELL"
            return "SELL"

        return "HOLD"

    @staticmethod
    def _detect_regime(df_tech):
        adx = float(df_tech["ADX"].iloc[-1])
        vol = float(df_tech["Volatility"].iloc[-1])
        close_vs_sma200 = float(df_tech["Close_vs_SMA_200"].iloc[-1])

        if vol > 0.03:
            return "high_volatility"
        if adx > 25 and close_vs_sma200 > 0:
            return "bullish_trend"
        if adx > 25 and close_vs_sma200 < 0:
            return "bearish_trend"
        return "range_bound"

    def continuous_learning_update(self, sentiment_snapshot=None):
        """
        Continuous Learning / MLOps Pipeline:
        Fetches the latest market data, appends it to the rolling historical window, 
        and auto-tunes hyperparameters to adapt to the latest market regime.
        """
        logger.info(f"[{self.symbol}] Starting Continuous Learning Update...")
        df = self.fetch_data(period="5y")
        
        if sentiment_snapshot is not None:
            self.sentiment_snapshot = sentiment_snapshot
            
        df_tech = self.calculate_technical_indicators(df, self.sentiment_snapshot)
        X, y, current_close, _, _, _, _ = self.prepare_features(df_tech)
        
        metrics = self.train_models(X, y, current_close, optimize=True)
        return metrics

    def _run_pipeline(self, df, sentiment_snapshot=None):
        if sentiment_snapshot is not None:
            self.sentiment_snapshot = sentiment_snapshot

        df_tech = self.calculate_technical_indicators(df, self.sentiment_snapshot)
        (
            X,
            y,
            current_close,
            latest_features,
            latest_close,
            feature_columns,
            row_indices,
        ) = self.prepare_features(df_tech)

        metrics = self.train_models(X, y, current_close)

        latest_scaled = self.scaler.transform(latest_features)

        rf_return = float(self.rf_model.predict(latest_scaled)[0])
        gb_return = float(self.gb_model.predict(latest_scaled)[0])
        xgb_return = float(self.xgb_model.predict(latest_scaled)[0])

        model_return = (
            self.model_weights[0] * rf_return
            + self.model_weights[1] * gb_return
            + self.model_weights[2] * xgb_return
        )

        sentiment_features = self._extract_sentiment_features(self.sentiment_snapshot)
        final_return, sentiment_blend = self._blend_with_sentiment(model_return, sentiment_features)
        final_return, stability_guardrail = self._stability_guardrail(df_tech, final_return, metrics)

        confidence = self._calibrate_confidence(
            final_return,
            [rf_return, gb_return, xgb_return],
            metrics,
            sentiment_blend,
        )

        accuracy_info = self._fetch_historical_accuracy()
        if accuracy_info and accuracy_info.get("count", 0) >= 10:
            hit_rate = accuracy_info.get("hit_rate", 0)
            avg_error = accuracy_info.get("avg_error", 0)
            if hit_rate < 0.50:
                confidence *= 0.90
            elif hit_rate > 0.72:
                confidence *= 1.04
            if avg_error > 3.5:
                confidence *= 0.92
            confidence = float(np.clip(confidence, 35.0, 94.0))

        current_price = float(latest_close)
        prediction_price = current_price * (1 + final_return)

        rf_prediction = current_price * (1 + rf_return)
        gb_prediction = current_price * (1 + gb_return)
        xgb_prediction = current_price * (1 + xgb_return)

        direction = self._direction_from_return(final_return)
        price_change_percent = final_return * 100
        signal = self._compute_signal(
            direction,
            price_change_percent,
            confidence,
            metrics.get("mape_outperformance_vs_baseline", 0.0),
        )

        interval_width = max(
            abs(metrics.get("validation_mae_return", 0.003)) * 1.4,
            abs(final_return) * 0.35,
            0.002,
        )
        interval_low = current_price * (1 + final_return - interval_width)
        interval_high = current_price * (1 + final_return + interval_width)

        return {
            "df_tech": df_tech,
            "metrics": metrics,
            "feature_columns": feature_columns,
            "row_indices": row_indices,
            "prediction_price": float(prediction_price),
            "current_price": float(current_price),
            "price_change_percent": float(price_change_percent),
            "expected_return": float(final_return),
            "confidence": float(np.clip(confidence, 35.0, 94.0)),
            "direction": direction,
            "signal": signal,
            "rf_prediction": float(rf_prediction),
            "gb_prediction": float(gb_prediction),
            "xgb_prediction": float(xgb_prediction),
            "rf_return": float(rf_return),
            "gb_return": float(gb_return),
            "xgb_return": float(xgb_return),
            "regime": self._detect_regime(df_tech),
            "prediction_interval": {
                "low": float(interval_low),
                "high": float(interval_high),
                "width_percent": float(interval_width * 100),
            },
            "sentiment_features": sentiment_features,
            "sentiment_blend": sentiment_blend,
            "stability_guardrail": stability_guardrail,
            "historical_accuracy": accuracy_info,
        }

    def predict_next_price(self, df, sentiment_snapshot=None):
        run = self._run_pipeline(df, sentiment_snapshot)
        df_tech = run["df_tech"]
        metrics = run["metrics"]

        return {
            "model_version": "v2_return_regime_sentiment",
            "prediction": round(run["prediction_price"], 2),
            "current_price": round(run["current_price"], 2),
            "price_change_percent": round(run["price_change_percent"], 2),
            "expected_return_percent": round(run["expected_return"] * 100, 3),
            "confidence": round(run["confidence"], 2),
            "direction": run["direction"],
            "signal": run["signal"],
            "regime": run["regime"],
            "rf_prediction": round(run["rf_prediction"], 2),
            "gb_prediction": round(run["gb_prediction"], 2),
            "xgb_prediction": round(run["xgb_prediction"], 2),
            "prediction_interval": {
                "low": round(run["prediction_interval"]["low"], 2),
                "high": round(run["prediction_interval"]["high"], 2),
                "width_percent": round(run["prediction_interval"]["width_percent"], 2),
            },
            "model_metrics": {
                "ensemble_mape": round(float(metrics["ensemble_mape"]), 3),
                "baseline_mape": round(float(metrics["baseline_mape"]), 3),
                "mape_outperformance_vs_baseline": round(
                    float(metrics["mape_outperformance_vs_baseline"]), 2
                ),
                "direction_accuracy": round(float(metrics["direction_accuracy"]), 2),
                "baseline_direction_accuracy": round(
                    float(metrics["baseline_direction_accuracy"]), 2
                ),
                "rf_r2": round(float(metrics["rf_r2"]), 4),
                "gb_r2": round(float(metrics["gb_r2"]), 4),
                "xgb_r2": round(float(metrics["xgb_r2"]), 4),
                "model_weights": {
                    "rf": round(float(self.model_weights[0]), 3),
                    "gb": round(float(self.model_weights[1]), 3),
                    "xgb": round(float(self.model_weights[2]), 3),
                },
                "validation_mae_return": round(
                    float(metrics["validation_mae_return"] * 100), 3
                ),
            },
            "model_details": {
                "metrics": {
                    "rf_r2": round(float(metrics["rf_r2"]), 4),
                    "gb_r2": round(float(metrics["gb_r2"]), 4),
                    "xgb_r2": round(float(metrics["xgb_r2"]), 4),
                    "ensemble_mape": round(float(metrics["ensemble_mape"]), 3),
                    "baseline_mape": round(float(metrics["baseline_mape"]), 3),
                }
            },
            "technical_indicators": {
                "rsi": round(float(df_tech["RSI"].iloc[-1]), 2),
                "macd": round(float(df_tech["MACD"].iloc[-1]), 4),
                "macd_signal": round(float(df_tech["Signal"].iloc[-1]), 4),
                "stoch_k": round(float(df_tech["Stoch_K"].iloc[-1]), 2),
                "stoch_d": round(float(df_tech["Stoch_D"].iloc[-1]), 2),
                "williams_r": round(float(df_tech["Williams_R"].iloc[-1]), 2),
                "atr_ratio": round(float(df_tech["ATR_Ratio"].iloc[-1]), 4),
                "volatility": round(float(df_tech["Volatility"].iloc[-1]), 4),
                "volume_ratio": round(float(df_tech["Volume_Ratio"].iloc[-1]), 2),
                "bb_pct": round(float(df_tech["BB_pct"].iloc[-1]), 4),
                "obv_signal": round(float(df_tech["OBV_Signal"].iloc[-1]), 4),
                "adx": round(float(df_tech["ADX"].iloc[-1]), 2),
            },
            "sentiment_context": {
                "score": round(run["sentiment_features"]["sentiment_score"], 3),
                "confidence": round(run["sentiment_features"]["sentiment_confidence"] * 100, 1),
                "total_sources": int(round(run["sentiment_features"].get("sentiment_total_sources", 0))),
                "blend": run["sentiment_blend"],
            },
            "stability_guardrail": run["stability_guardrail"],
            "historical_accuracy": run["historical_accuracy"],
        }

    def predict_next_price_detailed(self, df, sentiment_snapshot=None):
        run = self._run_pipeline(df, sentiment_snapshot)
        df_tech = run["df_tech"]
        metrics = run["metrics"]
        feature_columns = run["feature_columns"]

        importances = self.rf_model.feature_importances_
        feature_importance = sorted(
            [
                {"feature": col, "importance": round(float(imp), 6)}
                for col, imp in zip(feature_columns, importances)
            ],
            key=lambda x: x["importance"],
            reverse=True,
        )

        w = self.model_weights
        model_comparison = {
            "models": [
                {
                    "name": "Random Forest",
                    "prediction": round(run["rf_prediction"], 2),
                    "predicted_return_pct": round(run["rf_return"] * 100, 3),
                    "weight": round(float(w[0]), 3),
                    "r2": round(float(metrics["rf_r2"]), 4),
                    "mape": round(float(metrics["rf_mape"]), 3),
                },
                {
                    "name": "Gradient Boosting",
                    "prediction": round(run["gb_prediction"], 2),
                    "predicted_return_pct": round(run["gb_return"] * 100, 3),
                    "weight": round(float(w[1]), 3),
                    "r2": round(float(metrics["gb_r2"]), 4),
                    "mape": round(float(metrics["gb_mape"]), 3),
                },
                {
                    "name": "XGBoost",
                    "prediction": round(run["xgb_prediction"], 2),
                    "predicted_return_pct": round(run["xgb_return"] * 100, 3),
                    "weight": round(float(w[2]), 3),
                    "r2": round(float(metrics["xgb_r2"]), 4),
                    "mape": round(float(metrics["xgb_mape"]), 3),
                },
            ],
            "ensemble_prediction": round(run["prediction_price"], 2),
            "ensemble_mape": round(float(metrics["ensemble_mape"]), 3),
            "baseline_mape": round(float(metrics["baseline_mape"]), 3),
            "mape_outperformance_vs_baseline": round(
                float(metrics["mape_outperformance_vs_baseline"]), 2
            ),
            "direction_accuracy": round(float(metrics["direction_accuracy"]), 2),
            "baseline_direction_accuracy": round(float(metrics["baseline_direction_accuracy"]), 2),
            "current_price": round(run["current_price"], 2),
        }

        tail = df_tech.tail(60)
        dates = [d.isoformat() for d in tail.index]
        indicator_timeseries = {
            "dates": dates,
            "close": [round(float(v), 2) for v in tail["Close"]],
            "sma_20": [round(float(v), 2) for v in tail["SMA_20"]],
            "sma_50": [round(float(v), 2) for v in tail["SMA_50"]],
            "sma_200": [round(float(v), 2) for v in tail["SMA_200"]],
            "bb_upper": [round(float(v), 2) for v in tail["BB_upper"]],
            "bb_lower": [round(float(v), 2) for v in tail["BB_lower"]],
            "rsi": [round(float(v), 2) for v in tail["RSI"]],
            "macd": [round(float(v), 4) for v in tail["MACD"]],
            "macd_signal": [round(float(v), 4) for v in tail["Signal"]],
            "macd_hist": [round(float(v), 4) for v in tail["MACD_Hist"]],
            "stoch_k": [round(float(v), 2) for v in tail["Stoch_K"]],
            "stoch_d": [round(float(v), 2) for v in tail["Stoch_D"]],
            "volume": [round(float(v), 0) for v in tail["Volume"]],
            "volume_sma": [round(float(v), 0) for v in tail["Volume_SMA"]],
            "adx": [round(float(v), 2) for v in tail["ADX"]],
        }

        split = metrics["split"]
        row_indices = run["row_indices"]
        test_indices = row_indices[split : split + len(metrics["y_test"])]
        test_dates_idx = df_tech.index[test_indices]

        backtest = {
            "dates": [d.isoformat() for d in test_dates_idx],
            "actual": [round(v, 2) for v in metrics["y_test"]],
            "predicted": [round(v, 2) for v in metrics["ensemble_pred"]],
            "actual_return": [round(v * 100, 3) for v in metrics["y_test_return"]],
            "predicted_return": [round(v * 100, 3) for v in metrics["ensemble_pred_return"]],
        }

        return {
            "model_version": "v2_return_regime_sentiment",
            "prediction": round(run["prediction_price"], 2),
            "current_price": round(run["current_price"], 2),
            "price_change_percent": round(run["price_change_percent"], 2),
            "expected_return_percent": round(run["expected_return"] * 100, 3),
            "confidence": round(run["confidence"], 2),
            "direction": run["direction"],
            "signal": run["signal"],
            "regime": run["regime"],
            "rf_prediction": round(run["rf_prediction"], 2),
            "gb_prediction": round(run["gb_prediction"], 2),
            "xgb_prediction": round(run["xgb_prediction"], 2),
            "prediction_interval": {
                "low": round(run["prediction_interval"]["low"], 2),
                "high": round(run["prediction_interval"]["high"], 2),
                "width_percent": round(run["prediction_interval"]["width_percent"], 2),
            },
            "model_metrics": {
                "ensemble_mape": round(float(metrics["ensemble_mape"]), 3),
                "baseline_mape": round(float(metrics["baseline_mape"]), 3),
                "mape_outperformance_vs_baseline": round(
                    float(metrics["mape_outperformance_vs_baseline"]), 2
                ),
                "direction_accuracy": round(float(metrics["direction_accuracy"]), 2),
                "baseline_direction_accuracy": round(
                    float(metrics["baseline_direction_accuracy"]), 2
                ),
                "rf_r2": round(float(metrics["rf_r2"]), 4),
                "gb_r2": round(float(metrics["gb_r2"]), 4),
                "xgb_r2": round(float(metrics["xgb_r2"]), 4),
                "model_weights": {
                    "rf": round(float(w[0]), 3),
                    "gb": round(float(w[1]), 3),
                    "xgb": round(float(w[2]), 3),
                },
                "validation_mae_return": round(
                    float(metrics["validation_mae_return"] * 100), 3
                ),
            },
            "technical_indicators": {
                "rsi": round(float(df_tech["RSI"].iloc[-1]), 2),
                "macd": round(float(df_tech["MACD"].iloc[-1]), 4),
                "macd_signal": round(float(df_tech["Signal"].iloc[-1]), 4),
                "stoch_k": round(float(df_tech["Stoch_K"].iloc[-1]), 2),
                "stoch_d": round(float(df_tech["Stoch_D"].iloc[-1]), 2),
                "williams_r": round(float(df_tech["Williams_R"].iloc[-1]), 2),
                "atr_ratio": round(float(df_tech["ATR_Ratio"].iloc[-1]), 4),
                "volatility": round(float(df_tech["Volatility"].iloc[-1]), 4),
                "volume_ratio": round(float(df_tech["Volume_Ratio"].iloc[-1]), 2),
                "bb_pct": round(float(df_tech["BB_pct"].iloc[-1]), 4),
                "obv_signal": round(float(df_tech["OBV_Signal"].iloc[-1]), 4),
                "adx": round(float(df_tech["ADX"].iloc[-1]), 2),
            },
            "sentiment_context": {
                "score": round(run["sentiment_features"]["sentiment_score"], 3),
                "confidence": round(run["sentiment_features"]["sentiment_confidence"] * 100, 1),
                "total_sources": int(round(run["sentiment_features"].get("sentiment_total_sources", 0))),
                "blend": run["sentiment_blend"],
            },
            "stability_guardrail": run["stability_guardrail"],
            "feature_importance": feature_importance,
            "model_comparison": model_comparison,
            "indicator_timeseries": indicator_timeseries,
            "backtest": backtest,
            "historical_accuracy": run["historical_accuracy"],
            "track_record_score": {
                "direction_accuracy": round(float(metrics["direction_accuracy"]), 2),
                "baseline_direction_accuracy": round(
                    float(metrics["baseline_direction_accuracy"]), 2
                ),
                "mape_outperformance_vs_baseline": round(
                    float(metrics["mape_outperformance_vs_baseline"]), 2
                ),
            },
        }


def get_prediction(symbol, sentiment_snapshot=None):
    try:
        predictor = EnhancedStockPredictor(symbol, sentiment_snapshot=sentiment_snapshot)
        df = predictor.fetch_data(period="5y")

        if df is None or len(df) < 320:
            return None

        return predictor.predict_next_price(df, sentiment_snapshot=sentiment_snapshot)
    except Exception as e:
        logger.error(f"Error getting prediction for {symbol}: {e}")
        return None


def get_detailed_prediction(symbol, sentiment_snapshot=None):
    try:
        predictor = EnhancedStockPredictor(symbol, sentiment_snapshot=sentiment_snapshot)
        df = predictor.fetch_data(period="5y")

        if df is None or len(df) < 320:
            return None

        return predictor.predict_next_price_detailed(df, sentiment_snapshot=sentiment_snapshot)
    except Exception as e:
        logger.error(f"Error getting detailed prediction for {symbol}: {e}")
        return None
