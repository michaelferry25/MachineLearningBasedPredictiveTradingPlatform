import { useState, useEffect } from "react";
import "./EnhancedPredictionCard.css";
import PredictionAccuracyChart from "./PredictionAccuracyChart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const ET_ZONE = "America/New_York";

const formatEtDateTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "--";
  return d.toLocaleString("en-US", {
    timeZone: ET_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
};

const generateSummary = (ti) => {
  const insights = [];

  if (ti.rsi < 30) {
    insights.push(`RSI at ${ti.rsi.toFixed(1)} suggests oversold conditions — potential bounce ahead`);
  } else if (ti.rsi > 70) {
    insights.push(`RSI at ${ti.rsi.toFixed(1)} indicates overbought territory — pullback risk`);
  } else {
    insights.push(`RSI at ${ti.rsi.toFixed(1)} is in neutral range`);
  }

  if (ti.macd > ti.macd_signal) {
    insights.push("MACD is above the signal line, indicating bullish momentum");
  } else {
    insights.push("MACD is below the signal line, indicating bearish pressure");
  }

  if (ti.bb_pct > 1) {
    insights.push("Price is above the upper Bollinger Band, suggesting overextension");
  } else if (ti.bb_pct < 0) {
    insights.push("Price is below the lower Bollinger Band, signaling potential reversal");
  } else if (ti.volume_ratio > 1.5) {
    insights.push(`Volume is ${ti.volume_ratio.toFixed(1)}x above average, showing strong interest`);
  } else if (ti.volume_ratio < 0.5) {
    insights.push("Volume is below average, suggesting weak conviction");
  } else if (ti.stoch_k < 20) {
    insights.push("Stochastic indicates oversold momentum");
  } else if (ti.stoch_k > 80) {
    insights.push("Stochastic indicates overbought momentum");
  } else {
    insights.push(`Volatility at ${(ti.volatility * 100).toFixed(1)}% — moderate price swings expected`);
  }

  return insights;
};

const computeTradeLevels = (currentPrice, predictedPrice, ti) => {
  const atr = ti.atr_ratio * currentPrice;
  const isBullish = predictedPrice > currentPrice;

  if (isBullish) {
    return {
      action: "long",
      entry: Math.max(currentPrice - atr * 0.5, currentPrice * 0.98),
      target: predictedPrice,
      stopLoss: currentPrice - atr * 1.5,
    };
  } else {
    return {
      action: "short",
      entry: Math.min(currentPrice + atr * 0.5, currentPrice * 1.02),
      target: predictedPrice,
      stopLoss: currentPrice + atr * 1.5,
    };
  }
};

const EnhancedPredictionCard = ({
  symbol,
  prediction: externalPrediction,
  predictionComparison,
  showAdvanced,
  onToggleAdvanced,
  onRefreshPrediction
}) => {
  const [prediction, setPrediction] = useState(externalPrediction || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [displayConfidence, setDisplayConfidence] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [liveConfidence, setLiveConfidence] = useState(null);

  // Poll live confidence every 45 seconds
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    async function fetchLive() {
      try {
        const res = await fetch(`${API_URL}/api/ml/predict/${symbol}/live-confidence`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && !data.error) setLiveConfidence(data);
      } catch {}
    }

    fetchLive();
    const interval = setInterval(fetchLive, 45000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symbol]);

  // Use live confidence if available, otherwise base confidence
  const effectiveConfidence = liveConfidence?.dynamic_confidence ?? (prediction?.confidence || 0);

  // Animate the confidence score
  useEffect(() => {
    const target = Number(effectiveConfidence || 0);
    if (!target) return;

    setBarWidth(0);
    const wTimer = setTimeout(() => setBarWidth(target), 50);

    let current = displayConfidence || 0;
    const duration = 800;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = (target - current) / steps;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= target) || (increment < 0 && current <= target) || increment === 0) {
        setDisplayConfidence(target);
        clearInterval(timer);
      } else {
        setDisplayConfidence(current);
      }
    }, stepTime);

    return () => {
      clearInterval(timer);
      clearTimeout(wTimer);
    };
  }, [effectiveConfidence]);

  useEffect(() => {
    setPrediction(externalPrediction || null);
  }, [externalPrediction]);

  useEffect(() => {
    if (!symbol) return;
    fetchSentiment();
    if (!externalPrediction) {
      fetchPrediction();
    }
  }, [symbol]);

  const fetchSentiment = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ml/sentiment/${symbol}`);
      const data = await res.json();
      if (!data.error) setSentiment(data.combined || data);
    } catch {}
  };

  const fetchPrediction = async (force = false) => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ source: "scheduler_hourly" });
      if (force) params.set("refresh", "true");
      const query = `?${params.toString()}`;
      const response = await fetch(`${API_URL}/api/ml/predict/${symbol}${query}`);
      const data = await response.json();

      if (response.ok && !data.error) {
        setPrediction(data);
      } else {
        setError(data.error || "Failed to fetch forecast");
      }
    } catch (err) {
      setError("Network error - unable to fetch forecast");
      /* error Handled silently */
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClick = async () => {
    setLoading(true);
    setError(null);
    try {
      if (onRefreshPrediction) {
        await onRefreshPrediction();
        const response = await fetch(`${API_URL}/api/ml/predict/${symbol}?source=scheduler_hourly`);
        const data = await response.json();
        if (response.ok && !data.error) {
          setPrediction(data);
        }
      } else {
        await fetchPrediction(true);
      }
    } catch (err) {
      setError("Failed to refresh prediction");
    } finally {
      setLoading(false);
    }
  };

  if (!symbol) {
    return (
      <div className="enhanced-prediction-card">
        <h3>AI Prediction</h3>
        <div className="no-stock-message">Select a stock to see forecasts</div>
      </div>
    );
  }

  if (loading && !prediction) {
    return (
      <div className="enhanced-prediction-card">
        <h3>AI Prediction</h3>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading forecast...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enhanced-prediction-card">
        <h3>AI Prediction</h3>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchPrediction} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const buildSignal = (direction, confidenceValue) => {
    const confidence = Number.isFinite(confidenceValue) ? confidenceValue : 0;
    if (direction === "UP") {
      if (confidence >= 80) return "Strong Buy";
      if (confidence >= 65) return "Buy";
      return "Hold";
    }
    if (direction === "DOWN") {
      if (confidence >= 80) return "Strong Sell";
      if (confidence >= 65) return "Sell";
      return "Hold";
    }
    return "Hold";
  };

  const predictedPrice = Number(prediction.prediction);
  const currentPrice = Number(prediction.current_price);
  const fallbackChange = Number.isFinite(predictedPrice) && Number.isFinite(currentPrice) && currentPrice !== 0
    ? ((predictedPrice - currentPrice) / currentPrice) * 100
    : 0;
  const changePercent = Number(prediction.change_percent ?? prediction.price_change_percent ?? fallbackChange);
  const confidence = Number(prediction.confidence ?? 0);
  const direction = prediction.direction || (predictedPrice > currentPrice ? "UP" : predictedPrice < currentPrice ? "DOWN" : "NEUTRAL");

  if (!Number.isFinite(predictedPrice) || !Number.isFinite(currentPrice)) {
    return (
      <div className="enhanced-prediction-card">
        <h3>AI Prediction</h3>
        <div className="error-state">
          <p>Forecast data is unavailable.</p>
          <button onClick={fetchPrediction} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  const pred = {
    price: predictedPrice,
    current_price: currentPrice,
    price_change_percent: Number.isFinite(changePercent) ? changePercent : 0,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    signal: prediction.signal || buildSignal(direction, confidence)
  };

  const ti = prediction.technical_indicators;
  const mm = prediction.model_metrics;
  const ha = prediction.historical_accuracy;
  const predictionMeta = prediction.prediction_meta || {};
  const predictionTimestamp = prediction.last_prediction_at || predictionMeta.createdAt || prediction.timestamp;
  const predictionTarget = prediction.prediction_target_at || predictionMeta.targetAt || null;
  const predictionModelVersion = prediction.model_version || prediction.modelVersion || predictionMeta.modelVersion || "legacy";
  const predictionAgeMins = Number(
    prediction.last_prediction_age_minutes ?? predictionMeta.ageMinutes ?? NaN
  );
  const isStale = Boolean(prediction.last_prediction_stale ?? predictionMeta.stale);
  const sourceKey = String(predictionMeta.source || "scheduler").toLowerCase();
  const sourceLabelMap = {
    scheduler: "Auto Hourly",
    scheduler_hourly: "Auto Hourly",
    scheduler_daily_close: "Daily Close Model",
    manual_refresh: "Manual Refresh",
    bootstrap: "On Demand",
    scan: "Batch Scan",
    unknown: "Unknown Source",
  };
  const predictionSource = sourceLabelMap[sourceKey] || sourceKey.replaceAll("_", " ");
  const priceChangeColor = pred.price_change_percent > 0 ? "#3fb950" : pred.price_change_percent < 0 ? "#f85149" : "#f0883e";
  const hourlyComparisonPrice = Number(predictionComparison?.hourlyPrediction?.prediction ?? NaN);
  const dailyComparisonPrice = Number(predictionComparison?.dailyClosePrediction?.prediction ?? NaN);
  const hasHourlyComparison = Number.isFinite(hourlyComparisonPrice);
  const hasDailyComparison = Number.isFinite(dailyComparisonPrice);
  const spreadAbsolute = Number(predictionComparison?.spread?.absoluteSpread ?? NaN);
  const spreadPct = Number(predictionComparison?.spread?.spreadPercentOfDaily ?? NaN);

  const rsiClass = (val) => val > 70 ? 'overbought' : val < 30 ? 'oversold' : 'neutral';
  const stochClass = (val) => val > 80 ? 'overbought' : val < 20 ? 'oversold' : 'neutral';
  const williamsClass = (val) => val > -20 ? 'overbought' : val < -80 ? 'oversold' : 'neutral';
  const bbClass = (val) => val > 1 ? 'overbought' : val < 0 ? 'oversold' : 'neutral';
  const trendClass = (val) => val > 0 ? 'bullish' : 'bearish';
  const volumeClass = (val) => val > 1.5 ? 'high-volume' : val < 0.5 ? 'low-volume' : 'neutral';

  const levels = ti ? computeTradeLevels(pred.current_price, pred.price, ti) : null;
  const isBullish = pred.price > pred.current_price;

  return (
    <div className="enhanced-prediction-card">
      {/* Clean header: signal type + compact timestamp */}
      <div className="prediction-header">
        <h3>AI Prediction - {symbol}</h3>
        <div className="prediction-header-badges">
          {sourceKey === 'bootstrap' && (
            <div className="on-demand-badge">⚡ Live</div>
          )}
          <button className="prediction-refresh-btn" onClick={handleRefreshClick} disabled={loading}>
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>
      <div className="prediction-timestamp-line">
        {Number.isFinite(predictionAgeMins)
          ? `Updated ${predictionAgeMins < 60 ? `${predictionAgeMins}m` : `${Math.floor(predictionAgeMins/60)}h`} ago`
          : 'Updated recently'}
        {' · '}{predictionSource}
      </div>
      {(hasHourlyComparison || hasDailyComparison) && (
        <div className="dual-forecast-row">
          {hasHourlyComparison && (
            <div className="dual-forecast-item hourly">
              <span className="dual-label">Hourly</span>
              <strong>${hourlyComparisonPrice.toFixed(2)}</strong>
            </div>
          )}
          {hasDailyComparison && (
            <div className="dual-forecast-item daily">
              <span className="dual-label">Daily Close</span>
              <strong>${dailyComparisonPrice.toFixed(2)}</strong>
            </div>
          )}
          {Number.isFinite(spreadAbsolute) && (
            <div className="dual-forecast-item spread">
              <span className="dual-label">Spread</span>
              <strong>
                ${spreadAbsolute.toFixed(2)}
                {Number.isFinite(spreadPct) ? ` (${spreadPct >= 0 ? "+" : ""}${spreadPct.toFixed(2)}%)` : ""}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Zone 1: Smart Summary */}
      <div className="smart-signal-hero">
        <div className={`signal-badge-large ${pred.signal.toLowerCase().replace(' ', '-')}`}>
          {pred.signal}
        </div>
      </div>

      <div className="smart-summary-row">
        <div className="summary-price-block">
          <div className="label">Current</div>
          <div className="current-price">${pred.current_price.toFixed(2)}</div>
        </div>
        <div className="summary-arrow" style={{ color: priceChangeColor }}>
          {pred.price_change_percent > 0 ? '\u25B6' : pred.price_change_percent < 0 ? '\u25C0' : '\u25CF'}
        </div>
        <div className="summary-price-block">
          <div className="label">Next Day Forecast</div>
          <div className="predicted-price" style={{ color: priceChangeColor }}>
            ${pred.price.toFixed(2)}
          </div>
          <div className="price-change" style={{ color: priceChangeColor }}>
            {pred.price_change_percent > 0 ? '+' : ''}{pred.price_change_percent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="confidence-meter">
        <div className="confidence-top">
          <span className="label">
            {liveConfidence ? 'Live AI Confidence' : 'AI Confidence'}
            {liveConfidence && <span className="pulse-dot"></span>}
          </span>
          <span className="confidence-value">{displayConfidence.toFixed(1)}%</span>
        </div>
        <div className="confidence-bar">
          <div
            className="confidence-fill animated-fill"
            style={{
              width: `${barWidth}%`,
              background: effectiveConfidence >= 75 ? '#3fb950' : effectiveConfidence >= 60 ? '#f0883e' : '#f85149',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          ></div>
        </div>
        {liveConfidence ? (
          <div className="live-confidence-details">
            <div className="confidence-trend-row">
              <span className={`confidence-trend-badge ${liveConfidence.confidence_trend}`}>
                {liveConfidence.confidence_trend === 'rising' ? '\u25B2' : liveConfidence.confidence_trend === 'falling' ? '\u25BC' : '\u25CF'}
                {' '}{liveConfidence.confidence_trend}
              </span>
              <span className="confidence-delta" style={{
                color: liveConfidence.confidence_change >= 0 ? '#3fb950' : '#f85149'
              }}>
                {liveConfidence.confidence_change >= 0 ? '+' : ''}{liveConfidence.confidence_change.toFixed(1)}% from base
              </span>
              {liveConfidence.is_market_hours && (
                <span className="market-progress">
                  Market {liveConfidence.market_progress_percent.toFixed(0)}% through
                </span>
              )}
            </div>
            {liveConfidence.explanation && liveConfidence.explanation.length > 0 && (
              <div className="confidence-factors">
                {liveConfidence.explanation.map((exp, i) => (
                  <span key={i} className="factor-chip">{exp}</span>
                ))}
              </div>
            )}
            <div className="confidence-explainer">
              Our AI confidence updates throughout the trading day as new data confirms or challenges the prediction. It typically rises as the market approaches close.
            </div>
          </div>
        ) : (
          <div className="confidence-subtitle">
            {effectiveConfidence >= 75 ? 'High conviction signal' : effectiveConfidence >= 60 ? 'Moderate conviction' : 'Low visibility (mixed signals)'}
          </div>
        )}
      </div>
      {/* Sentiment Pulse - plain English */}
      {sentiment && (
        <div className="sentiment-pulse">
          <span className="sentiment-pulse-icon">
            {sentiment.score > 0.1 ? '📈' : sentiment.score < -0.1 ? '📉' : '📊'}
          </span>
          <span className="sentiment-pulse-text">
            News & Reddit are {sentiment.score > 0.1 ? 'bullish' : sentiment.score < -0.1 ? 'bearish' : 'neutral'}
            {sentiment.score > 0.1 ? ' ✅' : sentiment.score < -0.1 ? ' ⚠️' : ''}
          </span>
        </div>
      )}

      {/* Zone 2: AI Insights + Trade Levels */}
      {ti && (
        <div className="smart-insights-section">
          <h4>Why this signal?</h4>
          <ul className="insight-bullets">
            {generateSummary(ti).map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {levels && (
        <div className="trade-levels-section">
          <h4>{isBullish ? 'Entry & Target' : 'Caution Levels'}</h4>
          <div className="trade-levels-grid">
            <div className="trade-level entry">
              <div className="trade-level-label">{isBullish ? 'Enter Below' : 'Short Above'}</div>
              <div className="trade-level-value">${levels.entry.toFixed(2)}</div>
            </div>
            <div className="trade-level target">
              <div className="trade-level-label">Target</div>
              <div className="trade-level-value">${levels.target.toFixed(2)}</div>
            </div>
            <div className="trade-level stop">
              <div className="trade-level-label">Stop Loss</div>
              <div className="trade-level-value">${levels.stopLoss.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Zone 3: Advanced Toggle */}
      <button className="advanced-toggle-btn" onClick={onToggleAdvanced}>
        {showAdvanced ? 'Hide Advanced Analysis' : 'Show Advanced Analysis'}
        <span className={`toggle-chevron ${showAdvanced ? 'open' : ''}`}>&#9662;</span>
      </button>

      {showAdvanced && (
        <div className="advanced-section">
          {ti && (
            <div className="technical-section">
              <h4>Technical Indicators</h4>
              <div className="indicators-grid">
                <div className="indicator-item">
                  <div className="indicator-label">RSI (14)</div>
                  <div className={`indicator-value ${rsiClass(ti.rsi)}`}>
                    {ti.rsi?.toFixed(2)}
                  </div>
                  <div className="indicator-zone">
                    {ti.rsi > 70 ? 'Overbought' : ti.rsi < 30 ? 'Oversold' : 'Neutral'}
                  </div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">MACD</div>
                  <div className={`indicator-value ${trendClass(ti.macd - (ti.macd_signal || 0))}`}>
                    {ti.macd?.toFixed(4)}
                  </div>
                  <div className="indicator-zone">Signal: {ti.macd_signal?.toFixed(4)}</div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">Stochastic %K</div>
                  <div className={`indicator-value ${stochClass(ti.stoch_k)}`}>
                    {ti.stoch_k?.toFixed(2)}
                  </div>
                  <div className="indicator-zone">%D: {ti.stoch_d?.toFixed(2)}</div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">Williams %R</div>
                  <div className={`indicator-value ${williamsClass(ti.williams_r)}`}>
                    {ti.williams_r?.toFixed(2)}
                  </div>
                  <div className="indicator-zone">
                    {ti.williams_r > -20 ? 'Overbought' : ti.williams_r < -80 ? 'Oversold' : 'Neutral'}
                  </div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">BB Position</div>
                  <div className={`indicator-value ${bbClass(ti.bb_pct)}`}>
                    {(ti.bb_pct * 100)?.toFixed(1)}%
                  </div>
                  <div className="indicator-zone">
                    {ti.bb_pct > 1 ? 'Above upper' : ti.bb_pct < 0 ? 'Below lower' : 'Within bands'}
                  </div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">ATR Ratio</div>
                  <div className="indicator-value">
                    {(ti.atr_ratio * 100)?.toFixed(2)}%
                  </div>
                  <div className="indicator-zone">Avg True Range</div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">Volatility</div>
                  <div className="indicator-value">
                    {(ti.volatility * 100)?.toFixed(2)}%
                  </div>
                  <div className="indicator-zone">20-day std dev</div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">Volume Ratio</div>
                  <div className={`indicator-value ${volumeClass(ti.volume_ratio)}`}>
                    {ti.volume_ratio?.toFixed(2)}x
                  </div>
                  <div className="indicator-zone">
                    {ti.volume_ratio > 1.5 ? 'High volume' : ti.volume_ratio < 0.5 ? 'Low volume' : 'Normal'}
                  </div>
                </div>

                <div className="indicator-item">
                  <div className="indicator-label">OBV Signal</div>
                  <div className={`indicator-value ${trendClass(ti.obv_signal)}`}>
                    {ti.obv_signal?.toFixed(4)}
                  </div>
                  <div className="indicator-zone">
                    {ti.obv_signal > 0 ? 'Accumulation' : 'Distribution'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {mm && (
            <div className="model-details-section">
              <h4 style={{ color: '#e6edf3', margin: '0 0 12px 0', fontSize: '0.95rem' }}>Model Details</h4>
              <div className="model-info">
                <div className="model-metric">
                  <span>Random Forest R²:</span>
                  <span>{mm.rf_r2?.toFixed(4)}</span>
                </div>
                <div className="model-metric">
                  <span>Gradient Boosting R²:</span>
                  <span>{mm.gb_r2?.toFixed(4)}</span>
                </div>
                <div className="model-metric">
                  <span>XGBoost R²:</span>
                  <span>{mm.xgb_r2?.toFixed(4)}</span>
                </div>
                <div className="model-metric">
                  <span>Ensemble MAPE:</span>
                  <span>{mm.ensemble_mape?.toFixed(2)}%</span>
                </div>
                {mm.model_weights && (
                  <>
                    <div className="model-metric">
                      <span>RF Weight:</span>
                      <span>{(mm.model_weights.rf * 100)?.toFixed(1)}%</span>
                    </div>
                    <div className="model-metric">
                      <span>GB Weight:</span>
                      <span>{(mm.model_weights.gb * 100)?.toFixed(1)}%</span>
                    </div>
                    <div className="model-metric">
                      <span>XGB Weight:</span>
                      <span>{(mm.model_weights.xgb * 100)?.toFixed(1)}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Track Record Charts - hidden in advanced */}
          <PredictionAccuracyChart
            symbol={symbol}
            source="scheduler_daily_close"
            title="Daily Close Track Record"
          />
          <PredictionAccuracyChart
            symbol={symbol}
            source="scheduler_hourly"
            title="Hourly Drift Track Record"
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedPredictionCard;
