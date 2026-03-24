import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const ET_ZONE = "America/New_York";

const SOURCE_OPTIONS = [
  { key: "scheduler_daily_close", label: "Daily Close (Official)" },
  { key: "scheduler_hourly", label: "Hourly Drift" },
  { key: "all", label: "All Sources" },
];

const formatEt = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "--";
  return d.toLocaleString("en-US", {
    timeZone: ET_ZONE,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
};

const PredictionHistory = ({ symbol }) => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceFilter, setSourceFilter] = useState("scheduler_daily_close");

  useEffect(() => {
    if (symbol) {
      fetchHistory();
    }
  }, [symbol, sourceFilter]);

  const fetchHistory = async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        days: "365",
        includePending: "true",
      });
      if (sourceFilter !== "all") {
        params.set("source", sourceFilter);
      }

      const response = await fetch(`${API_URL}/api/ml/track-record/${symbol.toUpperCase()}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to fetch track record");
      }

      const points = Array.isArray(data.points) ? data.points : [];
      points.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setHistory(points);
      setStats(data.stats || null);
    } catch (err) {
      setError("Failed to fetch forecast history");
      setHistory([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (!symbol) return null;

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

  const hitRate = Number(stats?.hitRate || 0);
  const grade = stats?.reliabilityGrade || "--";
  const gradeColor = grade === "A" ? "#3fb950" : grade === "B" ? "#6dbb4f" : grade === "C" ? "#f0883e" : "#f85149";

  return (
    <div className="prediction-history-card">
      <div className="history-header">
        <h3>Forecast History - {symbol}</h3>
        <div className="history-actions">
          <div className="source-toggle">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`source-toggle-btn ${sourceFilter === opt.key ? "active" : ""}`}
                onClick={() => setSourceFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="grade-pill" style={{ borderColor: gradeColor, color: gradeColor }}>
            Reliability {grade}
          </span>
          <button className="refresh-btn" onClick={fetchHistory}>
            <span>↻</span> Refresh
          </button>
        </div>
      </div>

      {stats && (
        <div className="accuracy-metrics">
          <div className="metric-grid">
            <div className="metric-item">
              <div className="metric-label">Hit Rate</div>
              <div className={`metric-value ${hitRate >= 70 ? "high" : hitRate >= 55 ? "medium" : "low"}`}>
                {hitRate.toFixed(1)}%
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Evaluated</div>
              <div className="metric-value">
                {stats.evaluated}/{stats.total} ({stats.pending || 0} pending)
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">MAPE</div>
              <div className="metric-value">{Number(stats.mape || 0).toFixed(2)}%</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Reliability Score</div>
              <div className="metric-value">{Number(stats.reliabilityScore || 0).toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="predictions-list">
        <h4>Published Track Record</h4>
        <div className="predictions-table">
          <div className="table-header">
            <div>Time</div>
            <div>Forecast</div>
            <div>Actual</div>
            <div>Direction</div>
            <div>Result</div>
            <div>Confidence</div>
            <div>Error</div>
          </div>
          {history.slice(0, 12).map((pred) => {
            const status = String(pred.status || "pending").toLowerCase();
            const resultClass =
              status === "pending"
                ? "pending"
                : pred.hit === true
                  ? "hit"
                  : pred.hit === false
                    ? "miss"
                    : "pending";
            const resultText =
              status === "pending"
                ? "Pending"
                : pred.hit === true
                  ? "Hit"
                  : pred.hit === false
                    ? "Miss"
                    : "--";

            return (
              <div key={pred.id || `${pred.createdAt}-${pred.predictedPrice}`} className="table-row">
                <div className="time-cell">
                  {formatEt(pred.targetAt || pred.createdAt)}
                </div>
                <div className="price-cell">${Number(pred.predictedPrice || 0).toFixed(2)}</div>
                <div className="price-cell">
                  {pred.actualPrice != null ? `$${Number(pred.actualPrice).toFixed(2)}` : "--"}
                </div>
                <div className={`direction-cell ${pred.direction ? pred.direction.toLowerCase() : ""}`}>
                  {pred.direction === "UP" ? "↑" : pred.direction === "DOWN" ? "↓" : "→"} {pred.direction || "--"}
                </div>
                <div className={`signal-cell ${resultClass}`}>{resultText}</div>
                <div className="confidence-cell">
                  {pred.confidence != null ? `${Number(pred.confidence).toFixed(1)}%` : "--"}
                </div>
                <div className="confidence-cell">
                  {pred.percentError != null ? `${Number(pred.percentError).toFixed(2)}%` : "--"}
                </div>
              </div>
            );
          })}
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
          gap: 16px;
        }

        .history-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .source-toggle {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .source-toggle-btn {
          border: 1px solid rgba(88, 166, 255, 0.3);
          background: rgba(13, 17, 23, 0.45);
          color: rgba(230, 237, 243, 0.8);
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
        }

        .source-toggle-btn.active {
          border-color: rgba(88, 166, 255, 0.7);
          background: rgba(88, 166, 255, 0.2);
          color: #9ecbff;
        }

        .grade-pill {
          border: 1px solid;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 4px 10px;
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
          font-size: 1.4rem;
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
          grid-template-columns: 140px 80px 80px 90px 90px 90px 80px;
          gap: 12px;
          padding: 10px;
          font-size: 0.85rem;
          align-items: center;
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

        .signal-cell.pending {
          background: rgba(240, 136, 62, 0.18);
          color: #f0883e;
          border: 1px solid rgba(240, 136, 62, 0.25);
        }

        .confidence-cell {
          color: rgba(230, 237, 243, 0.8);
        }
      `}</style>
    </div>
  );
};

export default PredictionHistory;
