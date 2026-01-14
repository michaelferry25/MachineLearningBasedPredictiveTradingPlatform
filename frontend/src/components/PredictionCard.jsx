export default function PredictionCard({ prediction }) {
  if (prediction.error) {
    return (
      <div className="prediction-card error">
        <h3>ML Prediction</h3>
        <p className="error-text">{prediction.error}</p>
      </div>
    );
  }

  const isPositive = prediction.direction === "UP";
  const directionClass = isPositive ? "positive" : "negative";

  return (
    <div className="prediction-card">
      <h3>ML Prediction</h3>
      <div className="prediction-content">
        <div className="prediction-main">
          <div className="predicted-price">
            <span className="label">Predicted Price</span>
            <span className={`value ${directionClass}`}>
              ${prediction.prediction}
            </span>
          </div>
          <div className="direction-badge">
            <span className={`badge ${directionClass}`}>
              {prediction.direction} {prediction.change_percent > 0 ? '↑' : '↓'} {Math.abs(prediction.change_percent)}%
            </span>
          </div>
        </div>
        
        <div className="prediction-details">
          <div className="detail-item">
            <span className="detail-label">Current Price</span>
            <span className="detail-value">${prediction.current_price}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Confidence</span>
            <span className="detail-value">{prediction.confidence}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Model</span>
            <span className="detail-value">{prediction.model}</span>
          </div>
        </div>
      </div>
    </div>
  );
}