import { useState, useEffect } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from "chart.js";

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler, ArcElement);

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function normalizeSignal(raw) {
  const map = { "STRONG BUY": "Strong Buy", "BUY": "Buy", "HOLD": "Hold", "SELL": "Sell", "STRONG SELL": "Strong Sell" };
  return map[(raw || "").toUpperCase()] || "Hold";
}

const SIGNAL_COLORS = {
  "Strong Buy": "#3fb950",
  "Buy": "#58a6ff",
  "Hold": "#f0883e",
  "Sell": "#f85149",
  "Strong Sell": "#9b59b6"
};

export default function AnalyticsHub({ authToken }) {
  const [scanData, setScanData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const promises = [
          fetch(`${API}/api/ml/scan`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API}/api/ml/metrics`).then(r => r.ok ? r.json() : null).catch(() => null),
        ];
        if (authToken) {
          promises.push(
            fetch(`${API}/api/trading/performance`, {
              headers: { Authorization: `Bearer ${authToken}` }
            }).then(r => r.ok ? r.json() : null).catch(() => null)
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        const [scanRes, metricsRes, perfRes] = await Promise.allSettled(promises);
        if (scanRes.status === "fulfilled" && scanRes.value?.predictions) setScanData(scanRes.value.predictions);
        if (metricsRes.status === "fulfilled" && metricsRes.value && !metricsRes.value.error) setMetrics(metricsRes.value);
        if (perfRes.status === "fulfilled" && perfRes.value) setPerformance(perfRes.value);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchData();
  }, [authToken]);

  // --- Derived data ---
  const confidenceData = scanData ? {
    labels: scanData.map(p => p.symbol),
    datasets: [{
      label: "AI Confidence %",
      data: scanData.map(p => Number(p.confidence) || 0),
      borderColor: "#58a6ff",
      backgroundColor: "rgba(88, 166, 255, 0.15)",
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: "#58a6ff",
      borderWidth: 2
    }]
  } : null;

  const changeData = scanData ? {
    labels: scanData.map(p => p.symbol),
    datasets: [{
      label: "Predicted Change %",
      data: scanData.map(p => {
        const cur = Number(p.current_price) || 1;
        const pred = Number(p.prediction) || cur;
        return ((pred - cur) / cur * 100);
      }),
      backgroundColor: scanData.map(p => {
        const cur = Number(p.current_price) || 1;
        const pred = Number(p.prediction) || cur;
        return pred >= cur ? "rgba(63, 185, 80, 0.6)" : "rgba(255, 123, 114, 0.6)";
      }),
      borderRadius: 8
    }]
  } : null;

  const signalCounts = scanData ? (() => {
    const counts = { "Strong Buy": 0, "Buy": 0, "Hold": 0, "Sell": 0, "Strong Sell": 0 };
    scanData.forEach(p => { counts[normalizeSignal(p.signal)]++; });
    return Object.entries(counts).filter(([, v]) => v > 0);
  })() : [];

  const signalDoughnut = signalCounts.length > 0 ? {
    labels: signalCounts.map(([k]) => k),
    datasets: [{
      data: signalCounts.map(([, v]) => v),
      backgroundColor: signalCounts.map(([k]) => SIGNAL_COLORS[k]),
      borderWidth: 0
    }]
  } : null;

  // Metric calculations
  const bullishCount = scanData ? scanData.filter(p => ["BUY", "STRONG BUY"].includes((p.signal || "").toUpperCase())).length : 0;
  const totalStocks = scanData ? scanData.length : 0;
  const avgConfidence = scanData ? (scanData.reduce((s, p) => s + (Number(p.confidence) || 0), 0) / scanData.length).toFixed(1) : 0;

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(22, 27, 34, 0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        borderColor: "#30363d",
        borderWidth: 1,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(48, 54, 61, 0.25)", drawBorder: false },
        ticks: { color: "#8b949e", font: { size: 11 } }
      },
      y: {
        grid: { color: "rgba(48, 54, 61, 0.25)", drawBorder: false },
        ticks: { color: "#8b949e", font: { size: 11 } }
      }
    }
  };

  if (loading) {
    return (
      <section className="section-wrapper section-alt" id="analytics">
        <div className="section-header">
          <span className="section-kicker">Analytics</span>
          <h2>Your AI Market Overview</h2>
          <p>Analysing the market...</p>
        </div>
        <div className="analytics-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="analytics-card">
              <div className="card-header"><h3>Loading...</h3></div>
              <div className="chart-canvas" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#6e7681" }}>
                Fetching live data...
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!scanData) {
    return (
      <section className="section-wrapper section-alt" id="analytics">
        <div className="section-header">
          <span className="section-kicker">Analytics</span>
          <h2>Your AI Market Overview</h2>
          <p>Unable to load analytics right now. Make sure the ML service is running and try again.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-wrapper section-alt" id="analytics">
      <div className="section-header">
        <span className="section-kicker">Analytics</span>
        <h2>Your AI Market Overview</h2>
        <p>See what our AI thinks about the market right now — all explained in plain English.</p>
      </div>

      <div className="analytics-grid">
        {/* Chart 1: Confidence */}
        <div className="analytics-card">
          <div className="card-header">
            <h3>How Confident is the AI?</h3>
            <span className="card-chip">Live</span>
          </div>
          <div className="chart-canvas">
            {confidenceData && <Line data={confidenceData} options={{
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: { ...commonOptions.scales.y, min: 0, max: 100, ticks: { ...commonOptions.scales.y.ticks, stepSize: 20 } }
              }
            }} />}
          </div>
          <p className="chart-explainer">
            This shows how sure our AI is about each stock. Higher means more confident. Above 70% is considered strong.
          </p>
        </div>

        {/* Chart 2: Predicted Change */}
        <div className="analytics-card">
          <div className="card-header">
            <h3>What Does the AI Predict?</h3>
            <span className="card-chip neutral">Next Day</span>
          </div>
          <div className="chart-canvas">
            {changeData && <Bar data={changeData} options={commonOptions} />}
          </div>
          <p className="chart-explainer">
            Green bars mean the AI thinks the price will go up. Red means it expects a drop. Taller bars = bigger predicted move.
          </p>
        </div>

        {/* Chart 3: Signal Distribution */}
        <div className="analytics-card">
          <div className="card-header">
            <h3>Market Signals at a Glance</h3>
            <span className="card-chip success">Signal</span>
          </div>
          <div className="chart-canvas donut">
            {signalDoughnut && <Doughnut data={signalDoughnut} options={{ plugins: { legend: { display: false } } }} />}
          </div>
          <div className="rotation-legend">
            {signalCounts.map(([label, count]) => (
              <span key={label}>
                <i className="dot" style={{ backgroundColor: SIGNAL_COLORS[label] }} />
                {label} ({count})
              </span>
            ))}
          </div>
          <p className="chart-explainer">
            This shows how many of the {totalStocks} tracked stocks fall into each category. More green = the market looks bullish.
          </p>
        </div>
      </div>

      <div className="analytics-metrics">
        <div className="metric-tile">
          <p className="metric-label">Bullish Stocks</p>
          <h4>{bullishCount} of {totalStocks}</h4>
          <span className={`metric-change ${bullishCount > totalStocks / 2 ? "positive" : bullishCount > totalStocks / 3 ? "neutral" : "negative"}`}>
            {bullishCount > totalStocks / 2
              ? "The AI sees more stocks going up than down"
              : bullishCount > 0
                ? "Mixed signals — some stocks look positive"
                : "The AI is mostly bearish right now"}
          </span>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Model Accuracy</p>
          <h4>{metrics?.hitRate != null ? `${metrics.hitRate}%` : "--"}</h4>
          <span className={`metric-change ${(metrics?.hitRate || 0) >= 60 ? "positive" : "neutral"}`}>
            {metrics?.evaluatedPredictions
              ? `How often the AI has been right (${metrics.evaluatedPredictions} predictions tested)`
              : "Not enough predictions tested yet"}
          </span>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Avg Confidence</p>
          <h4>{avgConfidence}%</h4>
          <span className={`metric-change ${avgConfidence >= 70 ? "positive" : avgConfidence >= 55 ? "neutral" : "negative"}`}>
            {avgConfidence >= 70
              ? "The AI is quite sure about its predictions overall"
              : avgConfidence >= 55
                ? "Moderate confidence — some uncertainty remains"
                : "Low confidence — take predictions with a grain of salt"}
          </span>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Your Return</p>
          <h4>{performance
            ? `${performance.totalReturn >= 0 ? "+" : ""}${Number(performance.totalReturn).toFixed(2)}%`
            : "Sign in"}</h4>
          <span className={`metric-change ${performance ? (performance.totalReturn >= 0 ? "positive" : "negative") : "neutral"}`}>
            {performance
              ? `Your portfolio's total gain/loss (${performance.tradeCount} trades)`
              : "Log in to track your portfolio performance"}
          </span>
        </div>
      </div>
    </section>
  );
}
