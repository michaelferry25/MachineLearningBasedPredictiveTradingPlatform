import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function PredictionAccuracyChart({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`${API_URL}/api/ml/accuracy/${symbol}?days=30`)
      .then((res) => res.json())
      .then((d) => {
        if (d.predictions && d.predictions.length > 0) setData(d);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="prediction-accuracy-chart">
        <p className="accuracy-loading">Loading accuracy data...</p>
      </div>
    );
  }

  if (!data || !data.predictions || data.predictions.length === 0) {
    return (
      <div className="prediction-accuracy-chart">
        <p className="accuracy-empty">No evaluated predictions yet. Accuracy data will appear once predictions are verified against actual prices.</p>
      </div>
    );
  }

  const predictions = data.predictions;
  const stats = data.stats;

  const labels = predictions.map((p) => {
    const d = new Date(p.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const hitRateColor =
    stats.hitRate >= 70 ? "#3fb950" : stats.hitRate >= 55 ? "#f0883e" : "#f85149";

  const chartData = {
    labels,
    datasets: [
      {
        label: "Actual Price",
        data: predictions.map((p) => p.actualPrice),
        borderColor: "#3fb950",
        backgroundColor: "rgba(63, 185, 80, 0.1)",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: predictions.map((p) =>
          p.hit ? 4 : 5
        ),
        pointBackgroundColor: predictions.map((p) =>
          p.hit ? "#3fb950" : "#f85149"
        ),
        pointBorderColor: predictions.map((p) =>
          p.hit ? "#3fb950" : "#f85149"
        ),
      },
      {
        label: "Predicted Price",
        data: predictions.map((p) => p.predictedPrice),
        borderColor: "#58a6ff",
        borderWidth: 2,
        borderDash: [6, 3],
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#58a6ff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#8b949e", font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            const idx = context[0].dataIndex;
            const p = predictions[idx];
            const lines = [];
            if (p.percentError != null) lines.push(`Error: ${p.percentError.toFixed(2)}%`);
            lines.push(p.hit ? "Direction: HIT" : "Direction: MISS");
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#8b949e", font: { size: 10 } },
        grid: { color: "rgba(48, 54, 61, 0.4)" },
      },
      y: {
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          callback: (v) => "$" + v.toFixed(0),
        },
        grid: { color: "rgba(48, 54, 61, 0.4)" },
      },
    },
  };

  return (
    <div className="prediction-accuracy-chart">
      <div className="accuracy-header">
        <h4>Prediction Track Record</h4>
        <div className="accuracy-stats">
          <span className="accuracy-badge" style={{ color: hitRateColor }}>
            {stats.hitRate.toFixed(0)}% hit rate
          </span>
          <span className="accuracy-count">
            {stats.hits}/{stats.total} correct
          </span>
          {stats.avgError > 0 && (
            <span className="accuracy-error">
              avg error: {stats.avgError.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <div className="accuracy-chart-container">
        <Line data={chartData} options={chartOptions} />
      </div>
      <div className="accuracy-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#3fb950" }}></span> Hit
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#f85149" }}></span> Miss
        </span>
        <span className="legend-item">
          <span className="legend-line" style={{ borderColor: "#58a6ff" }}></span> Predicted
        </span>
      </div>
    </div>
  );
}
