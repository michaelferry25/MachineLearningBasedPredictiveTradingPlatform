"""
ML Model Accuracy Test Script
Tests the EnhancedStockPredictor on multiple stocks using historical data
with walk-forward validation to measure real-world prediction accuracy.
"""

import sys
import os
import warnings
import numpy as np
import json
from datetime import datetime

warnings.filterwarnings("ignore")

# Add the ml-service directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml_model import EnhancedStockPredictor, get_detailed_prediction


def test_stock_accuracy(symbol, verbose=True):
    """
    Test prediction accuracy for a single stock using the model's
    built-in train/validation/test split (70/15/15).
    """
    if verbose:
        print(f"\n{'='*60}")
        print(f"  Testing: {symbol}")
        print(f"{'='*60}")

    try:
        # Use the module-level function
        result = get_detailed_prediction(symbol)

        if not result or "error" in result:
            print(f"  ❌ Error or no result")
            return None
        
        pred_data = result.get("prediction", {})

        # Extract key metrics
        current_price = pred_data.get("current_price", 0)
        predicted_price = pred_data.get("predicted_price", 0)
        predicted_change = pred_data.get("prediction_difference_percentage", 0)
        confidence = pred_data.get("confidence", 0)
        signal = pred_data.get("signal", "N/A")

        # Direction accuracy from model internals
        details = pred_data.get("details", {})
        model_scores = details.get("model_scores", {})
        val_metrics = details.get("validation_metrics", {})

        if verbose:
            print(f"\n  📊 Current Price:    ${current_price:.2f}")
            print(f"  🎯 Predicted Price:  ${predicted_price:.2f}")
            print(f"  📈 Predicted Change: {predicted_change:+.2f}%")
            print(f"  💪 Confidence:       {confidence:.1f}%")
            print(f"  🚦 Signal:           {signal}")

            if model_scores:
                print(f"\n  📐 Model Scores:")
                for model_name, score in model_scores.items():
                    print(f"     {model_name}: R² = {score:.4f}")

        return {
            "symbol": symbol,
            "current_price": current_price,
            "predicted_price": predicted_price,
            "predicted_change_pct": predicted_change,
            "confidence": confidence,
            "signal": signal,
            "model_scores": model_scores,
        }

    except Exception as e:
        print(f"  ❌ Exception: {str(e)}")
        return None


