import { useState, useEffect } from "react";
import "./EnhancedPredictionCard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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

const EnhancedPredictionCard = ({ symbol, showAdvanced, onToggleAdvanced }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sentiment, setSentiment] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchPrediction();
      fetchSentiment();
      const interval = setInterval(fetchPrediction, 60000);
      return () => clearInterval(interval);
    }
  }, [symbol]);

  const fetchSentiment = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ml/sentiment/${symbol}`);
      const data = await res.json();
      if (!data.error) setSentiment(data.combined || data);
    } catch {}
  };

  const fetchPrediction = async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/ml/predict/${symbol}`);
      const data = await response.json();

      if (response.ok && !data.error) {
        setPrediction(data);
      } else {
        setError(data.error || "Failed to fetch forecast");
      }
    } catch (err) {
      setError("Network error - unable to fetch forecast");
      console.error(err);
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
    signal: buildSignal(direction, confidence)
  };

  const ti = prediction.technical_indicators;
  const mm = prediction.model_metrics;
  const priceChangeColor = pred.price_change_percent > 0 ? "#3fb950" : pred.price_change_percent < 0 ? "#f85149" : "#f0883e";

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
      <div className="prediction-header">
        <h3>AI Prediction - {symbol}</h3>
        <div className="prediction-header-badges">
          {sentiment && (
            <div className={`sentiment-mini-badge ${sentiment.label?.toLowerCase().replace(' ', '-')}`}>
              {sentiment.label} ({sentiment.score >= 0 ? '+' : ''}{sentiment.score?.toFixed(2)})
            </div>
          )}
          <div className="model-badge">Next Day &middot; Ensemble</div>
        </div>
      </div>

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
          <span className="label">Model Confidence</span>
          <span className="confidence-value">{pred.confidence.toFixed(1)}%</span>
        </div>
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{
              width: `${pred.confidence}%`,
              background: pred.confidence >= 75 ? '#3fb950' : pred.confidence >= 60 ? '#f0883e' : '#f85149'
            }}
          ></div>
        </div>
      </div>

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
        </div>
      )}
    </div>
  );
};

export default EnhancedPredictionCard;
