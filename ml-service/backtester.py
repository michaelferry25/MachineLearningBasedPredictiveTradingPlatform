"""
Walk-Forward Backtesting Engine with Expanding Window Retraining

Simulates a long-only strategy driven by the ML ensemble model.
To accurately reflect production behaviour (where the model is
continuously retrained with new data), we use an expanding window
approach: the model is retrained every RETRAIN_INTERVAL trading
days using all available data up to that point.
"""

import numpy as np
import pandas as pd
import logging

from ml_model import EnhancedStockPredictor

logger = logging.getLogger(__name__)

RETRAIN_INTERVAL = 30   # retrain every 30 trading days
BUY_THRESHOLD = 0.003   # 0.3% predicted return to trigger buy
SELL_THRESHOLD = -0.002  # -0.2% predicted return to trigger sell
POSITION_SIZE = 0.95     # invest 95% of capital when buying


def run_backtest(symbol, initial_capital=100000):
    """
    Run an expanding-window backtest for the given symbol.

    The model is retrained periodically during the test period to
    simulate continuous learning, matching real production behaviour.
    """
    sym = symbol.upper()
    logger.info(f"[BACKTEST] Starting expanding-window backtest for {sym}")

    predictor = EnhancedStockPredictor(sym)
    df = predictor.fetch_data(period="5y")

    if df is None or len(df) < 400:
        raise ValueError(f"Insufficient historical data for {sym}")

    df_tech = predictor.calculate_technical_indicators(df)
    X, y, current_close, _, _, _, row_indices = predictor.prepare_features(df_tech)

    if len(X) < predictor.MIN_SAMPLES:
        raise ValueError(f"Insufficient training samples for {sym}: {len(X)}")

    # Split: use last 15% as the test window
    _, val_end = predictor._split_indices(len(X))
    test_start = val_end

    test_indices = list(range(test_start, len(X)))
    if len(test_indices) < 20:
        raise ValueError(f"Test period too short: {len(test_indices)} days")

    # Map indices to dates and prices
    test_row_indices = row_indices[test_start:]
    dates = df_tech.index[test_row_indices]
    close_prices = df_tech["Close"].iloc[test_row_indices].values

    # --- Expanding Window Simulation ---
    cash = float(initial_capital)
    shares = 0.0
    position_open = False
    entry_price = 0.0
    equity_curve = []
    trades = []
    last_train_i = -RETRAIN_INTERVAL  # force initial training

    for i in range(len(test_indices)):
        global_idx = test_indices[i]

        # Retrain if interval elapsed (expanding window)
        if i - last_train_i >= RETRAIN_INTERVAL:
            train_X = X[:global_idx]
            train_y = y[:global_idx]
            train_close = current_close[:global_idx]
            if len(train_X) >= predictor.MIN_SAMPLES:
                predictor.train_models(train_X, train_y, train_close)
                last_train_i = i
                logger.info(f"[BACKTEST] Retrained at day {i}/{len(test_indices)} "
                            f"using {len(train_X)} samples")

        # Predict
        scaled = predictor.scaler.transform(X[global_idx].reshape(1, -1))
        rf_r = float(predictor.rf_model.predict(scaled)[0])
        gb_r = float(predictor.gb_model.predict(scaled)[0])
        xgb_r = float(predictor.xgb_model.predict(scaled)[0])
        pred_return = (
            predictor.model_weights[0] * rf_r
            + predictor.model_weights[1] * gb_r
            + predictor.model_weights[2] * xgb_r
        )

        price = float(close_prices[i])
        date_str = str(dates[i].date()) if hasattr(dates[i], 'date') else str(dates[i])[:10]
        portfolio_value = cash + (shares * price)

        # Trading logic
        if not position_open and pred_return > BUY_THRESHOLD:
            invest = cash * POSITION_SIZE
            shares = invest / price
            cash -= invest
            position_open = True
            entry_price = price
            trades.append({
                "date": date_str, "type": "BUY",
                "price": round(price, 2),
                "shares": round(shares, 4),
                "value": round(invest, 2),
                "predictedReturn": round(pred_return * 100, 3),
            })
        elif position_open and pred_return < SELL_THRESHOLD:
            sell_value = shares * price
            pnl = sell_value - (shares * entry_price)
            pnl_pct = ((price - entry_price) / entry_price) * 100
            cash += sell_value
            trades.append({
                "date": date_str, "type": "SELL",
                "price": round(price, 2),
                "shares": round(shares, 4),
                "value": round(sell_value, 2),
                "pnl": round(pnl, 2),
                "pnlPercent": round(pnl_pct, 2),
                "predictedReturn": round(pred_return * 100, 3),
            })
            shares = 0.0
            position_open = False

        equity_curve.append({
            "date": date_str,
            "value": round(portfolio_value, 2),
            "price": round(price, 2),
        })

    # Close any open position
    if position_open and len(close_prices) > 0:
        fp = float(close_prices[-1])
        sv = shares * fp
        pnl = sv - (shares * entry_price)
        pnl_pct = ((fp - entry_price) / entry_price) * 100
        cash += sv
        trades.append({
            "date": equity_curve[-1]["date"], "type": "SELL (Close)",
            "price": round(fp, 2), "shares": round(shares, 4),
            "value": round(sv, 2), "pnl": round(pnl, 2),
            "pnlPercent": round(pnl_pct, 2), "predictedReturn": 0,
        })
        shares = 0.0

    # --- Performance Metrics ---
    final_value = cash
    total_return = ((final_value - initial_capital) / initial_capital) * 100

    benchmark_start = float(close_prices[0])
    benchmark_curve = [
        {"date": equity_curve[i]["date"],
         "value": round(initial_capital * (float(close_prices[i]) / benchmark_start), 2)}
        for i in range(len(equity_curve))
    ]
    benchmark_return = ((float(close_prices[-1]) - benchmark_start) / benchmark_start) * 100
    alpha = total_return - benchmark_return

    sell_trades = [t for t in trades if "pnl" in t]
    winning = [t for t in sell_trades if t["pnl"] > 0]
    losing = [t for t in sell_trades if t["pnl"] <= 0]
    win_rate = (len(winning) / len(sell_trades) * 100) if sell_trades else 0

    equity_vals = [e["value"] for e in equity_curve]
    daily_ret = pd.Series(equity_vals).pct_change().dropna()
    rf_daily = 0.05 / 252
    sharpe = 0.0
    if len(daily_ret) > 10 and daily_ret.std() > 0:
        sharpe = ((daily_ret.mean() - rf_daily) / daily_ret.std()) * np.sqrt(252)

    peak = equity_vals[0]
    max_dd = 0.0
    for v in equity_vals:
        if v > peak:
            peak = v
        dd = ((peak - v) / peak) * 100
        if dd > max_dd:
            max_dd = dd

    profit_factor = 0.0
    if losing and sum(t["pnl"] for t in losing) != 0:
        profit_factor = sum(t["pnl"] for t in winning) / abs(sum(t["pnl"] for t in losing))
    elif winning:
        profit_factor = 99.9

    n_retrains = max(1, len(test_indices) // RETRAIN_INTERVAL)

    metrics = {
        "totalReturn": round(total_return, 2),
        "benchmarkReturn": round(benchmark_return, 2),
        "alpha": round(alpha, 2),
        "sharpeRatio": round(float(sharpe), 3),
        "maxDrawdown": round(max_dd, 2),
        "winRate": round(win_rate, 1),
        "profitFactor": round(float(min(profit_factor, 99.9)), 2),
        "totalTrades": len(sell_trades),
        "winningTrades": len(winning),
        "losingTrades": len(losing),
        "finalValue": round(final_value, 2),
        "initialCapital": initial_capital,
        "testDays": len(test_indices),
        "retrainCount": n_retrains,
    }

    logger.info(
        f"[BACKTEST] {sym} done. Return: {total_return:.2f}% | "
        f"Benchmark: {benchmark_return:.2f}% | Alpha: {alpha:.2f}% | "
        f"Sharpe: {sharpe:.3f} | Retrains: {n_retrains}"
    )

    return {
        "symbol": sym,
        "metrics": metrics,
        "equityCurve": equity_curve,
        "benchmarkCurve": benchmark_curve,
        "trades": trades,
        "testPeriod": {
            "start": equity_curve[0]["date"] if equity_curve else None,
            "end": equity_curve[-1]["date"] if equity_curve else None,
        },
    }