def run_direction_backtest(symbol, lookback_days=60, verbose=True):
    """
    Walk-forward direction accuracy test:
    Uses the model's test set predictions to check if predicted
    direction (up/down) matches actual direction.
    """
    if verbose:
        print(f"\n  📏 Running direction backtest ({lookback_days} day window)...")

    try:
        predictor = EnhancedStockPredictor(symbol)

        # Get data
        df = predictor.fetch_data()
        if df is None or len(df) < predictor.MIN_SAMPLES:
            print(f"  ⚠️  Insufficient data for backtest")
            return None

        # Use the combined technical + macro + sentiment data method
        # which correctly pulls everything needed for feature columns
        df = predictor.calculate_technical_indicators(df)
        df = df.dropna()

        if len(df) < 100:
            print(f"  ⚠️  Insufficient clean data ({len(df)} rows)")
            return None

        # predictor.feature_columns has the exact list used by the model
        features = predictor.feature_columns
        X = df[features].values
        
        # Match model's new 5-day horizon
        y_returns = df["Close"].pct_change(5).shift(-5).values

        # Remove last rows (no future return available)
        X = X[:-5]
        y_returns = y_returns[:-5]

        # Remove NaN returns
        mask = ~np.isnan(y_returns)
        X = X[mask]
        y_returns = y_returns[mask]

        # Split: use last 15% as test set (same as model)
        n = len(X)
        test_start = int(n * 0.85)
        X_train, X_test = X[:test_start], X[test_start:]
        y_train, y_test = y_returns[:test_start], y_returns[test_start:]

        # Scale
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Train each model
        from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
        from xgboost import XGBRegressor

        models = {
            "RandomForest": RandomForestRegressor(
                n_estimators=300, max_depth=8, min_samples_split=5,
                min_samples_leaf=4, random_state=42, n_jobs=-1
            ),
            "GradientBoosting": GradientBoostingRegressor(
                n_estimators=250, max_depth=4, learning_rate=0.02,
                subsample=0.8, min_samples_leaf=5, random_state=42
            ),
            "XGBoost": XGBRegressor(
                n_estimators=300, max_depth=5, learning_rate=0.02,
                subsample=0.85, colsample_bytree=0.85, reg_alpha=0.3,
                reg_lambda=2.0, random_state=42
            ),
        }

        predictions_per_model = {}
        for name, model in models.items():
            model.fit(X_train_scaled, y_train)
            pred = model.predict(X_test_scaled)
            predictions_per_model[name] = pred

        # Ensemble average
        ensemble_pred = np.mean(list(predictions_per_model.values()), axis=0)

        # Direction accuracy
        actual_dir = (y_test > 0).astype(int)
        pred_dir = (ensemble_pred > 0).astype(int)
        direction_correct = (actual_dir == pred_dir).astype(int)
        direction_accuracy = direction_correct.mean() * 100

        # Per-model direction accuracy
        model_dir_acc = {}
        for name, pred in predictions_per_model.items():
            model_pred_dir = (pred > 0).astype(int)
            acc = (actual_dir == model_pred_dir).mean() * 100
            model_dir_acc[name] = acc

        # MAE on returns
        mae = np.mean(np.abs(y_test - ensemble_pred)) * 100

        # Strong signal accuracy (>2.5% predicted move in 5 days)
        strong_mask = np.abs(ensemble_pred) > 0.025
        if strong_mask.sum() > 0:
            strong_acc = ((actual_dir[strong_mask] == pred_dir[strong_mask]).mean()) * 100
            strong_count = strong_mask.sum()
        else:
            strong_acc = 0
            strong_count = 0

        if verbose:
            print(f"\n  ✅ RESULTS ({len(y_test)} test samples):")
            print(f"  ─────────────────────────────────────")
            print(f"  📊 Ensemble Direction Accuracy: {direction_accuracy:.1f}%")
            print(f"  📏 Mean Absolute Error (return): {mae:.3f}%")
            print(f"  🎯 Strong Signal Accuracy:       {strong_acc:.1f}% ({strong_count} signals)")
            print(f"\n  Per-Model Direction Accuracy:")
            for name, acc in model_dir_acc.items():
                print(f"     {name}: {acc:.1f}%")

        return {
            "symbol": symbol,
            "test_samples": len(y_test),
            "direction_accuracy": round(direction_accuracy, 1),
            "mae_pct": round(mae, 3),
            "strong_signal_accuracy": round(strong_acc, 1),
            "strong_signal_count": int(strong_count),
            "model_direction_accuracy": {k: round(v, 1) for k, v in model_dir_acc.items()},
        }

    except Exception as e:
        print(f"  ❌ Backtest error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def main():
    test_symbols = ["AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "NVDA"]

    print("=" * 60)
    print("  ML MODEL ACCURACY TEST")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    all_results = []
    all_backtests = []

    for symbol in test_symbols:
        # Current prediction
        result = test_stock_accuracy(symbol)
        if result:
            all_results.append(result)

        # Direction backtest
        bt = run_direction_backtest(symbol)
        if bt:
            all_backtests.append(bt)

    # Summary
    if all_backtests:
        print("\n" + "=" * 60)
        print("  OVERALL SUMMARY")
        print("=" * 60)

        avg_dir_acc = np.mean([b["direction_accuracy"] for b in all_backtests])
        avg_strong_acc = np.mean([b["strong_signal_accuracy"] for b in all_backtests if b["strong_signal_count"] > 0])
        avg_mae = np.mean([b["mae_pct"] for b in all_backtests])

        print(f"\n  Stocks tested: {len(all_backtests)}")
        print(f"  Avg Direction Accuracy:       {avg_dir_acc:.1f}%")
        print(f"  Avg Strong Signal Accuracy:   {avg_strong_acc:.1f}%")
        print(f"  Avg MAE (return):             {avg_mae:.3f}%")

        print(f"\n  Per-Stock Breakdown:")
        print(f"  {'Symbol':<8} {'Dir Acc':>8} {'Strong':>8} {'MAE':>8} {'Samples':>8}")
        print(f"  {'─'*8} {'─'*8} {'─'*8} {'─'*8} {'─'*8}")
        for b in all_backtests:
            print(f"  {b['symbol']:<8} {b['direction_accuracy']:>7.1f}% {b['strong_signal_accuracy']:>7.1f}% {b['mae_pct']:>7.3f}% {b['test_samples']:>8}")

        target_met = avg_dir_acc >= 70
        print(f"\n  {'✅' if target_met else '⚠️'}  70% Direction Accuracy Target: {'MET' if target_met else 'NOT MET'} ({avg_dir_acc:.1f}%)")

    # Save results
    output = {
        "timestamp": datetime.now().isoformat(),
        "predictions": all_results,
        "backtests": all_backtests,
        "summary": {
            "avg_direction_accuracy": round(avg_dir_acc, 1) if all_backtests else 0,
            "avg_strong_signal_accuracy": round(avg_strong_acc, 1) if all_backtests else 0,
            "avg_mae_pct": round(avg_mae, 3) if all_backtests else 0,
        }
    }

    with open("test_results.json", "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\n  Results saved to test_results.json")


if __name__ == "__main__":
    main()
