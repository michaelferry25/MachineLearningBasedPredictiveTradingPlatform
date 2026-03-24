import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

const API_URL = import.meta.env.VITE_API_URL || "";

const COLORS = [
  "#58a6ff", "#3fb950", "#f0883e", "#ff7b72",
  "#a371f7", "#56d364", "#ffa657", "#d2a8ff"
];

const REFRESH_INTERVAL_MS = 60000; // 60 seconds

export default function PortfolioPage({ portfolio, onRefresh, authToken }) {
  const [performance, setPerformance] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef(null);

  const positions = portfolio?.positions || [];
  const cashBalance = portfolio?.cashBalance || 0;
  const holdingsValue = portfolio?.holdingsValue || 0;
  const totalValue = portfolio?.totalValue || 0;

  // Fetch performance data
  const fetchPerformance = useCallback(() => {
    if (!authToken) return;
    fetch(`${API_URL}/api/trading/performance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setPerformance(data))
      .catch(() => {});
  }, [authToken]);

  // Fetch live prices for all held positions
  const fetchLivePrices = useCallback(async () => {
    if (!positions.length) return;
    const symbols = positions.map((p) => p.symbol);
    const prices = {};
    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`${API_URL}/api/price/${sym}`);
          const data = await res.json();
          if (data?.price) {
            prices[sym] = {
              price: data.price,
              change: data.change ?? 0,
              changePercent: data.changePercent ?? 0
            };
          }
        } catch {}
      })
    );
    setLivePrices(prices);
  }, [positions]);

  // Full refresh: portfolio + performance + live prices
  const doFullRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (onRefresh) await onRefresh();
    await Promise.all([fetchPerformance(), fetchLivePrices()]);
    setLastUpdated(new Date());
    setSecondsAgo(0);
    setIsRefreshing(false);
  }, [onRefresh, fetchPerformance, fetchLivePrices]);

  // Initial load
  useEffect(() => {
    fetchPerformance();
    fetchLivePrices();
    setLastUpdated(new Date());
  }, [authToken, portfolio]);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(doFullRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [doFullRefresh]);

  // Update "seconds ago" counter
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [lastUpdated]);

  // Calculate live total value using live prices
  const liveHoldingsValue = useMemo(() => {
    return positions.reduce((sum, pos) => {
      const livePrice = livePrices[pos.symbol]?.price ?? pos.currentPrice ?? 0;
      return sum + livePrice * (pos.quantity || 0);
    }, 0);
  }, [positions, livePrices]);

  const liveTotalValue = cashBalance + liveHoldingsValue;
  const totalReturn = performance?.totalReturn ?? ((liveTotalValue - 100000) / 100000) * 100;
  const totalPnlDollar = liveTotalValue - 100000;
  const tradeCount = performance?.tradeCount ?? portfolio?.tradeCount ?? 0;

  const cashRatio = liveTotalValue > 0 ? (cashBalance / liveTotalValue) * 100 : 0;
  const exposureRatio = liveTotalValue > 0 ? (liveHoldingsValue / liveTotalValue) * 100 : 0;

  const topPosition = useMemo(() => {
    if (!positions.length) return null;
    return positions.reduce((max, c) => {
      const val = (livePrices[c.symbol]?.price ?? c.currentPrice ?? 0) * (c.quantity || 0);
      const maxVal = (livePrices[max.symbol]?.price ?? max.currentPrice ?? 0) * (max.quantity || 0);
      return val > maxVal ? c : max;
    }, positions[0]);
  }, [positions, livePrices]);

  const topValue = topPosition ? (livePrices[topPosition.symbol]?.price ?? topPosition.currentPrice ?? 0) * (topPosition.quantity || 0) : 0;
  const concentration = liveHoldingsValue > 0 && topPosition ? (topValue / liveHoldingsValue) * 100 : 0;
  const diversificationScore = Math.max(0, Math.min(100, 100 - concentration));

  // Daily P&L estimate
  const dailyPnl = useMemo(() => {
    return positions.reduce((sum, pos) => {
      const lp = livePrices[pos.symbol];
      if (!lp) return sum;
      return sum + (lp.change * (pos.quantity || 0));
    }, 0);
  }, [positions, livePrices]);

  const dailyPnlPercent = liveTotalValue > 0 ? (dailyPnl / liveTotalValue) * 100 : 0;

  /* Allocation doughnut */
  const allocationData = useMemo(() => {
    if (!positions.length && cashBalance <= 0) return null;
    const labels = positions.map((p) => p.symbol).concat("Cash");
    const values = positions.map((p) => {
      const livePrice = livePrices[p.symbol]?.price ?? p.currentPrice ?? 0;
      return livePrice * (p.quantity || 0);
    }).concat(cashBalance);
    const colors = positions.map((_, i) => COLORS[i % COLORS.length]).concat("#484f58");
    return {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderColor: "rgba(13,17,23,0.6)", borderWidth: 2, hoverOffset: 6 }]
    };
  }, [positions, cashBalance, livePrices]);

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

  /* Sort positions by live value descending */
  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => {
      const aVal = (livePrices[a.symbol]?.price ?? a.currentPrice ?? 0) * (a.quantity || 0);
      const bVal = (livePrices[b.symbol]?.price ?? b.currentPrice ?? 0) * (b.quantity || 0);
      return bVal - aVal;
    }),
    [positions, livePrices]
  );

  const hasEquityData = (performance?.equityCurve || []).length > 0;

  const exportToCSV = () => {
    const rows = [["Symbol", "Shares", "Avg Cost", "Current Price", "Value", "P&L", "P&L %"]];
    sortedPositions.forEach((pos) => {
      const livePrice = livePrices[pos.symbol]?.price ?? pos.currentPrice ?? 0;
      const value = livePrice * (pos.quantity || 0);
      const pnl = value - (pos.avgPrice || 0) * (pos.quantity || 0);
      const pnlPct = pos.avgPrice > 0 ? ((livePrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;
      rows.push([
        pos.symbol,
        pos.quantity,
        pos.avgPrice?.toFixed(2) ?? "0",
        livePrice.toFixed(2),
        value.toFixed(2),
        pnl.toFixed(2),
        pnlPct.toFixed(2) + "%",
      ]);
    });
    rows.push([]);
    rows.push(["Cash Balance", cashBalance.toFixed(2)]);
    rows.push(["Total Value", liveTotalValue.toFixed(2)]);
    rows.push(["Total Return", totalReturn.toFixed(2) + "%"]);

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MarketMind_Portfolio_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSecondsAgo = () => {
    if (secondsAgo < 5) return "Just now";
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    return `${Math.floor(secondsAgo / 60)}m ago`;
  };

  return (
    <section className="section-wrapper portfolio-page" id="portfolio">
      <div className="portfolio-header">
        <div>
          <span className="section-kicker">Portfolio</span>
          <h2>Portfolio Command Centre</h2>
          <p>Live tracking with auto-refresh every 60 seconds.</p>
        </div>
        <div className="portfolio-header-actions">
          <div className="portfolio-live-indicator">
            <span className={`live-dot ${isRefreshing ? 'refreshing' : ''}`} />
            <span className="live-label">{isRefreshing ? 'Updating...' : formatSecondsAgo()}</span>
          </div>
          <button className="btn secondary" onClick={doFullRefresh} disabled={isRefreshing} type="button">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          {positions.length > 0 && (
            <button className="btn secondary export-btn" onClick={exportToCSV} type="button">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="portfolio-summary-grid">
        <div className="portfolio-metric-card highlight">
          <span>Total Value</span>
          <strong>${liveTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
          <small>${liveHoldingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} invested</small>
        </div>
        <div className="portfolio-metric-card">
          <span>Today&apos;s P&amp;L</span>
          <strong style={{ color: dailyPnl >= 0 ? '#3fb950' : '#ff7b72' }}>
            {dailyPnl >= 0 ? '+' : ''}${Math.abs(dailyPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
          <small style={{ color: dailyPnl >= 0 ? '#3fb950' : '#ff7b72' }}>
            {dailyPnlPercent >= 0 ? '+' : ''}{dailyPnlPercent.toFixed(2)}% today
          </small>
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

      {/* Equity Curve */}
      {hasEquityData ? (
        <EquityCurve
          equityCurve={performance.equityCurve}
          totalValue={liveTotalValue}
          totalReturn={totalReturn}
          isLive={true}
        />
      ) : (
        <div className="equity-curve-card equity-curve-empty">
          <h3>Equity Curve</h3>
          <p>Place some trades to see your portfolio value over time</p>
        </div>
      )}

      {/* Charts Row */}
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

        {/* Holdings Table */}
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
                const livePrice = livePrices[pos.symbol]?.price ?? pos.currentPrice ?? 0;
                const liveChange = livePrices[pos.symbol]?.changePercent ?? 0;
                const value = livePrice * (pos.quantity || 0);
                const pnl = value - (pos.avgPrice || 0) * (pos.quantity || 0);
                const pnlPct = pos.avgPrice > 0 ? ((livePrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;
                const pnlColor = pnl >= 0 ? "#3fb950" : "#ff7b72";
                return (
                  <div key={pos.symbol} className="holdings-row">
                    <span className="holdings-symbol">
                      {pos.symbol}
                      <small className="holdings-day-change" style={{ color: liveChange >= 0 ? '#3fb950' : '#ff7b72' }}>
                        {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(1)}%
                      </small>
                    </span>
                    <span>{pos.quantity}</span>
                    <span>${pos.avgPrice?.toFixed(2) ?? "--"}</span>
                    <span className="holdings-live-price">${livePrice.toFixed(2)}</span>
                    <span>${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <span>${liveHoldingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

      {/* Trade History */}
      <TradeHistory authToken={authToken} />
    </section>
  );
}
