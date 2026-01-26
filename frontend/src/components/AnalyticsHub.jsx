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

export default function AnalyticsHub() {
  const liquidityData = {
    labels: ["09:30", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
    datasets: [
      {
        label: "Liquidity Score",
        data: [62, 74, 81, 68, 72, 85, 90, 78],
        borderColor: "#58a6ff",
        backgroundColor: "rgba(88, 166, 255, 0.15)",
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  };

  const flowData = {
    labels: ["Tech", "Energy", "Fin", "Health", "Ind", "Cons"],
    datasets: [
      {
        label: "Net Flow ($M)",
        data: [120, -30, 75, 40, 10, 65],
        backgroundColor: [
          "rgba(88, 166, 255, 0.6)",
          "rgba(255, 123, 114, 0.6)",
          "rgba(63, 185, 80, 0.6)",
          "rgba(255, 173, 66, 0.6)",
          "rgba(139, 148, 158, 0.6)",
          "rgba(99, 102, 241, 0.6)"
        ],
        borderRadius: 8
      }
    ]
  };

  const rotationData = {
    labels: ["Momentum", "Value", "Growth", "Defensive"],
    datasets: [
      {
        data: [38, 24, 22, 16],
        backgroundColor: ["#58a6ff", "#3fb950", "#f0883e", "#9b59b6"],
        borderWidth: 0
      }
    ]
  };

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

  return (
    <section className="section-wrapper section-alt" id="analytics">
      <div className="section-header">
        <span className="section-kicker">Analytics</span>
        <h2>Institutional-grade analytics built for momentum</h2>
        <p>Monitor liquidity, sector flows, and rotation signals with real-time visual intelligence.</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="card-header">
            <h3>Liquidity Pulse</h3>
            <span className="card-chip">Live</span>
          </div>
          <div className="chart-canvas">
            <Line data={liquidityData} options={commonOptions} />
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <h3>Sector Flow</h3>
            <span className="card-chip neutral">Intraday</span>
          </div>
          <div className="chart-canvas">
            <Bar data={flowData} options={commonOptions} />
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <h3>Style Rotation</h3>
            <span className="card-chip success">Signal</span>
          </div>
          <div className="chart-canvas donut">
            <Doughnut data={rotationData} options={{ plugins: { legend: { display: false } } }} />
          </div>
          <div className="rotation-legend">
            <span><i className="dot dot-blue" />Momentum</span>
            <span><i className="dot dot-green" />Value</span>
            <span><i className="dot dot-orange" />Growth</span>
            <span><i className="dot dot-purple" />Defensive</span>
          </div>
        </div>
      </div>

      <div className="analytics-metrics">
        <div className="metric-tile">
          <p className="metric-label">Market Breadth</p>
          <h4>72%</h4>
          <span className="metric-change positive">+4.1% vs yesterday</span>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Volatility Regime</p>
          <h4>Compression</h4>
          <span className="metric-change neutral">Low risk window</span>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Signal Confidence</p>
          <h4>88</h4>
          <span className="metric-change positive">High conviction</span>
        </div>
        <div className="metric-tile">
          <p className="metric-label">Institutional Flow</p>
          <h4>$1.2B</h4>
          <span className="metric-change positive">Net inflow</span>
        </div>
      </div>
    </section>
  );
}
