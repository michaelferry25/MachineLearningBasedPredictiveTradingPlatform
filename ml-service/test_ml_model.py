"""
Test suite for the upgraded EnhancedStockPredictor (return-based ensemble + sentiment).

Run with:
    pytest ml-service/test_ml_model.py -v
"""

import os
import sys
from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(__file__))

from ml_model import EnhancedStockPredictor, get_detailed_prediction, get_prediction


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_synthetic_data(n=900, start_price=150.0, seed=42, drift=0.0005, vol=0.012):
    np.random.seed(seed)
    dates = pd.date_range("2020-01-01", periods=n, freq="B")
    returns = np.random.normal(drift, vol, n)
    close = start_price * np.cumprod(1 + returns)

    noise = np.abs(np.random.normal(0, 0.004, n))
    high = close * (1 + noise)
    low = close * (1 - noise)
    open_ = close * (1 + np.random.normal(0, 0.003, n))
    volume = np.random.randint(1_000_000, 50_000_000, n).astype(float)

    return pd.DataFrame(
        {
            "Open": open_,
            "High": high,
            "Low": low,
            "Close": close,
            "Volume": volume,
        },
        index=dates,
    )


def make_sentiment(score=0.22, confidence=78.0, agreement="strong"):
    return {
        "combined": {
            "score": score,
            "confidence": confidence,
            "agreement": agreement,
            "total_sources": 40,
        },
        "news": {"score": score + 0.03, "article_count": 18},
        "reddit": {"score": score - 0.02, "post_count": 22},
    }


def lighten_models(predictor: EnhancedStockPredictor):
    """Reduce estimator counts for faster tests."""
    predictor.rf_model.set_params(n_estimators=80, max_depth=8)
    predictor.gb_model.set_params(n_estimators=80, max_depth=3, learning_rate=0.03)
    predictor.xgb_model.set_params(n_estimators=80, max_depth=4, learning_rate=0.03)
    predictor._fetch_historical_accuracy = lambda: None


# ---------------------------------------------------------------------------
# Feature Engineering
# ---------------------------------------------------------------------------

class TestFeatureEngineering:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor("TEST", sentiment_snapshot=make_sentiment())
        lighten_models(self.predictor)
        self.df = make_synthetic_data()

    def test_expected_columns_exist(self):
        tech = self.predictor.calculate_technical_indicators(self.df)
        for col in [
            "SMA_10",
            "MACD",
            "RSI",
            "BB_pct",
            "ADX",
            "Return_10",
            "Momentum_10",
            "sentiment_score",
            "sentiment_confidence",
            "sentiment_divergence",
        ]:
            assert col in tech.columns, f"Missing feature column: {col}"

    def test_no_nan_after_dropna(self):
        tech = self.predictor.calculate_technical_indicators(self.df)
        assert not tech.isnull().any().any()

    def test_sentiment_columns_are_constant_in_snapshot_mode(self):
        tech = self.predictor.calculate_technical_indicators(self.df)
        for col in ["sentiment_score", "sentiment_confidence", "sentiment_total_sources"]:
            assert tech[col].nunique() == 1


# ---------------------------------------------------------------------------
# Feature Preparation
# ---------------------------------------------------------------------------

class TestPrepareFeatures:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor("TEST", sentiment_snapshot=make_sentiment())
        lighten_models(self.predictor)
        df = make_synthetic_data()
        self.tech = self.predictor.calculate_technical_indicators(df)

    def test_prepare_features_shapes_are_consistent(self):
        X, y, close, latest, latest_close, cols, row_idx = self.predictor.prepare_features(self.tech)
        assert X.shape[0] == y.shape[0] == close.shape[0] == row_idx.shape[0]
        assert X.shape[1] == len(cols)
        assert latest.shape == (1, X.shape[1])
        assert latest_close > 0

    def test_returns_target_has_reasonable_bounds(self):
        X, y, close, latest, latest_close, cols, row_idx = self.predictor.prepare_features(self.tech)
        assert np.isfinite(y).all()
        assert (np.abs(y) <= 0.25).all()

    def test_feature_count_matches_model_definition(self):
        X, y, close, latest, latest_close, cols, row_idx = self.predictor.prepare_features(self.tech)
        assert len(cols) == len(self.predictor.feature_columns)
        assert X.shape[1] == len(self.predictor.feature_columns)


# ---------------------------------------------------------------------------
# Training / Validation
# ---------------------------------------------------------------------------

