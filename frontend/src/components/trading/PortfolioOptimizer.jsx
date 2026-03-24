import { useState, useMemo } from "react";
import { Scatter, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import "./PortfolioOptimizer.css";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, ArcElement);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const POPULAR = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX", "JPM", "V"];
const COLORS = ["#58a6ff", "#3fb950", "#f0883e", "#ff7b72", "#a371f7", "#56d364", "#ffa657", "#d2a8ff", "#79c0ff", "#f778ba"];

export default function PortfolioOptimizer({ authToken, onRefresh }) {
  const [selectedSymbols, setSelectedSymbols] = useState(["AAPL", "MSFT", "GOOGL", "AMZN"]);
  const [customTicker, setCustomTicker] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("optimal");

  // Execution State
  const [isApplying, setIsApplying] = useState(false);
  const [investAmount, setInvestAmount] = useState("10000");
  const [executionPrices, setExecutionPrices] = useState({});
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [executingTrades, setExecutingTrades] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);

  const toggleSymbol = (sym) => {
    setSelectedSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const addCustomTicker = () => {
    const sym = customTicker.trim().toUpperCase();
    if (sym && !selectedSymbols.includes(sym)) {
      setSelectedSymbols((prev) => [...prev, sym]);
    }
    setCustomTicker("");
  };

  const runOptimisation = async () => {
    if (selectedSymbols.length < 2) {
      setError("Select at least 2 stocks to optimise");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/ml/optimize-portfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: selectedSymbols, risk_free_rate: 0.05 }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || errData?.message || `Server returned ${res.status}. Ensure the backend and ML service are both running.`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Could not connect to the optimisation service. Please ensure the backend server (port 8080) and ML service (port 5001) are both running.");
    }
    setLoading(false);
  };

  // Efficient Frontier scatter chart data
  const frontierChartData = useMemo(() => {
    if (!result?.frontier?.length) return null;

    const frontierPoints = result.frontier.map((p) => ({
      x: p.volatility,
      y: p.return,
    }));

    // Individual stock points
    const stockPoints = result.symbols.map((sym) => ({
      x: result.individual[sym].annualVolatility,
      y: result.individual[sym].annualReturn,
    }));

    // Optimal point
    const optimalPoint = {
      x: result.optimal.volatility,
      y: result.optimal.expectedReturn,
    };

    // Min variance point
    const minVarPoint = {
      x: result.minVariance.volatility,
      y: result.minVariance.expectedReturn,
    };

    // Balanced point (optional if backend hasn't been updated)
    const balPoint = result.balanced ? {
      x: result.balanced.volatility,
      y: result.balanced.expectedReturn,
    } : null;

    return {
      datasets: [
        {
          label: "Efficient Frontier",
          data: frontierPoints,
          borderColor: "rgba(88, 166, 255, 0.6)",
          backgroundColor: "rgba(88, 166, 255, 0.1)",
          pointRadius: 2,
          pointHoverRadius: 4,
          showLine: true,
          tension: 0.3,
          borderWidth: 2,
          fill: false,
        },
        {
          label: "Individual Stocks",
          data: stockPoints,
          backgroundColor: result.symbols.map((_, i) => COLORS[i % COLORS.length]),
          pointRadius: 7,
          pointHoverRadius: 10,
          pointStyle: "circle",
        },
        {
          label: "Max Sharpe (Optimal)",
          data: [optimalPoint],
          backgroundColor: "#3fb950",
          borderColor: "#fff",
          borderWidth: 2,
          pointRadius: 12,
          pointHoverRadius: 14,
          pointStyle: "star",
        },
        {
          label: "Min Variance",
          data: [minVarPoint],
          backgroundColor: "#f0883e",
          borderColor: "#fff",
          borderWidth: 2,
          pointRadius: 10,
          pointHoverRadius: 12,
          pointStyle: "triangle",
        },
        ...(balPoint ? [{
          label: "Balanced",
          data: [balPoint],
          backgroundColor: "#a371f7",
          borderColor: "#fff",
          borderWidth: 2,
          pointRadius: 10,
          pointHoverRadius: 12,
          pointStyle: "rectRot",
        }] : []),
      ],
    };
  }, [result]);

  const frontierOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#c9d1d9", font: { size: 11 }, usePointStyle: true, padding: 16 },
      },
      tooltip: {
        backgroundColor: "rgba(22,27,34,0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        borderColor: "#30363d",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const ds = ctx.dataset;
            if (ds.label === "Individual Stocks") {
              return `${result.symbols[ctx.dataIndex]}: Return ${ctx.parsed.y.toFixed(1)}%, Risk ${ctx.parsed.x.toFixed(1)}%`;
            }
            return `Return: ${ctx.parsed.y.toFixed(1)}%, Risk: ${ctx.parsed.x.toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Annual Volatility (Risk) %", color: "#8b949e", font: { size: 12, weight: "bold" } },
        ticks: { color: "#8b949e" },
        grid: { color: "rgba(48,54,61,0.15)" },
      },
      y: {
        title: { display: true, text: "Expected Annual Return %", color: "#8b949e", font: { size: 12, weight: "bold" } },
        ticks: { color: "#8b949e" },
        grid: { color: "rgba(48,54,61,0.15)" },
      },
    },
  };

  // Allocation doughnut for active tab
  const activePortfolio = activeTab === "optimal" ? result?.optimal : activeTab === "balanced" ? result?.balanced : result?.minVariance;
  const allocationData = useMemo(() => {
    if (!activePortfolio?.weights) return null;
    const entries = Object.entries(activePortfolio.weights).filter(([, w]) => w > 0.001);
    entries.sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([s]) => s),
      datasets: [{
        data: entries.map(([, w]) => (w * 100).toFixed(1)),
        backgroundColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        borderColor: "rgba(13,17,23,0.6)",
        borderWidth: 2,
        hoverOffset: 6,
      }],
    };
  }, [activePortfolio]);

  const allocationOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(22,27,34,0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#e6edf3",
        callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}%` },
      },
    },
  };

  const activeWeights = activePortfolio?.weights ? Object.entries(activePortfolio.weights)
    .filter(([, w]) => w > 0.001)
    .sort((a, b) => b[1] - a[1]) : [];

  // Execution state machine: "idle" -> "review" -> "confirming" -> "executing" -> "done"
  const [execPhase, setExecPhase] = useState("idle");
  const [executionResults, setExecutionResults] = useState([]);

  const handleApplyClick = async () => {
    if (!authToken) {
      setError("Please sign in to execute portfolio trades.");
      return;
    }
    setIsApplying(true);
    setFetchingPrices(true);
    setExecutionLogs([]);
    setExecutionResults([]);
    setExecPhase("review");
    
    // Fetch ALL prices in parallel for speed
    const prices = {};
    try {
      const pricePromises = activeWeights.map(async ([sym]) => {
        const res = await fetch(`${API_URL}/api/price/${sym}`);
        const data = await res.json();
        return { sym, price: data.price || null };
      });
      const results = await Promise.all(pricePromises);
      results.forEach(({ sym, price }) => { if (price) prices[sym] = price; });
      setExecutionPrices(prices);
    } catch (err) {
      setError("Failed to fetch live prices for execution.");
    }
    setFetchingPrices(false);
  };

  const confirmExecution = () => {
    setExecPhase("confirming");
  };

  const executeTrades = async () => {
    if (!authToken) return;
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) return;

    setExecPhase("executing");
    setExecutingTrades(true);
    setExecutionLogs(["Executing all orders in parallel..."]);

    // Fire ALL trades in parallel for speed
    const tradePromises = activeWeights.map(async ([sym, weight]) => {
      const price = executionPrices[sym];
      if (!price) return { sym, ok: false, error: "No price data" };

      const dollarAlloc = amount * weight;
      const shares = parseFloat((dollarAlloc / price).toFixed(6));

      try {
        const res = await fetch(`${API_URL}/api/trading/buy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ symbol: sym, quantity: shares })
        });
        const data = await res.json();
        return { sym, ok: data.success, shares, price, dollarAlloc, error: data.error };
      } catch (err) {
        return { sym, ok: false, shares, price, dollarAlloc, error: "Connection Error" };
      }
    });

    const results = await Promise.all(tradePromises);
    setExecutionResults(results);

    const successCount = results.filter(r => r.ok).length;
    const totalInvested = results.filter(r => r.ok).reduce((s, r) => s + (r.dollarAlloc || 0), 0);

    setExecutionLogs([
      `All ${results.length} orders submitted simultaneously.`,
      `${successCount}/${results.length} orders filled successfully.`,
      `Total deployed: $${totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
    ]);

    setExecutingTrades(false);
    setExecPhase("done");

    if (onRefresh && successCount > 0) {
      setTimeout(() => onRefresh(), 1000);
    }
  };

  return (
    <div className="portfolio-optimizer">
      <div className="optimizer-header">
        <div>
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a371f7" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
            </svg>
            Portfolio Optimiser
          </h3>
          <p>Markowitz mean-variance optimisation. Select stocks to find the optimal allocation.</p>
        </div>
      </div>

      {/* Stock Selector */}
      <div className="optimizer-selector">
        <div className="selector-popular">
          {POPULAR.map((sym) => (
            <button
              key={sym}
              className={`selector-chip ${selectedSymbols.includes(sym) ? "active" : ""}`}
              onClick={() => toggleSymbol(sym)}
            >
              {sym}
            </button>
          ))}
        </div>
        <div className="selector-custom">
          <input
            type="text"
            placeholder="Add ticker..."
            value={customTicker}
            onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addCustomTicker()}
          />
          <button className="btn small" onClick={addCustomTicker}>Add</button>
        </div>
        <div className="selector-selected">
          Selected: {selectedSymbols.map((sym) => (
            <span key={sym} className="selected-tag">
              {sym}
              <button onClick={() => toggleSymbol(sym)}>✕</button>
            </span>
          ))}
        </div>
      </div>

      <button
        className="btn optimize-btn"
        onClick={runOptimisation}
        disabled={loading || selectedSymbols.length < 2}
      >
        {loading ? (
          <>
            <span className="optimize-spinner" />
            Optimising...
          </>
        ) : (
          <>Optimise Portfolio</>
        )}
      </button>

      {error && <div className="optimizer-error">{error}</div>}

      {/* Results */}
      {result && (
        <div className="optimizer-results">
          {/* Efficient Frontier Chart */}
          <div className="optimizer-card frontier-card">
            <h4>Efficient Frontier</h4>
            <p className="card-subtitle">Risk vs. return tradeoff across all possible portfolio allocations</p>
            <div className="frontier-chart-container">
              {frontierChartData && <Scatter data={frontierChartData} options={frontierOptions} />}
            </div>
          </div>

          {/* Portfolio Tabs */}
          <div className="optimizer-card portfolio-detail-card">
            <div className="portfolio-tabs">
              <button
                className={`portfolio-tab ${activeTab === "optimal" ? "active" : ""}`}
                onClick={() => setActiveTab("optimal")}
              >
                Max Sharpe (Optimal)
              </button>
              {result.balanced && (
                <button
                  className={`portfolio-tab ${activeTab === "balanced" ? "active" : ""}`}
                  onClick={() => setActiveTab("balanced")}
                >
                  Balanced (Middle Tier)
                </button>
              )}
              <button
                className={`portfolio-tab ${activeTab === "minvar" ? "active" : ""}`}
                onClick={() => setActiveTab("minvar")}
              >
                Min Variance (Safest)
              </button>
            </div>

            <div className="portfolio-detail-grid">
              {/* Metrics */}
              <div className="detail-metrics">
                <div className="detail-metric">
                  <span className="detail-label">Expected Return</span>
                  <strong className="detail-value positive">
                    {activePortfolio?.expectedReturn?.toFixed(2)}%
                  </strong>
                </div>
                <div className="detail-metric">
                  <span className="detail-label">Volatility (Risk)</span>
                  <strong className="detail-value">
                    {activePortfolio?.volatility?.toFixed(2)}%
                  </strong>
                </div>
                <div className="detail-metric highlight">
                  <span className="detail-label">Sharpe Ratio</span>
                  <strong className="detail-value sharpe">
                    {activePortfolio?.sharpeRatio?.toFixed(3)}
                  </strong>
                </div>
                <div className="detail-metric">
                  <span className="detail-label">Risk Free Rate</span>
                  <strong className="detail-value">
                    {result.riskFreeRate?.toFixed(1)}%
                  </strong>
                </div>
              </div>

              {/* Allocation Doughnut */}
              <div className="detail-allocation">
                <h5>Recommended Allocation</h5>
                <div className="allocation-chart-wrap">
                  {allocationData && <Doughnut data={allocationData} options={allocationOptions} />}
                </div>
                <div className="allocation-legend">
                  {activePortfolio?.weights && Object.entries(activePortfolio.weights)
                    .filter(([, w]) => w > 0.001)
                    .sort((a, b) => b[1] - a[1])
                    .map(([sym, w], i) => (
                      <div key={sym} className="legend-item">
                        <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="legend-sym">{sym}</span>
                        <span className="legend-pct">{(w * 100).toFixed(1)}%</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Apply Action */}
            <div className="optimizer-apply-action">
              {!isApplying ? (
                <>
                  <p>Ready to deploy this strategy?</p>
                  <button className="btn apply-btn" onClick={handleApplyClick}>
                    Apply Target Allocation to Live Portfolio
                  </button>
                </>
              ) : (
                <div className="execution-panel">
                  {/* Phase: Review */}
                  {(execPhase === "review" || execPhase === "confirming") && (
                    <>
                      <div className="exec-header">
                        <h4>Order Preview</h4>
                        <span className="exec-badge">
                          {fetchingPrices ? "Loading..." : `${activeWeights.length} Orders`}
                        </span>
                      </div>
                      <div className="execution-controls">
                        <label>Total Investment ($)</label>
                        <input 
                          type="number" 
                          value={investAmount} 
                          onChange={(e) => setInvestAmount(e.target.value)}
                          disabled={execPhase === "confirming"}
                          min="100"
                        />
                      </div>
                      
                      <div className="execution-table">
                        <div className="exec-row header">
                          <span>Symbol</span>
                          <span>Target %</span>
                          <span>Alloc ($)</span>
                          <span>Price ($)</span>
                          <span>Est. Shares</span>
                        </div>
                        {fetchingPrices ? (
                          <div className="exec-loading">
                            <span className="optimize-spinner" /> Fetching live prices...
                          </div>
                        ) : (
                          activeWeights.map(([sym, w], i) => {
                            const price = executionPrices[sym];
                            const dollAlloc = parseFloat(investAmount || 0) * w;
                            const shs = price ? (dollAlloc / price).toFixed(5) : "---";
                            return (
                              <div key={sym} className="exec-row">
                                <span style={{color: COLORS[i % COLORS.length]}}><strong>{sym}</strong></span>
                                <span>{(w * 100).toFixed(1)}%</span>
                                <span>${dollAlloc.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                <span>{price ? `$${price.toFixed(2)}` : "Error"}</span>
                                <span>{shs}</span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {execPhase === "confirming" && (
                        <div className="confirm-card">
                          <div className="confirm-icon">⚠️</div>
                          <div className="confirm-text">
                            <strong>Confirm Execution</strong>
                            <p>You are about to buy {activeWeights.length} assets totalling <strong>${parseFloat(investAmount || 0).toLocaleString()}</strong>. This action will immediately execute market orders against your paper trading balance.</p>
                          </div>
                        </div>
                      )}

                      <div className="execution-actions">
                        <button className="btn cancel-btn" onClick={() => { setIsApplying(false); setExecPhase("idle"); setExecutionLogs([]); }}>Cancel</button>
                        {execPhase === "review" ? (
                          <button className="btn apply-btn" onClick={confirmExecution} disabled={fetchingPrices || !parseFloat(investAmount)}>
                            Review & Confirm
                          </button>
                        ) : (
                          <button className="btn execute-confirm-btn" onClick={executeTrades}>
                            Confirm & Execute All Orders
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* Phase: Executing */}
                  {execPhase === "executing" && (
                    <div className="executing-card">
                      <span className="optimize-spinner large" />
                      <h4>Executing {activeWeights.length} Orders...</h4>
                      <p>All trades are being submitted simultaneously for maximum speed.</p>
                    </div>
                  )}

                  {/* Phase: Done */}
                  {execPhase === "done" && (
                    <div className="execution-summary">
                      <div className="summary-header">
                        <div className="summary-icon">✅</div>
                        <div>
                          <h4>Execution Complete</h4>
                          <p>{executionResults.filter(r => r.ok).length}/{executionResults.length} orders filled</p>
                        </div>
                      </div>
                      <div className="summary-stats">
                        <div className="summary-stat">
                          <span className="stat-label">Total Deployed</span>
                          <span className="stat-value">${executionResults.filter(r => r.ok).reduce((s, r) => s + (r.dollarAlloc || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="summary-stat">
                          <span className="stat-label">Orders Filled</span>
                          <span className="stat-value">{executionResults.filter(r => r.ok).length}</span>
                        </div>
                        <div className="summary-stat">
                          <span className="stat-label">Failed</span>
                          <span className="stat-value" style={{color: executionResults.filter(r => !r.ok).length > 0 ? "#ff7b72" : "#3fb950"}}>{executionResults.filter(r => !r.ok).length}</span>
                        </div>
                      </div>
                      <div className="summary-results">
                        {executionResults.map((r, i) => (
                          <div key={i} className={`summary-result-row ${r.ok ? "success" : "failed"}`}>
                            <span className="result-status">{r.ok ? "✓" : "✗"}</span>
                            <span style={{color: COLORS[i % COLORS.length], fontWeight: 800}}>{r.sym}</span>
                            <span>{r.shares ? `${r.shares} shares` : "---"}</span>
                            <span>{r.price ? `@ $${r.price.toFixed(2)}` : ""}</span>
                            <span>{r.ok ? `$${(r.dollarAlloc || 0).toFixed(2)}` : r.error}</span>
                          </div>
                        ))}
                      </div>
                      <div className="execution-actions">
                        <button className="btn apply-btn" onClick={() => { setIsApplying(false); setExecPhase("idle"); setExecutionLogs([]); setExecutionResults([]); }}>
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Individual Stock Stats */}
          <div className="optimizer-card">
            <h4>Individual Stock Analysis</h4>
            <div className="stock-stats-table">
              <div className="stats-row header">
                <span>Symbol</span>
                <span>Annual Return</span>
                <span>Volatility</span>
                <span>Sharpe</span>
              </div>
              {result.symbols.map((sym, i) => {
                const stats = result.individual[sym];
                return (
                  <div key={sym} className="stats-row">
                    <span className="stats-symbol">
                      <span className="stats-dot" style={{ background: COLORS[i % COLORS.length] }} />
                      {sym}
                    </span>
                    <span style={{ color: stats.annualReturn >= 0 ? "#3fb950" : "#ff7b72" }}>
                      {stats.annualReturn >= 0 ? "+" : ""}{stats.annualReturn.toFixed(1)}%
                    </span>
                    <span>{stats.annualVolatility.toFixed(1)}%</span>
                    <span style={{ color: stats.sharpe >= 1 ? "#3fb950" : stats.sharpe >= 0.5 ? "#f0883e" : "#ff7b72" }}>
                      {stats.sharpe.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Correlation Matrix */}
          <div className="optimizer-card">
            <h4>Correlation Matrix</h4>
            <p className="card-subtitle">Lower correlation between assets means better diversification</p>
            <div className="correlation-matrix">
              <div className="corr-row corr-header">
                <span></span>
                {result.symbols.map((s) => <span key={s} className="corr-label">{s}</span>)}
              </div>
              {result.symbols.map((sym1) => (
                <div key={sym1} className="corr-row">
                  <span className="corr-label">{sym1}</span>
                  {result.symbols.map((sym2) => {
                    const val = result.correlation[sym1][sym2];
                    const intensity = Math.abs(val);
                    const bg = val === 1
                      ? "rgba(88,166,255,0.2)"
                      : val > 0.7
                      ? `rgba(255,123,114,${intensity * 0.3})`
                      : val > 0.3
                      ? `rgba(240,136,62,${intensity * 0.3})`
                      : `rgba(63,185,80,${intensity * 0.3})`;
                    return (
                      <span
                        key={`${sym1}-${sym2}`}
                        className="corr-cell"
                        style={{ background: bg }}
                        title={`${sym1} vs ${sym2}: ${val.toFixed(3)}`}
                      >
                        {val.toFixed(2)}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="optimizer-footnote">
            Based on {result.dataPoints} trading days of historical data. Risk free rate: {result.riskFreeRate}%.
            Past performance does not guarantee future results.
          </div>
        </div>
      )}
    </div>
  );
}
