import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const PredictionHistory = ({ symbol }) => {
  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchHistory();
    }
  }, [symbol]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsResponse, metricsResponse] = await Promise.all([
        fetch(`${API_URL}/api/ml/predictions?limit=200&evaluated=true`),
        fetch(`${API_URL}/api/ml/metrics`)
      ]);

      const logsData = await logsResponse.json();
      const metricsData = await metricsResponse.json();

      if (!logsResponse.ok) {
        throw new Error(logsData.error || "Failed to fetch forecast history");
      }

      const filtered = Array.isArray(logsData)
        ? logsData.filter((log) => log.symbol === symbol.toUpperCase())
        : [];

      setHistory(filtered);
      setMetrics(metricsResponse.ok ? metricsData : null);
    } catch (err) {
      setError("Failed to fetch forecast history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!symbol) {
    return null;
  }

  if (loading) {
    return (
      <div className="prediction-history-card">
        <h3>Forecast History</h3>
        <div className="loading-spinner">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prediction-history-card">
        <h3>Forecast History</h3>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="prediction-history-card">
        <h3>Forecast History</h3>
        <div className="no-data">No forecast history available yet</div>
      </div>
    );
  }

  return (
    <div className="prediction-history-card">
      <div className="history-header">
        <h3>Forecast History - {symbol}</h3>
        <button className="refresh-btn" onClick={fetchHistory}>
          <span>↻</span> Refresh
        </button>
      </div>

      {metrics && (
        <div className="accuracy-metrics">
          <div className="metric-grid">
            <div className="metric-item">
              <div className="metric-label">Hit Rate</div>
              <div className={`metric-value ${metrics.hitRate >= 70 ? "high" : metrics.hitRate >= 60 ? "medium" : "low"}`}>
                {metrics.hitRate}%
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Evaluated</div>
              <div className="metric-value">
                {metrics.evaluatedPredictions}/{metrics.totalPredictions}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">MAE</div>
              <div className="metric-value">${metrics.mae}</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">MAPE</div>
              <div className="metric-value">{metrics.mape}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="predictions-list">
        <h4>Recent Forecasts</h4>
        <div className="predictions-table">
          <div className="table-header">
            <div>Time</div>
            <div>Forecast</div>
            <div>Actual</div>
            <div>Direction</div>
            <div>Hit</div>
            <div>Confidence</div>
          </div>
          {history.slice(-10).reverse().map((pred, idx) => (
            <div key={idx} className="table-row">
              <div className="time-cell">
                {pred.createdAt
                  ? new Date(pred.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "--"}
              </div>
              <div className="price-cell">${Number(pred.predictedPrice || 0).toFixed(2)}</div>
              <div className="price-cell">
                {pred.actualPrice ? `$${Number(pred.actualPrice).toFixed(2)}` : "--"}
              </div>
              <div className={`direction-cell ${pred.direction ? pred.direction.toLowerCase() : ""}`}>
                {pred.direction === "UP" ? "↑" : pred.direction === "DOWN" ? "↓" : "→"} {pred.direction || "--"}
              </div>
              <div className={`signal-cell ${pred.hit === true ? "hit" : pred.hit === false ? "miss" : ""}`}>
                {pred.hit === true ? "Hit" : pred.hit === false ? "Miss" : "--"}
              </div>
              <div className="confidence-cell">
                {pred.confidence != null ? `${pred.confidence}%` : "--"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .prediction-history-card {
          background: rgba(22, 27, 34, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 14px;
          padding: 22px;
          border: 1px solid rgba(48, 54, 61, 0.8);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .history-header h3 {
          font-size: 1.15rem;
          color: #e6edf3;
          font-weight: 700;
          margin: 0;
        }

        .refresh-btn {
          background: rgba(48, 54, 61, 0.5);
          color: #e6edf3;
          border: 1px solid rgba(88, 166, 255, 0.2);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover {
          background: rgba(48, 54, 61, 0.8);
          border-color: rgba(88, 166, 255, 0.4);
        }

        .accuracy-metrics {
          background: rgba(13, 17, 23, 0.6);
          border-radius: 10px;
          padding: 18px;
          margin-bottom: 24px;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .metric-item {
          text-align: center;
        }

        .metric-label {
          font-size: 0.85rem;
          color: rgba(230, 237, 243, 0.7);
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #58a6ff;
        }

        .metric-value.high {
          color: #3fb950;
        }

        .metric-value.medium {
          color: #f0883e;
        }

        .metric-value.low {
          color: #f85149;
        }

        .predictions-list h4 {
          font-size: 1rem;
          color: #e6edf3;
          margin-bottom: 14px;
        }

        .predictions-table {
          overflow-x: auto;
        }

        .table-header,
        .table-row {
          display: grid;
          grid-template-columns: 140px 80px 80px 100px 90px 90px;
          gap: 12px;
          padding: 10px;
          font-size: 0.85rem;
        }

        .table-header {
          background: rgba(48, 54, 61, 0.4);
          border-radius: 8px;
          font-weight: 600;
          color: rgba(230, 237, 243, 0.8);
          margin-bottom: 8px;
        }

        .table-row {
          background: rgba(13, 17, 23, 0.4);
          border-radius: 8px;
          margin-bottom: 6px;
          align-items: center;
          transition: all 0.2s ease;
        }

        .table-row:hover {
          background: rgba(48, 54, 61, 0.3);
        }

        .time-cell {
          color: rgba(230, 237, 243, 0.7);
        }

        .price-cell {
          color: #e6edf3;
          font-weight: 600;
        }

        .direction-cell {
          font-weight: 600;
        }

        .direction-cell.up {
          color: #3fb950;
        }

        .direction-cell.down {
          color: #f85149;
        }

        .direction-cell.neutral {
          color: #f0883e;
        }

        .signal-cell {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
        }

        .signal-cell.hit {
          background: rgba(63, 185, 80, 0.2);
          color: #3fb950;
          border: 1px solid rgba(63, 185, 80, 0.3);
        }

        .signal-cell.miss {
          background: rgba(248, 81, 73, 0.15);
          color: #ff7b72;
          border: 1px solid rgba(248, 81, 73, 0.2);
        }

        .confidence-cell {
          color: #58a6ff;
          font-weight: 600;
        }

        .loading-spinner,
        .error-message,
        .no-data {
          text-align: center;
          padding: 40px;
          color: rgba(230, 237, 243, 0.6);
        }

        .error-message {
          color: #f85149;
        }

        @media (max-width: 768px) {
          .metric-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .table-header,
          .table-row {
            grid-template-columns: 100px 70px 70px 80px 80px 80px;
            gap: 8px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PredictionHistory;