class TestTrainModels:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor("TEST", sentiment_snapshot=make_sentiment())
        lighten_models(self.predictor)
        df = make_synthetic_data()
        tech = self.predictor.calculate_technical_indicators(df)
        self.X, self.y, self.close, *_ = self.predictor.prepare_features(tech)

    def test_training_returns_required_metrics(self):
        metrics = self.predictor.train_models(self.X, self.y, self.close)
        required = [
            "rf_r2",
            "gb_r2",
            "xgb_r2",
            "rf_mape",
            "gb_mape",
            "xgb_mape",
            "ensemble_mape",
            "baseline_mape",
            "mape_outperformance_vs_baseline",
            "direction_accuracy",
            "baseline_direction_accuracy",
            "model_weights",
            "test_size",
            "y_test",
            "ensemble_pred",
        ]
        for key in required:
            assert key in metrics, f"Missing metric key: {key}"

    def test_model_weights_are_valid(self):
        metrics = self.predictor.train_models(self.X, self.y, self.close)
        weights = metrics["model_weights"]
        assert len(weights) == 3
        assert abs(sum(weights) - 1.0) < 1e-6
        assert all(w > 0 for w in weights)

    def test_validation_profile_is_populated(self):
        self.predictor.train_models(self.X, self.y, self.close)
        vp = self.predictor.validation_profile
        assert vp["val_mae_return"] > 0
        assert vp["val_rmse_return"] > 0
        assert vp["val_disagreement_ref"] >= 0


# ---------------------------------------------------------------------------
# End-to-End Prediction
# ---------------------------------------------------------------------------

class TestPredictNextPrice:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor("TEST", sentiment_snapshot=make_sentiment())
        lighten_models(self.predictor)
        self.df = make_synthetic_data()

    def test_prediction_contains_core_fields(self):
        result = self.predictor.predict_next_price(self.df)
        for key in [
            "model_version",
            "prediction",
            "current_price",
            "price_change_percent",
            "confidence",
            "direction",
            "signal",
            "rf_prediction",
            "gb_prediction",
            "xgb_prediction",
            "model_metrics",
            "technical_indicators",
            "prediction_interval",
            "sentiment_context",
        ]:
            assert key in result, f"Missing key: {key}"

    def test_prediction_values_are_sane(self):
        result = self.predictor.predict_next_price(self.df)
        assert result["prediction"] > 0
        assert result["current_price"] > 0
        assert 35 <= result["confidence"] <= 94
        assert result["direction"] in ("UP", "DOWN", "NEUTRAL")
        assert result["signal"] in ("HOLD", "BUY", "STRONG BUY", "SELL", "STRONG SELL")

    def test_prediction_interval_bounds_are_ordered(self):
        result = self.predictor.predict_next_price(self.df)
        lo = result["prediction_interval"]["low"]
        hi = result["prediction_interval"]["high"]
        assert lo < hi


class TestDetailedPrediction:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor("TEST", sentiment_snapshot=make_sentiment())
        lighten_models(self.predictor)
        self.df = make_synthetic_data()

    def test_detailed_payload_contains_backtest_and_importance(self):
        result = self.predictor.predict_next_price_detailed(self.df)
        assert "feature_importance" in result
        assert "model_comparison" in result
        assert "indicator_timeseries" in result
        assert "backtest" in result
        assert len(result["feature_importance"]) == len(self.predictor.feature_columns)

    def test_backtest_arrays_have_equal_length(self):
        result = self.predictor.predict_next_price_detailed(self.df)
        backtest = result["backtest"]
        assert len(backtest["dates"]) == len(backtest["actual"]) == len(backtest["predicted"])


# ---------------------------------------------------------------------------
# Helper API wrappers
# ---------------------------------------------------------------------------

class TestPredictionHelpers:
    def test_get_prediction_returns_none_when_data_missing(self):
        with patch.object(EnhancedStockPredictor, "fetch_data", return_value=None):
            assert get_prediction("TEST") is None

    def test_get_prediction_returns_none_when_insufficient_rows(self):
        with patch.object(EnhancedStockPredictor, "fetch_data", return_value=make_synthetic_data(n=120)):
            assert get_prediction("TEST") is None

    def test_get_prediction_returns_payload_when_model_runs(self):
        payload = {"prediction": 123.45, "current_price": 120.0}
        with patch.object(EnhancedStockPredictor, "fetch_data", return_value=make_synthetic_data(n=900)):
            with patch.object(EnhancedStockPredictor, "predict_next_price", return_value=payload):
                result = get_prediction("TEST", sentiment_snapshot=make_sentiment())
        assert result == payload

    def test_get_detailed_prediction_returns_payload_when_model_runs(self):
        payload = {"prediction": 123.45, "backtest": {"dates": [], "actual": [], "predicted": []}}
        with patch.object(EnhancedStockPredictor, "fetch_data", return_value=make_synthetic_data(n=900)):
            with patch.object(EnhancedStockPredictor, "predict_next_price_detailed", return_value=payload):
                result = get_detailed_prediction("TEST", sentiment_snapshot=make_sentiment())
        assert result == payload
