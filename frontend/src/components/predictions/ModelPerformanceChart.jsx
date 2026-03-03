import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CARD = {
  background: "rgba(22, 27, 34, 0.8)",
  backdropFilter: "blur(10px)",
  borderRadius: 14,
  padding: 22,
  border: "1px solid rgba(48, 54, 61, 0.8)",
  boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
  marginBottom: 16,
};

const COLORS = {
  rf: "#58a6ff",
  gb: "#f0883e",
  xgb: "#bc8cff",
  ensemble: "#3fb950",
};

export default function ModelPerformanceChart({ detailedPrediction }) {
  if (!detailedPrediction?.model_comparison) return null;
  const { models, ensemble_prediction, current_price } = detailedPrediction.model_comparison;

  // --- Bar chart: prediction prices ---
  const barData = {
    labels: [...models.map((m) => m.name), "Ensemble"],
    datasets: [
      {
        label: "Predicted Price ($)",
        data: [...models.map((m) => m.prediction), ensemble_prediction],
        backgroundColor: [COLORS.rf, COLORS.gb, COLORS.xgb, COLORS.ensemble],
        borderColor: [COLORS.rf, COLORS.gb, COLORS.xgb, COLORS.ensemble],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
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
        callbacks: {
          label: (ctx) => `$${ctx.parsed.y.toFixed(2)}`,
          afterBody: () => `Current: $${current_price?.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#8b949e", font: { size: 11 } },
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

  // --- Doughnut chart: model weights ---
  const doughnutData = {
    labels: models.map((m) => m.name),
    datasets: [
      {
        data: models.map((m) => Math.round(m.weight * 1000) / 10),
        backgroundColor: [COLORS.rf, COLORS.gb, COLORS.xgb],
        borderColor: "rgba(22, 27, 34, 0.8)",
        borderWidth: 3,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#e6edf3", font: { size: 11 }, padding: 12, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(22, 27, 34, 0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}%` },
      },
    },
  };

  // --- R² horizontal bar ---
  const r2Data = {
    labels: models.map((m) => m.name),
    datasets: [
      {
        label: "R² Score",
        data: models.map((m) => m.r2),
        backgroundColor: models.map((m) =>
          m.r2 >= 0.9 ? "#3fb950" : m.r2 >= 0.7 ? "#f0883e" : "#f85149"
        ),
        borderRadius: 6,
      },
    ],
  };

  const r2Options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(22, 27, 34, 0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        callbacks: { label: (ctx) => `R²: ${ctx.parsed.x.toFixed(4)}` },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 1,
        grid: { color: "rgba(48, 54, 61, 0.3)" },
        ticks: { color: "#8b949e" },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#e6edf3", font: { size: 12 } },
      },
    },
  };

  return (
    <div>
      <div style={CARD}>
        <h4 style={{ color: "#e6edf3", margin: "0 0 16px 0", fontSize: "1rem" }}>
          Model Prediction Comparison
        </h4>
        <div style={{ height: 220 }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={CARD}>
          <h4 style={{ color: "#e6edf3", margin: "0 0 12px 0", fontSize: "0.95rem" }}>
            Ensemble Weights
          </h4>
          <div style={{ height: 200 }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        <div style={CARD}>
          <h4 style={{ color: "#e6edf3", margin: "0 0 12px 0", fontSize: "0.95rem" }}>
            R² Scores
          </h4>
          <div style={{ height: 200 }}>
            <Bar data={r2Data} options={r2Options} />
          </div>
        </div>
      </div>
    </div>
  );
}
