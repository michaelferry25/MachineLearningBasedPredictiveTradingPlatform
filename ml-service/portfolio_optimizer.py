"""
Markowitz Portfolio Optimizer

Implements Modern Portfolio Theory (MPT) using scipy optimization.
Given a set of stock symbols, computes the efficient frontier,
maximum Sharpe ratio portfolio, and minimum variance portfolio.
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
import yfinance as yf
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def fetch_returns(symbols, period_years=1):
    """Fetch historical daily returns for the given symbols."""
    end = datetime.now()
    start = end - timedelta(days=period_years * 365)

    prices = pd.DataFrame()
    for sym in symbols:
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(start=start, end=end, auto_adjust=True)
            if hist.empty or len(hist) < 30:
                logger.warning(f"Insufficient data for {sym}, skipping")
                continue
            prices[sym] = hist["Close"]
        except Exception as e:
            logger.warning(f"Failed to fetch {sym}: {e}")
            continue

    if prices.empty or len(prices.columns) < 2:
        raise ValueError("Need at least 2 valid symbols with sufficient data")

    # Forward fill then drop remaining NaN rows
    prices = prices.ffill().dropna()
    daily_returns = prices.pct_change().dropna()

    return daily_returns, prices


def portfolio_stats(weights, mean_returns, cov_matrix, risk_free_rate=0.05, trading_days=252):
    """Calculate annualized return, volatility, and Sharpe ratio for a portfolio."""
    portfolio_return = np.sum(mean_returns * weights) * trading_days
    portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * trading_days, weights)))
    sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_volatility if portfolio_volatility > 0 else 0
    return portfolio_return, portfolio_volatility, sharpe_ratio


def negative_sharpe(weights, mean_returns, cov_matrix, risk_free_rate):
    """Objective function: negative Sharpe ratio (we minimize this)."""
    _, _, sharpe = portfolio_stats(weights, mean_returns, cov_matrix, risk_free_rate)
    return -sharpe


def portfolio_volatility_fn(weights, mean_returns, cov_matrix):
    """Objective function: portfolio volatility for minimum variance."""
    return np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))


def optimize_portfolio(symbols, risk_free_rate=0.05, num_frontier_points=50):
    """
    Run full Markowitz optimization.

    Returns dict with:
      - optimal: max Sharpe ratio portfolio
      - min_variance: minimum variance portfolio
      - frontier: list of {return, volatility, weights} points
      - individual: per-stock annualized return and volatility
      - correlation: correlation matrix
    """
    daily_returns, prices = fetch_returns(symbols)
    valid_symbols = list(daily_returns.columns)
    n = len(valid_symbols)

    if n < 2:
        raise ValueError("Need at least 2 valid symbols")

    mean_returns = daily_returns.mean()
    cov_matrix = daily_returns.cov()

    # Constraints: weights sum to 1
    constraints = {"type": "eq", "fun": lambda w: np.sum(w) - 1}
    # Bounds: each weight between 0 and 1 (long only)
    bounds = tuple((0, 1) for _ in range(n))
    initial_weights = np.array([1 / n] * n)

    # 1. Maximum Sharpe Ratio Portfolio
    max_sharpe_result = minimize(
        negative_sharpe,
        initial_weights,
        args=(mean_returns, cov_matrix, risk_free_rate),
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
    )
    optimal_weights = max_sharpe_result.x
    opt_return, opt_vol, opt_sharpe = portfolio_stats(
        optimal_weights, mean_returns, cov_matrix, risk_free_rate
    )

    # 2. Minimum Variance Portfolio
    min_var_result = minimize(
        portfolio_volatility_fn,
        initial_weights,
        args=(mean_returns, cov_matrix),
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
    )
    min_var_weights = min_var_result.x
    mv_return, mv_vol, mv_sharpe = portfolio_stats(
        min_var_weights, mean_returns, cov_matrix, risk_free_rate
    )

    # 2.5 Balanced Portfolio (midpoint return between MV and Max Sharpe)
    balanced_target = mv_return + (opt_return - mv_return) / 2
    cons = [
        {"type": "eq", "fun": lambda w: np.sum(w) - 1},
        {"type": "eq", "fun": lambda w: np.sum(mean_returns * w) * 252 - balanced_target},
    ]
    bal_result = minimize(
        portfolio_volatility_fn,
        initial_weights,
        args=(mean_returns, cov_matrix),
        method="SLSQP",
        bounds=bounds,
        constraints=cons,
    )
    bal_weights = bal_result.x
    bal_return, bal_vol, bal_sharpe = portfolio_stats(
        bal_weights, mean_returns, cov_matrix, risk_free_rate
    )

    # 3. Efficient Frontier
    target_returns = np.linspace(mv_return, opt_return * 1.3, num_frontier_points)
    frontier = []
    for target in target_returns:
        cons = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w, t=target: np.sum(mean_returns * w) * 252 - t},
        ]
        result = minimize(
            portfolio_volatility_fn,
            initial_weights,
            args=(mean_returns, cov_matrix),
            method="SLSQP",
            bounds=bounds,
            constraints=cons,
        )
        if result.success:
            f_return, f_vol, f_sharpe = portfolio_stats(
                result.x, mean_returns, cov_matrix, risk_free_rate
            )
            frontier.append({
                "return": round(f_return * 100, 2),
                "volatility": round(f_vol * 100, 2),
                "sharpe": round(f_sharpe, 3),
                "weights": {sym: round(float(w), 4) for sym, w in zip(valid_symbols, result.x)},
            })

    # 4. Individual stock stats
    individual = {}
    for sym in valid_symbols:
        ann_return = mean_returns[sym] * 252
        ann_vol = daily_returns[sym].std() * np.sqrt(252)
        individual[sym] = {
            "annualReturn": round(ann_return * 100, 2),
            "annualVolatility": round(ann_vol * 100, 2),
            "sharpe": round((ann_return - risk_free_rate) / ann_vol, 3) if ann_vol > 0 else 0,
        }

    # 5. Correlation matrix
    corr = daily_returns.corr()
    correlation = {
        sym: {s2: round(corr.loc[sym, s2], 3) for s2 in valid_symbols}
        for sym in valid_symbols
    }

    return {
        "symbols": valid_symbols,
        "optimal": {
            "weights": {sym: round(float(w), 4) for sym, w in zip(valid_symbols, optimal_weights)},
            "expectedReturn": round(opt_return * 100, 2),
            "volatility": round(opt_vol * 100, 2),
            "sharpeRatio": round(opt_sharpe, 3),
        },
        "balanced": {
            "weights": {sym: round(float(w), 4) for sym, w in zip(valid_symbols, bal_weights)},
            "expectedReturn": round(bal_return * 100, 2),
            "volatility": round(bal_vol * 100, 2),
            "sharpeRatio": round(bal_sharpe, 3),
        },
        "minVariance": {
            "weights": {sym: round(float(w), 4) for sym, w in zip(valid_symbols, min_var_weights)},
            "expectedReturn": round(mv_return * 100, 2),
            "volatility": round(mv_vol * 100, 2),
            "sharpeRatio": round(mv_sharpe, 3),
        },
        "frontier": frontier,
        "individual": individual,
        "correlation": correlation,
        "riskFreeRate": risk_free_rate * 100,
        "dataPoints": len(daily_returns),
    }
