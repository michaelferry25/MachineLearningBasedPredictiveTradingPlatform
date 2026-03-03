import { useState, useEffect, useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import EquityCurve from "./EquityCurve";
import TradeHistory from "./TradeHistory";
import "./PortfolioPage.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const COLORS = [
  "#58a6ff", "#3fb950", "#f0883e", "#ff7b72",
  "#a371f7", "#56d364", "#ffa657", "#d2a8ff"
];

export default function PortfolioPage({ portfolio, onRefresh, authToken }) {
  const [performance, setPerformance] = useState(null);

  const positions = portfolio?.positions || [];
  const cashBalance = portfolio?.cashBalance || 0;
  const holdingsValue = portfolio?.holdingsValue || 0;
  const totalValue = portfolio?.totalValue || 0;

  useEffect(() => {
    if (!authToken) return;
    fetch(`${API_URL}/api/trading/performance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setPerformance(data))
      .catch(() => {});
  }, [authToken, portfolio]);

  const totalReturn = performance?.totalReturn ?? 0;
  const totalPnlDollar = totalValue - 100000;
  const tradeCount = performance?.tradeCount ?? portfolio?.tradeCount ?? 0;

  const cashRatio = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0;
  const exposureRatio = totalValue > 0 ? (holdingsValue / totalValue) * 100 : 0;

  const topPosition = useMemo(() => {
    if (!positions.length) return null;
    return positions.reduce((max, c) => (c.value > max.value ? c : max), positions[0]);
  }, [positions]);

  const concentration = holdingsValue > 0 && topPosition ? (topPosition.value / holdingsValue) * 100 : 0;
  const diversificationScore = Math.max(0, Math.min(100, 100 - concentration));

  /* ── Allocation doughnut ── */
  const allocationData = useMemo(() => {
    if (!positions.length && cashBalance <= 0) return null;
    const labels = positions.map((p) => p.symbol).concat("Cash");
    const values = positions.map((p) => p.value || 0).concat(cashBalance);
    const colors = positions.map((_, i) => COLORS[i % COLORS.length]).concat("#484f58");
    return {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderColor: "rgba(13,17,23,0.6)", borderWidth: 2, hoverOffset: 6 }]
    };
  }, [positions, cashBalance]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { position: "bottom", labels: { color: "#c9d1d9", font: { size: 11 }, padding: 14, usePointStyle: true, pointStyleWidth: 8 } },
      tooltip: {
        backgroundColor: "rgba(22,27,34,0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        borderColor: "#30363d",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.label}: $${ctx.parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    }
  };

  const returnColor = totalReturn >= 0 ? "#3fb950" : "#ff7b72";
  const pnlSign = totalPnlDollar >= 0 ? "+" : "";

  /* ── Sort positions by value descending ── */
  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => (b.value || 0) - (a.value || 0)),
    [positions]
  );

  const hasEquityData = (performance?.equityCurve || []).length > 0;

  return (
    <section className="section-wrapper portfolio-page" id="portfolio">
      <div className="portfolio-header">
        <div>
          <span className="section-kicker">Portfolio</span>
          <h2>Portfolio Command Centre</h2>
          <p>Track balance, allocation, and exposure in real time.</p>
        </div>
        <button className="btn secondary" onClick={() => onRefresh && onRefresh()} type="button">
          Refresh
        </button>
      </div>

      {/* ── Metric Cards ── */}
      <div className="portfolio-summary-grid">
        <div className="portfolio-metric-card highlight">
          <span>Total Value</span>
          <strong>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <small style={{ color: returnColor }}>
            {pnlSign}${Math.abs(totalPnlDollar).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pnlSign}{totalReturn.toFixed(2)}%)
          </small>
        </div>
        <div className="portfolio-metric-card">
          <span>Cash Balance</span>
          <strong>${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <small>{cashRatio.toFixed(1)}% of portfolio</small>
        </div>
        <div className="portfolio-metric-card">
          <span>Exposure</span>
          <strong>{exposureRatio.toFixed(1)}%</strong>
          <small>${holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} invested</small>
        </div>
        <div className="portfolio-metric-card">
          <span>Positions</span>
          <strong>{positions.length}</strong>
          <small>Diversification {diversificationScore.toFixed(0)}/100</small>
        </div>
        <div className="portfolio-metric-card">
          <span>Trades</span>
          <strong>{tradeCount}</strong>
          <small>Total executed</small>
        </div>
      </div>

      {/* ── Equity Curve (TradingView lightweight-charts) ── */}
      {hasEquityData ? (
        <EquityCurve
          equityCurve={performance.equityCurve}
          totalValue={totalValue}
          totalReturn={totalReturn}
        />
      ) : (
        <div className="equity-curve-card equity-curve-empty">
          <h3>Equity Curve</h3>
          <p>Place some trades to see your portfolio value over time</p>
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="portfolio-charts-row">
        <div className="portfolio-card">
          <h3>Asset Allocation</h3>
          <div className="portfolio-chart-container">
            {allocationData ? (
              <Doughnut data={allocationData} options={doughnutOptions} />
            ) : (
              <div className="chart-empty">No holdings yet</div>
            )}
          </div>
        </div>

        {/* ── Holdings Table ── */}
        <div className="portfolio-card holdings-card">
          <div className="holdings-header">
            <h3>Holdings</h3>
            <span className="holdings-count">{positions.length} positions</span>
          </div>
          {sortedPositions.length ? (
            <div className="holdings-table">
              <div className="holdings-row header-row">
                <span>Symbol</span>
                <span>Shares</span>
                <span>Avg Cost</span>
                <span>Price</span>
                <span>Value</span>
                <span>P&L</span>
              </div>
              {sortedPositions.map((pos) => {
                const pnl = pos.pnl ?? 0;
                const pnlPct = pos.avgPrice > 0 ? ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;
                const pnlColor = pnl >= 0 ? "#3fb950" : "#ff7b72";
                return (
                  <div key={pos.symbol} className="holdings-row">
                    <span className="holdings-symbol">{pos.symbol}</span>
                    <span>{pos.quantity}</span>
                    <span>${pos.avgPrice?.toFixed(2) ?? "--"}</span>
                    <span>${pos.currentPrice?.toFixed(2)}</span>
                    <span>${pos.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span style={{ color: pnlColor }}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      <small className="pnl-pct"> ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)</small>
                    </span>
                  </div>
                );
              })}
              <div className="holdings-row totals-row">
                <span>Total</span>
                <span></span>
                <span></span>
                <span></span>
                <span>${holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span style={{ color: returnColor }}>
                  {pnlSign}${Math.abs(totalPnlDollar).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : (
            <div className="chart-empty">No positions — start trading to build your portfolio</div>
          )}
        </div>
      </div>

      {/* ── Trade History ── */}
      <TradeHistory authToken={authToken} />
    </section>
  );
}
