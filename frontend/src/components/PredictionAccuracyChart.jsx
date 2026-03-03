import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const ET_ZONE = "America/New_York";

const SOURCE_LABELS = {
  scheduler_daily_close: "Daily Close (Official)",
  scheduler_hourly: "Hourly Drift",
};

const SOURCE_COLORS = {
  scheduler_daily_close: "#22d3ee",
  scheduler_hourly: "#d946ef",
};

const sourceLabel = (source) =>
  SOURCE_LABELS[source] || String(source || "legacy_unknown").replaceAll("_", " ");

const formatEt = (value) => {
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

const formatEtAxis = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "--";
  return d.toLocaleString("en-US", {
    timeZone: ET_ZONE,
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const timelineTimestamp = (point) =>
  point?.targetAt || point?.issuedAt || point?.date || null;

export default function PredictionAccuracyChart({
  symbol,
  source = "scheduler_daily_close",
  title,
  days = 60,
  modelVersion,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    const params = new URLSearchParams({ days: String(days), source });
    if (modelVersion) {
      params.set("modelVersion", modelVersion);
    }

    setLoading(true);
    fetch(`${API_URL}/api/ml/accuracy/${symbol}?${params.toString()}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.predictions?.length) {
          setData(payload);
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol, source, days, modelVersion]);

  const predictions = useMemo(() => {
    if (!data?.predictions?.length) return [];
    const sorted = [...data.predictions].sort((a, b) => {
      const at = new Date(timelineTimestamp(a) || 0).getTime();
      const bt = new Date(timelineTimestamp(b) || 0).getTime();
      return at - bt;
    });
    return sorted.slice(-36);
  }, [data]);

  if (loading) {
    return (
      <div className="prediction-accuracy-chart">
        <p className="accuracy-loading">Loading {sourceLabel(source)} history...</p>
      </div>
    );
  }

  if (!predictions.length) {
    return (
      <div className="prediction-accuracy-chart">
        <div className="accuracy-header">
          <h4>{title || "Prediction Track Record"}</h4>
          <span className="accuracy-source-tag">{sourceLabel(source)}</span>
        </div>
        <p className="accuracy-empty">
          No evaluated records for this source yet.
        </p>
      </div>
    );
  }

  const stats = data.stats || {};
  const labels = predictions.map((p) => formatEtAxis(timelineTimestamp(p)));
  const times = predictions.map((p) => timelineTimestamp(p));
  const sourceColor = SOURCE_COLORS[source] || "#58a6ff";
  const hitRateColor =
    Number(stats.hitRate || 0) >= 70 ? "#3fb950" : Number(stats.hitRate || 0) >= 55 ? "#f0883e" : "#f85149";

  const chartData = {
    labels,
    datasets: [
      {
        label: "Actual Close",
        data: predictions.map((p) => p.actualPrice),
        borderColor: "#3fb950",
        backgroundColor: "rgba(63, 185, 80, 0.08)",
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 4,
        pointBackgroundColor: predictions.map((p) => (p.hit ? "#3fb950" : "#ff5f56")),
        pointBorderColor: predictions.map((p) => (p.hit ? "#3fb950" : "#ff5f56")),
      },
      {
        label: "Predicted Close",
        data: predictions.map((p) => p.predictedPrice),
        borderColor: sourceColor,
        borderWidth: 2,
        borderDash: [6, 3],
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: sourceColor,
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
          title: (context) => {
            const idx = context?.[0]?.dataIndex ?? 0;
            return `Target (ET): ${formatEt(times[idx])}`;
          },
          afterBody: (context) => {
            const idx = context?.[0]?.dataIndex ?? 0;
            const p = predictions[idx];
            const lines = [];
            lines.push(`Issued (ET): ${formatEt(p.issuedAt || p.date)}`);
            lines.push(`Source: ${sourceLabel(p.predictionSource || source)}`);
            if (p.modelVersion) lines.push(`Model: ${p.modelVersion}`);
            if (p.confidence != null) lines.push(`Confidence: ${Number(p.confidence).toFixed(1)}%`);
            if (p.percentError != null) lines.push(`Error: ${Number(p.percentError).toFixed(2)}%`);
            lines.push(p.hit ? "Result: HIT" : "Result: MISS");
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        grid: { color: "rgba(48, 54, 61, 0.35)" },
      },
      y: {
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          callback: (v) => "$" + Number(v).toFixed(0),
        },
        grid: { color: "rgba(48, 54, 61, 0.35)" },
      },
    },
  };

  return (
    <div className="prediction-accuracy-chart">
      <div className="accuracy-header">
        <h4>{title || "Prediction Track Record"}</h4>
        <div className="accuracy-stats">
          <span className="accuracy-source-tag">{sourceLabel(source)}</span>
          <span className="accuracy-badge" style={{ color: hitRateColor }}>
            {Number(stats.hitRate || 0).toFixed(0)}% hit rate
          </span>
          <span className="accuracy-count">
            {Number(stats.hits || 0)}/{Number(stats.total || 0)} correct
          </span>
          {Number(stats.avgError || 0) > 0 && (
            <span className="accuracy-error">
              avg error: {Number(stats.avgError).toFixed(2)}%
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
          <span className="legend-dot" style={{ background: "#ff5f56" }}></span> Miss
        </span>
        <span className="legend-item">
          <span className="legend-line" style={{ borderColor: sourceColor }}></span> Predicted
        </span>
      </div>
    </div>
  );
}
