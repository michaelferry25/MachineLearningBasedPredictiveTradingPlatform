import React, { useState, useEffect } from "react";
import "./EnhancedPredictionCard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const EnhancedPredictionCard = ({ symbol }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchPrediction();
      const interval = setInterval(fetchPrediction, 60000);
      return () => clearInterval(interval);
    }
  }, [symbol]);

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
        <h3>Forecast Summary</h3>
        <div className="no-stock-message">Select a stock to see forecasts</div>
      </div>
    );
  }

  if (loading && !prediction) {
    return (
      <div className="enhanced-prediction-card">
        <h3>Forecast Summary</h3>
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
        <h3>Forecast Summary</h3>
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
  const changePercent = Number(prediction.change_percent ?? fallbackChange);
  const confidence = Number(prediction.confidence ?? 0);
  const direction = prediction.direction || (predictedPrice > currentPrice ? "UP" : predictedPrice < currentPrice ? "DOWN" : "NEUTRAL");

  if (!Number.isFinite(predictedPrice) || !Number.isFinite(currentPrice)) {
    return (
      <div className="enhanced-prediction-card">
        <h3>Forecast Summary</h3>
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

  const { sentiment_analysis, technical_indicators, model_details, historical_accuracy } = prediction;
  const priceChangeColor = pred.price_change_percent > 0 ? "#3fb950" : pred.price_change_percent < 0 ? "#f85149" : "#f0883e";

  return (
    <div className="enhanced-prediction-card">
      <div className="prediction-header">
        <h3>Forecast Summary - {symbol}</h3>
        <div className="model-badge">{prediction.model || "Forecast Model"}</div>
      </div>

      <div className="main-prediction">
        <div className="predicted-price-section">
          <div className="label">Forecast Price</div>
          <div className="predicted-price">${pred.price.toFixed(2)}</div>
          <div className="price-change" style={{ color: priceChangeColor }}>
            {pred.price_change_percent > 0 ? '↑' : pred.price_change_percent < 0 ? '↓' : '→'} {Math.abs(pred.price_change_percent).toFixed(2)}%
          </div>
        </div>

        <div className="current-price-section">
          <div className="label">Current Price</div>
          <div className="current-price">${pred.current_price.toFixed(2)}</div>
        </div>
      </div>

      <div className="confidence-signal-row">
        <div className="confidence-meter">
          <div className="label">Confidence</div>
          <div className="confidence-bar">
            <div 
              className="confidence-fill" 
              style={{ 
                width: `${pred.confidence}%`,
                background: pred.confidence >= 75 ? '#3fb950' : pred.confidence >= 60 ? '#f0883e' : '#f85149'
              }}
            ></div>
          </div>
          <div className="confidence-value">{pred.confidence}%</div>
        </div>

        <div className="signal-indicator">
          <div className="label">Signal</div>
          <div className={`signal-badge ${pred.signal.toLowerCase().replace(' ', '-')}`}>
            {pred.signal}
          </div>
        </div>
      </div>

      {sentiment_analysis && (
        <div className="sentiment-section">
          <h4>Sentiment Analysis</h4>
          <div className="sentiment-grid">
            <div className="sentiment-item">
              <div className="sentiment-label">Combined Sentiment</div>
              <div className={`sentiment-value ${sentiment_analysis.combined.label.toLowerCase().replace(' ', '-')}`}>
                {sentiment_analysis.combined.label}
              </div>
              <div className="sentiment-score">Score: {sentiment_analysis.combined.score.toFixed(3)}</div>
            </div>
            
            <div className="sentiment-item">
              <div className="sentiment-label">News Sentiment</div>
              <div className={`sentiment-value ${sentiment_analysis.news.label.toLowerCase().replace(' ', '-')}`}>
                {sentiment_analysis.news.label}
              </div>
              <div className="sentiment-details">
                {sentiment_analysis.news.article_count} articles
              </div>
            </div>

            <div className="sentiment-item">
              <div className="sentiment-label">Social Media</div>
              <div className={`sentiment-value ${sentiment_analysis.reddit.label.toLowerCase().replace(' ', '-')}`}>
                {sentiment_analysis.reddit.label}
              </div>
              <div className="sentiment-details">
                {sentiment_analysis.reddit.post_count} posts
              </div>
            </div>
          </div>
        </div>
      )}

      {technical_indicators && (
        <div className="technical-section">
          <h4>Technical Indicators</h4>
          <div className="indicators-grid">
            <div className="indicator-item">
              <div className="indicator-label">RSI</div>
              <div className={`indicator-value ${technical_indicators.rsi > 70 ? 'overbought' : technical_indicators.rsi < 30 ? 'oversold' : 'neutral'}`}>
                {technical_indicators.rsi.toFixed(2)}
              </div>
            </div>
            <div className="indicator-item">
              <div className="indicator-label">MACD</div>
              <div className="indicator-value">{technical_indicators.macd.toFixed(4)}</div>
            </div>
            <div className="indicator-item">
              <div className="indicator-label">Volatility</div>
              <div className="indicator-value">{(technical_indicators.volatility * 100).toFixed(2)}%</div>
            </div>
            <div className="indicator-item">
              <div className="indicator-label">Volume Ratio</div>
              <div className="indicator-value">{technical_indicators.volume_ratio.toFixed(2)}x</div>
            </div>
          </div>
        </div>
      )}

      {historical_accuracy && (
        <div className="accuracy-section">
          <h4>Model Accuracy</h4>
          <div className="accuracy-stats">
            <div className="accuracy-item">
              <span className="accuracy-label">Direction Accuracy:</span>
              <span className={`accuracy-value ${historical_accuracy.direction_accuracy >= 70 ? 'high' : 'medium'}`}>
                {historical_accuracy.direction_accuracy}%
              </span>
            </div>
            <div className="accuracy-item">
              <span className="accuracy-label">Predictions:</span>
              <span className="accuracy-value">
                {historical_accuracy.correct_predictions}/{historical_accuracy.total_predictions}
              </span>
            </div>
          </div>
        </div>
      )}

      {model_details && (
        <div className="model-details-section">
          <details>
            <summary>Model Details</summary>
            <div className="model-info">
              <div className="model-metric">
                <span>Random Forest R²:</span>
                <span>{model_details.metrics.rf_r2.toFixed(4)}</span>
              </div>
              <div className="model-metric">
                <span>Gradient Boosting R²:</span>
                <span>{model_details.metrics.gb_r2.toFixed(4)}</span>
              </div>
              <div className="model-metric">
                <span>Ensemble MAPE:</span>
                <span>{model_details.metrics.ensemble_mape.toFixed(2)}%</span>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default EnhancedPredictionCard;
