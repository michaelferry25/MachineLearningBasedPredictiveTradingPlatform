import { Line, Bar } from "react-chartjs-2";
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
} from "chart.js";

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const CARD = {
  background: "rgba(22, 27, 34, 0.8)",
  backdropFilter: "blur(10px)",
  borderRadius: 14,
  padding: 22,
  border: "1px solid rgba(48, 54, 61, 0.8)",
  boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
  marginBottom: 16,
};

const TOOLTIP = {
  backgroundColor: "rgba(22, 27, 34, 0.95)",
  titleColor: "#e6edf3",
  bodyColor: "#e6edf3",
  borderColor: "#30363d",
  borderWidth: 1,
};

function formatDates(dates) {
  return dates.map((d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
}

function baseOptions(yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#e6edf3", font: { size: 11 }, usePointStyle: true, padding: 10 },
      },
      tooltip: TOOLTIP,
    },
    scales: {
      x: {
        grid: { color: "rgba(48, 54, 61, 0.2)" },
        ticks: { color: "#8b949e", maxRotation: 0, autoSkipPadding: 30, font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(48, 54, 61, 0.3)" },
        ticks: { color: "#8b949e" },
        title: yLabel ? { display: true, text: yLabel, color: "#8b949e" } : undefined,
      },
    },
  };
}

function refLine(label, value, color, len) {
  return {
    label,
    data: Array(len).fill(value),
    borderColor: color,
    borderDash: [5, 5],
    borderWidth: 1,
    pointRadius: 0,
    pointHoverRadius: 0,
    fill: false,
  };
}

export default function TechnicalIndicatorCharts({ timeseries }) {
  if (!timeseries?.dates) return null;

  const labels = formatDates(timeseries.dates);
  const len = labels.length;

  // --- RSI ---
  const rsiData = {
    labels,
    datasets: [
      {
        label: "RSI",
        data: timeseries.rsi,
        borderColor: "#58a6ff",
        backgroundColor: "rgba(88, 166, 255, 0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
      refLine("Overbought (70)", 70, "#f85149", len),
      refLine("Oversold (30)", 30, "#3fb950", len),
    ],
  };

  const rsiOptions = {
    ...baseOptions("RSI"),
    scales: {
      ...baseOptions("RSI").scales,
      y: { ...baseOptions("RSI").scales.y, min: 0, max: 100 },
    },
  };

  // --- MACD ---
  const macdHistColors = timeseries.macd_hist.map((v) =>
    v >= 0 ? "rgba(63, 185, 80, 0.7)" : "rgba(248, 81, 73, 0.7)"
  );

  const macdData = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "MACD Histogram",
        data: timeseries.macd_hist,
        backgroundColor: macdHistColors,
        borderWidth: 0,
        order: 2,
      },
      {
        type: "line",
        label: "MACD",
        data: timeseries.macd,
        borderColor: "#58a6ff",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        order: 1,
      },
      {
        type: "line",
        label: "Signal",
        data: timeseries.macd_signal,
        borderColor: "#f0883e",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        order: 1,
      },
    ],
  };

  // --- Stochastic ---
  const stochData = {
    labels,
    datasets: [
      {
        label: "%K",
        data: timeseries.stoch_k,
        borderColor: "#58a6ff",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: "%D",
        data: timeseries.stoch_d,
        borderColor: "#f0883e",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      refLine("Overbought (80)", 80, "#f85149", len),
      refLine("Oversold (20)", 20, "#3fb950", len),
    ],
  };

  const stochOptions = {
    ...baseOptions("Stochastic"),
    scales: {
      ...baseOptions("Stochastic").scales,
      y: { ...baseOptions("Stochastic").scales.y, min: 0, max: 100 },
    },
  };

  return (
    <div>
      <div style={CARD}>
        <h4 style={{ color: "#e6edf3", margin: "0 0 12px 0", fontSize: "1rem" }}>
          RSI (14-Period)
        </h4>
        <div style={{ height: 220 }}>
          <Line data={rsiData} options={rsiOptions} />
        </div>
      </div>

      <div style={CARD}>
        <h4 style={{ color: "#e6edf3", margin: "0 0 12px 0", fontSize: "1rem" }}>
          MACD
        </h4>
        <div style={{ height: 220 }}>
          <Bar data={macdData} options={baseOptions()} />
        </div>
      </div>

      <div style={CARD}>
        <h4 style={{ color: "#e6edf3", margin: "0 0 12px 0", fontSize: "1rem" }}>
          Stochastic Oscillator
        </h4>
        <div style={{ height: 220 }}>
          <Line data={stochData} options={stochOptions} />
        </div>
      </div>
    </div>
  );
}
