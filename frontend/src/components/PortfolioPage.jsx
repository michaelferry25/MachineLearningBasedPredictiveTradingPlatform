import { useMemo } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const COLORS = [
  "#58a6ff",
  "#3fb950",
  "#f0883e",
  "#ff7b72",
  "#a371f7",
  "#56d364",
  "#ffa657",
  "#d2a8ff"
];

export default function PortfolioPage({ portfolio, onRefresh }) {
  const positions = portfolio?.positions || [];
  const cashBalance = portfolio?.cashBalance || 0;
  const holdingsValue = portfolio?.holdingsValue || 0;
  const totalValue = portfolio?.totalValue || 0;

  const topPosition = useMemo(() => {
    if (!positions.length) return null;
    return positions.reduce((max, current) => (current.value > max.value ? current : max), positions[0]);
  }, [positions]);

  const cashRatio = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0;
  const exposureRatio = totalValue > 0 ? (holdingsValue / totalValue) * 100 : 0;
  const concentration = holdingsValue > 0 && topPosition ? (topPosition.value / holdingsValue) * 100 : 0;
  const diversificationScore = Math.max(0, Math.min(100, 100 - concentration));

  const allocationData = useMemo(() => {
    if (!positions.length && cashBalance <= 0) {
      return null;
    }
    const labels = [];
    const values = [];
    const colors = [];

    positions.forEach((pos, idx) => {
      labels.push(pos.symbol);
      values.push(pos.value || 0);
      colors.push(COLORS[idx % COLORS.length]);
    });

    labels.push("Cash");
    values.push(cashBalance);
    colors.push("#8b949e");

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: "rgba(13, 17, 23, 0.6)",
          borderWidth: 2
        }
      ]
    };
  }, [positions, cashBalance]);

  const barData = useMemo(() => {
    if (!positions.length) return null;
    return {
      labels: positions.map((pos) => pos.symbol),
      datasets: [
        {
          label: "Position Value",
          data: positions.map((pos) => pos.value || 0),
          backgroundColor: positions.map((_, idx) => COLORS[idx % COLORS.length])
        }
      ]
    };
  }, [positions]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#c9d1d9",
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: "rgba(22, 27, 34, 0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        borderColor: "#30363d",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: "#8b949e" },
        grid: { color: "rgba(48, 54, 61, 0.25)" }
      },
      y: {
        ticks: {
          color: "#8b949e",
          callback: (value) => `$${value}`
        },
        grid: { color: "rgba(48, 54, 61, 0.25)" }
      }
    }
  };

  return (
    <section className="section-wrapper portfolio-page" id="portfolio">
      <div className="portfolio-header">
        <div>
          <span className="section-kicker">Portfolio</span>
          <h2>Portfolio command center</h2>
          <p>Track balance, allocation, and exposure in real time.</p>
        </div>
        <button className="btn secondary" onClick={() => onRefresh && onRefresh()} type="button">
          Refresh data
        </button>
      </div>

      <div className="portfolio-summary-grid">
        <div className="portfolio-metric-card">
          <span>Total value</span>
          <strong>${totalValue.toFixed(2)}</strong>
          <small>Cash ${cashBalance.toFixed(2)}</small>
        </div>
        <div className="portfolio-metric-card">
          <span>Exposure</span>
          <strong>{exposureRatio.toFixed(1)}%</strong>
          <small>Holdings ${holdingsValue.toFixed(2)}</small>
        </div>
        <div className="portfolio-metric-card">
          <span>Largest position</span>
          <strong>{topPosition ? topPosition.symbol : "--"}</strong>
          <small>{concentration.toFixed(1)}% of holdings</small>
        </div>
        <div className="portfolio-metric-card">
          <span>Diversification score</span>
          <strong>{diversificationScore.toFixed(0)}</strong>
          <small>{positions.length} open positions</small>
        </div>
      </div>

      <div className="portfolio-grid">
        <div className="portfolio-card">
          <h3>Asset allocation</h3>
          <div className="portfolio-chart">
            {allocationData ? (
              <Doughnut data={allocationData} options={chartOptions} />
            ) : (
              <div className="chart-empty">No holdings yet</div>
            )}
          </div>
        </div>
        <div className="portfolio-card">
          <h3>Position sizing</h3>
          <div className="portfolio-chart">
            {barData ? (
              <Bar data={barData} options={chartOptions} />
            ) : (
              <div className="chart-empty">Add positions to view sizing</div>
            )}
          </div>
        </div>
      </div>

      <div className="portfolio-table-card">
        <div className="portfolio-table-header">
          <h3>Holdings detail</h3>
          <span>{positions.length} active positions</span>
        </div>
        {positions.length ? (
          <div className="portfolio-table">
            <div className="portfolio-row header">
              <span>Symbol</span>
              <span>Shares</span>
              <span>Price</span>
              <span>Value</span>
            </div>
            {positions.map((pos) => (
              <div key={pos.symbol} className="portfolio-row">
                <span className="portfolio-symbol">{pos.symbol}</span>
                <span>{pos.quantity}</span>
                <span>${pos.currentPrice?.toFixed(2)}</span>
                <span>${pos.value?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="portfolio-empty">
            Build a watchlist, place a trade, and your holdings appear here.
          </div>
        )}
      </div>
    </section>
  );
}
