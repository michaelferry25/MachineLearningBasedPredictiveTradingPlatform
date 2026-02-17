import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CARD = {
  background: "rgba(22, 27, 34, 0.8)",
  backdropFilter: "blur(10px)",
  borderRadius: 14,
  padding: 22,
  border: "1px solid rgba(48, 54, 61, 0.8)",
  boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
};

export default function FeatureImportanceChart({ featureImportance }) {
  if (!featureImportance || featureImportance.length === 0) return null;

  const sorted = [...featureImportance]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15);

  const data = {
    labels: sorted.map((f) => f.feature),
    datasets: [
      {
        label: "Importance",
        data: sorted.map((f) => f.importance),
        backgroundColor: sorted.map(
          (_, i) => `rgba(88, 166, 255, ${1 - i * 0.04})`
        ),
        borderColor: "#58a6ff",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: "y",
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
          label: (ctx) => `Importance: ${(ctx.parsed.x * 100).toFixed(2)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(48, 54, 61, 0.3)" },
        ticks: {
          color: "#8b949e",
          callback: (v) => (v * 100).toFixed(0) + "%",
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#e6edf3", font: { size: 11 } },
      },
    },
  };

  return (
    <div style={CARD}>
      <h4 style={{ color: "#e6edf3", margin: "0 0 16px 0", fontSize: "1rem" }}>
        Feature Importance (Random Forest)
      </h4>
      <div style={{ height: 420 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
