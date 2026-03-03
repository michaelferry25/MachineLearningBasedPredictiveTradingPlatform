import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const CARD = {
  background: "rgba(22, 27, 34, 0.8)",
  backdropFilter: "blur(10px)",
  borderRadius: 14,
  padding: 22,
  border: "1px solid rgba(48, 54, 61, 0.8)",
  boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
};

export default function PredictedVsActualChart({ backtest }) {
  if (!backtest?.dates || backtest.dates.length === 0) return null;

  const labels = backtest.dates.map((d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const data = {
    labels,
    datasets: [
      {
        label: "Actual Price",
        data: backtest.actual,
        borderColor: "#58a6ff",
        backgroundColor: "rgba(88, 166, 255, 0.08)",
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: "Predicted Price",
        data: backtest.predicted,
        borderColor: "#f0883e",
        backgroundColor: "transparent",
        borderDash: [4, 4],
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#e6edf3", font: { size: 11 }, usePointStyle: true, padding: 12 },
      },
      tooltip: {
        backgroundColor: "rgba(22, 27, 34, 0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        borderColor: "#30363d",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(48, 54, 61, 0.2)" },
        ticks: { color: "#8b949e", maxRotation: 0, autoSkipPadding: 30, font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(48, 54, 61, 0.3)" },
        ticks: {
          color: "#8b949e",
          callback: (v) => "$" + v.toFixed(0),
        },
      },
    },
  };

  // Quick error stats
  const errors = backtest.actual.map((a, i) => Math.abs(a - backtest.predicted[i]));
  const mae = errors.reduce((s, e) => s + e, 0) / errors.length;
  const mape =
    backtest.actual.reduce((s, a, i) => s + Math.abs((a - backtest.predicted[i]) / a), 0) /
    backtest.actual.length *
    100;

  return (
    <div style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ color: "#e6edf3", margin: 0, fontSize: "1rem" }}>
          Backtest: Predicted vs Actual
        </h4>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ color: "#8b949e", fontSize: "0.85rem" }}>
            MAE: <strong style={{ color: "#58a6ff" }}>${mae.toFixed(2)}</strong>
          </span>
          <span style={{ color: "#8b949e", fontSize: "0.85rem" }}>
            MAPE: <strong style={{ color: "#58a6ff" }}>{mape.toFixed(2)}%</strong>
          </span>
          <span style={{ color: "#8b949e", fontSize: "0.85rem" }}>
            Samples: <strong style={{ color: "#58a6ff" }}>{backtest.actual.length}</strong>
          </span>
        </div>
      </div>
      <div style={{ height: 300 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
