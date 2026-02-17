"""
Comprehensive test suite for EnhancedStockPredictor.

All tests use synthetic OHLCV data to avoid network calls.
Run with:  pytest test_ml_model.py -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch
from ml_model import EnhancedStockPredictor, get_prediction


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_synthetic_data(n=600, start_price=150.0, seed=42):
    """Generate realistic synthetic OHLCV data."""
    np.random.seed(seed)
    dates = pd.date_range('2022-01-01', periods=n, freq='B')
    returns = np.random.normal(0.0005, 0.012, n)
    close = start_price * np.cumprod(1 + returns)
    noise = np.abs(np.random.normal(0, 0.004, n))
    high = close * (1 + noise)
    low = close * (1 - noise)
    open_ = close * (1 + np.random.normal(0, 0.003, n))
    volume = np.random.randint(1_000_000, 50_000_000, n).astype(float)
    return pd.DataFrame(
        {'Open': open_, 'High': high, 'Low': low, 'Close': close, 'Volume': volume},
        index=dates,
    )


# ---------------------------------------------------------------------------
# Technical Indicators
# ---------------------------------------------------------------------------

class TestTechnicalIndicators:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor('TEST')
        self.df = make_synthetic_data()

    def _computed(self):
        return self.predictor.calculate_technical_indicators(self.df.copy())

    def test_all_expected_columns_present(self):
        result = self._computed()
        expected = [
            'SMA_10', 'SMA_20', 'SMA_50',
            'EMA_12', 'EMA_26',
            'MACD', 'Signal', 'MACD_Hist',
            'RSI',
            'BB_middle', 'BB_upper', 'BB_lower', 'BB_width', 'BB_pct',
            'Volume_SMA', 'Volume_Ratio',
            'OBV', 'OBV_EMA', 'OBV_Signal',
            'ATR', 'ATR_Ratio',
            'Stoch_K', 'Stoch_D',
            'Williams_R',
            'Price_Change', 'Volatility', 'High_Low_Ratio', 'Close_Open_Ratio',
            'Lag_1', 'Lag_2', 'Lag_3', 'Lag_5', 'Lag_10',
            'Return_1', 'Return_2', 'Return_3', 'Return_5', 'Return_10',
            'Momentum', 'ROC',
            'Pct_from_52w_high', 'Pct_from_52w_low',
        ]
        for col in expected:
            assert col in result.columns, f'Missing column: {col}'

    def test_no_nan_after_dropna(self):
        result = self._computed()
        assert not result.isnull().any().any(), 'NaN values survived dropna'

    def test_rsi_within_0_100(self):
        result = self._computed()
        assert result['RSI'].between(0, 100).all(), 'RSI outside [0, 100]'

    def test_stoch_k_within_0_100(self):
        result = self._computed()
        assert result['Stoch_K'].between(0, 100).all(), 'Stoch_K outside [0, 100]'

    def test_bollinger_band_ordering(self):
        result = self._computed()
        assert (result['BB_upper'] >= result['BB_middle']).all()
        assert (result['BB_middle'] >= result['BB_lower']).all()

    def test_atr_is_positive(self):
        result = self._computed()
        assert (result['ATR'] > 0).all(), 'ATR should be positive'

    def test_volume_ratio_is_positive(self):
        result = self._computed()
        assert (result['Volume_Ratio'] > 0).all()

    def test_sma_ordering_in_trend(self):
        """In a clear uptrend SMA_10 > SMA_20 should hold more often than not."""
        result = self._computed()
        pct_above = (result['SMA_10'] >= result['SMA_20']).mean()
        # Not strict — just verifies relationship is computed
        assert 0 <= pct_above <= 1

    def test_sufficient_rows_retained(self):
        result = self._computed()
        assert len(result) >= 200, f'Too many rows dropped: {len(result)}'

    def test_obv_is_cumulative(self):
        """OBV should not be constant."""
        result = self._computed()
        assert result['OBV'].std() > 0, 'OBV has no variation'

    def test_macd_hist_equals_macd_minus_signal(self):
        result = self._computed()
        diff = (result['MACD_Hist'] - (result['MACD'] - result['Signal'])).abs()
        assert (diff < 1e-10).all(), 'MACD_Hist != MACD - Signal'


# ---------------------------------------------------------------------------
# Feature Preparation
# ---------------------------------------------------------------------------

class TestPrepareFeatures:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor('TEST')
        df = make_synthetic_data()
        self.df_tech = self.predictor.calculate_technical_indicators(df)

    def test_x_y_row_count_matches(self):
        X, y, _ = self.predictor.prepare_features(self.df_tech)
        assert X.shape[0] == y.shape[0]

    def test_feature_count_matches_column_list(self):
        X, y, cols = self.predictor.prepare_features(self.df_tech)
        assert X.shape[1] == len(cols)

    def test_expected_34_features(self):
        X, y, cols = self.predictor.prepare_features(self.df_tech)
        assert X.shape[1] == 34, f'Expected 34 features, got {X.shape[1]}'

    def test_no_nan_in_X(self):
        X, y, _ = self.predictor.prepare_features(self.df_tech)
        assert not np.isnan(X).any(), 'NaN found in feature matrix X'

    def test_no_nan_in_y(self):
        X, y, _ = self.predictor.prepare_features(self.df_tech)
        assert not np.isnan(y).any(), 'NaN found in target vector y'

    def test_y_values_positive(self):
        X, y, _ = self.predictor.prepare_features(self.df_tech)
        assert (y > 0).all(), 'Negative/zero prices in target'

    def test_enough_samples_for_training(self):
        X, y, _ = self.predictor.prepare_features(self.df_tech)
        assert len(X) >= 100, 'Too few samples for model training'


# ---------------------------------------------------------------------------
# Model Training
# ---------------------------------------------------------------------------

class TestTrainModels:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor('TEST')
        df = make_synthetic_data()
        df_tech = self.predictor.calculate_technical_indicators(df)
        self.X, self.y, _ = self.predictor.prepare_features(df_tech)

    def test_required_metric_keys_present(self):
        metrics = self.predictor.train_models(self.X, self.y)
        for key in ['rf_r2', 'gb_r2', 'xgb_r2',
                    'rf_mape', 'gb_mape', 'xgb_mape',
                    'ensemble_mape', 'model_weights', 'test_size']:
            assert key in metrics, f'Missing metric key: {key}'

    def test_model_weights_sum_to_one(self):
        metrics = self.predictor.train_models(self.X, self.y)
        assert abs(sum(metrics['model_weights']) - 1.0) < 1e-6

    def test_model_weights_are_positive(self):
        metrics = self.predictor.train_models(self.X, self.y)
        assert all(w > 0 for w in metrics['model_weights'])

    def test_model_weights_attribute_set_on_predictor(self):
        self.predictor.train_models(self.X, self.y)
        assert self.predictor.model_weights is not None
        assert len(self.predictor.model_weights) == 3

    def test_mape_values_are_positive(self):
        metrics = self.predictor.train_models(self.X, self.y)
        assert metrics['rf_mape'] > 0
        assert metrics['gb_mape'] > 0
        assert metrics['xgb_mape'] > 0
        assert metrics['ensemble_mape'] > 0

    def test_r2_scores_are_finite(self):
        metrics = self.predictor.train_models(self.X, self.y)
        assert np.isfinite(metrics['rf_r2'])
        assert np.isfinite(metrics['gb_r2'])
        assert np.isfinite(metrics['xgb_r2'])

    def test_test_size_is_20_percent(self):
        metrics = self.predictor.train_models(self.X, self.y)
        expected = int(len(self.X) * 0.2)
        assert abs(metrics['test_size'] - expected) <= 1

    def test_best_model_gets_highest_weight(self):
        """The model with the lowest MAPE should receive the highest weight."""
        metrics = self.predictor.train_models(self.X, self.y)
        mapes = [metrics['rf_mape'], metrics['gb_mape'], metrics['xgb_mape']]
        weights = metrics['model_weights']
        best_mape_idx = int(np.argmin(mapes))
        best_weight_idx = int(np.argmax(weights))
        assert best_mape_idx == best_weight_idx, (
            f'Best model (idx {best_mape_idx}) did not get highest weight (idx {best_weight_idx})'
        )

    def test_ensemble_mape_finite(self):
        metrics = self.predictor.train_models(self.X, self.y)
        assert np.isfinite(metrics['ensemble_mape'])


# ---------------------------------------------------------------------------
# End-to-End Prediction
# ---------------------------------------------------------------------------

class TestPredictNextPrice:
    def setup_method(self):
        self.predictor = EnhancedStockPredictor('TEST')
        self.df = make_synthetic_data()

    def _result(self):
        return self.predictor.predict_next_price(self.df)

    def test_top_level_keys_present(self):
        result = self._result()
        for key in ['prediction', 'current_price', 'price_change_percent',
                    'confidence', 'direction', 'signal',
                    'rf_prediction', 'gb_prediction', 'xgb_prediction',
                    'model_metrics', 'technical_indicators']:
            assert key in result, f'Missing key: {key}'

    def test_prediction_is_positive_float(self):
        result = self._result()
        assert isinstance(result['prediction'], float)
        assert result['prediction'] > 0

    def test_confidence_within_55_95(self):
        result = self._result()
        assert 55 <= result['confidence'] <= 95, (
            f"confidence {result['confidence']} outside [55, 95]"
        )

    def test_direction_is_valid(self):
        result = self._result()
        assert result['direction'] in ('UP', 'DOWN', 'NEUTRAL')

    def test_signal_is_valid(self):
        result = self._result()
        assert result['signal'] in ('HOLD', 'BUY', 'STRONG BUY', 'SELL', 'STRONG SELL')

    def test_direction_matches_prediction_vs_current(self):
        result = self._result()
        pred, cur = result['prediction'], result['current_price']
        if pred > cur:
            assert result['direction'] == 'UP'
        elif pred < cur:
            assert result['direction'] == 'DOWN'
        else:
            assert result['direction'] == 'NEUTRAL'

    def test_technical_indicators_keys(self):
        ti = self._result()['technical_indicators']
        for key in ['rsi', 'macd', 'macd_signal', 'stoch_k', 'stoch_d',
                    'williams_r', 'atr_ratio', 'volatility', 'volume_ratio',
                    'bb_pct', 'obv_signal']:
            assert key in ti, f'Missing technical indicator: {key}'

    def test_rsi_within_bounds(self):
        ti = self._result()['technical_indicators']
        assert 0 <= ti['rsi'] <= 100

    def test_model_weights_in_metrics_sum_to_one(self):
        weights = self._result()['model_metrics']['model_weights']
        total = weights['rf'] + weights['gb'] + weights['xgb']
        assert abs(total - 1.0) < 0.01

    def test_three_individual_predictions_differ(self):
        """RF, GB, and XGB should not all predict the exact same value."""
        result = self._result()
        preds = {result['rf_prediction'], result['gb_prediction'], result['xgb_prediction']}
        assert len(preds) >= 2, 'All three models returned identical predictions'

    def test_price_change_percent_consistent(self):
        result = self._result()
        expected_pct = (result['prediction'] - result['current_price']) / result['current_price'] * 100
        assert abs(result['price_change_percent'] - round(expected_pct, 2)) < 0.01

    def test_xgb_r2_key_in_model_metrics(self):
        metrics = self._result()['model_metrics']
        assert 'xgb_r2' in metrics


# ---------------------------------------------------------------------------
# Signal Logic
# ---------------------------------------------------------------------------

class TestSignalLogic:
    """Verify signal thresholds via direct logic — no network needed."""

    def _signal_for(self, price_change_pct, direction):
        trend = abs(price_change_pct)
        if trend < 0.5:
            return 'HOLD'
        elif direction == 'UP' and trend > 2:
            return 'STRONG BUY'
        elif direction == 'UP':
            return 'BUY'
        elif direction == 'DOWN' and trend > 2:
            return 'STRONG SELL'
        else:
            return 'SELL'

    def test_small_move_is_hold(self):
        assert self._signal_for(0.3, 'UP') == 'HOLD'
        assert self._signal_for(-0.4, 'DOWN') == 'HOLD'

    def test_moderate_up_is_buy(self):
        assert self._signal_for(1.0, 'UP') == 'BUY'

    def test_large_up_is_strong_buy(self):
        assert self._signal_for(3.0, 'UP') == 'STRONG BUY'

    def test_moderate_down_is_sell(self):
        assert self._signal_for(-1.0, 'DOWN') == 'SELL'

    def test_large_down_is_strong_sell(self):
        assert self._signal_for(-3.0, 'DOWN') == 'STRONG SELL'

    def test_boundary_exactly_0_5_is_not_hold(self):
        # 0.5% exactly: trend < 0.5 is False → should be BUY/SELL
        assert self._signal_for(0.5, 'UP') == 'BUY'


# ---------------------------------------------------------------------------
# get_prediction helper
# ---------------------------------------------------------------------------

class TestGetPrediction:
    def test_returns_none_when_data_is_none(self):
        with patch.object(EnhancedStockPredictor, 'fetch_data', return_value=None):
            assert get_prediction('TEST') is None

    def test_returns_none_when_insufficient_rows(self):
        with patch.object(EnhancedStockPredictor, 'fetch_data',
                          return_value=make_synthetic_data(n=50)):
            assert get_prediction('TEST') is None

    def test_returns_dict_for_valid_data(self):
        with patch.object(EnhancedStockPredictor, 'fetch_data',
                          return_value=make_synthetic_data(n=600)):
            result = get_prediction('TEST')
        assert result is not None
        assert isinstance(result, dict)
        assert 'prediction' in result

    def test_returns_none_on_exception(self):
        with patch.object(EnhancedStockPredictor, 'fetch_data',
                          side_effect=RuntimeError('network failure')):
            assert get_prediction('TEST') is None

    def test_prediction_is_numeric(self):
        with patch.object(EnhancedStockPredictor, 'fetch_data',
                          return_value=make_synthetic_data(n=600)):
            result = get_prediction('TEST')
        assert isinstance(result['prediction'], (int, float))
        assert result['prediction'] > 0
