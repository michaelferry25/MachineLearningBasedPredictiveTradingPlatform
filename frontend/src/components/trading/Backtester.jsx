import { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import "./Backtester.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Backtester() {
  const [symbol, setSymbol] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleRun = (ticker) => {
    const sym = (ticker || inputVal).trim().toUpperCase();
    if (!sym) return;
    setSymbol(sym);
    setInputVal(sym);
    runBacktest(sym);
  };

  const runBacktest = async (sym) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/ml/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, initial_capital: 100000 }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError("Failed to connect. Ensure the backend and ML service are both running.");
    }
    setLoading(false);
  };

  const chartData = useMemo(() => {
    if (!result) return null;
    return {
      labels: result.equityCurve.map((p) => p.date),
      datasets: [
        {
          label: "ML Strategy",
          data: result.equityCurve.map((p) => p.value),
          borderColor: "#a371f7",
          backgroundColor: "rgba(163, 113, 247, 0.06)",
          fill: true,
          pointRadius: 0,
          borderWidth: 2.2,
          tension: 0.35,
        },
        {
          label: "Buy & Hold Benchmark",
          data: result.benchmarkCurve.map((p) => p.value),
          borderColor: "#484f58",
          borderDash: [5, 3],
          pointRadius: 0,
          borderWidth: 1.5,
          tension: 0.35,
        },
      ],
    };
  }, [result]);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { color: "#8b949e", font: { size: 11 }, usePointStyle: true, padding: 20 } },
      tooltip: {
        backgroundColor: "rgba(13,17,23,0.96)",
        titleColor: "#e6edf3",
        bodyColor: "#c9d1d9",
        borderColor: "#30363d",
        borderWidth: 1,
        callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      },
    },
    scales: {
      x: { ticks: { color: "#6e7681", maxTicksLimit: 12, font: { size: 10 } }, grid: { color: "rgba(48,54,61,0.1)" } },
      y: { ticks: { color: "#6e7681", font: { size: 10 }, callback: (v) => "$" + v.toLocaleString() }, grid: { color: "rgba(48,54,61,0.1)" } },
    },
  };

  const m = result?.metrics;

  return (
    <div className="bt-page">
      {/* Header + Search */}
      <div className="bt-page-header">
        <div className="bt-header-left">
          <div className="bt-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#btG)" strokeWidth="2.5">
              <defs><linearGradient id="btG" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#58a6ff"/><stop offset="100%" stopColor="#a371f7"/></linearGradient></defs>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <h2>Backtester</h2>
            <p>Evaluate ML model performance against historical data with continuous retraining simulation.</p>
          </div>
        </div>

        <div className="bt-search-bar">
          <svg className="bt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e7681" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Enter stock ticker (e.g. AAPL, TSLA, NVDA)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
          />
          <button className="bt-search-btn" onClick={() => handleRun()} disabled={loading || !inputVal.trim()}>
            {loading ? <span className="bt-spinner" /> : "Run"}
          </button>
        </div>
      </div>

      {/* Quick picks */}
      {!result && !loading && (
        <div className="bt-quick-section">
          <span className="bt-quick-label">Popular</span>
          <div className="bt-quick-picks">
            {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM"].map((s) => (
              <button key={s} className="bt-quick" onClick={() => { setInputVal(s); handleRun(s); }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bt-loading">
          <div className="bt-loading-spinner" />
          <div>
            <strong>Running backtest on {symbol}...</strong>
            <p>Training ML models and simulating trades with periodic retraining. This may take up to 60 seconds.</p>
          </div>
        </div>
      )}

      {error && <div className="bt-error">{error}</div>}

      {/* Results */}
      {result && m && (
        <div className="bt-results">
          {/* Symbol Title */}
          <div className="bt-result-header">
            <h3>{result.symbol} Backtest Results</h3>
            <span className="bt-badge">{result.testPeriod?.start} — {result.testPeriod?.end}</span>
          </div>

          {/* Stats */}
          <div className="bt-stats">
            <div className={`bt-stat main ${m.alpha >= 0 ? "green" : "red"}`}>
              <span className="bt-stat-label">Alpha</span>
              <span className="bt-stat-val">{m.alpha >= 0 ? "+" : ""}{m.alpha}%</span>
              <span className="bt-stat-sub">vs Buy & Hold</span>
            </div>
            <div className={`bt-stat ${m.totalReturn >= 0 ? "green" : "red"}`}>
              <span className="bt-stat-label">Strategy Return</span>
              <span className="bt-stat-val">{m.totalReturn >= 0 ? "+" : ""}{m.totalReturn}%</span>
            </div>
            <div className={`bt-stat ${m.benchmarkReturn >= 0 ? "green" : "red"}`}>
              <span className="bt-stat-label">Benchmark</span>
              <span className="bt-stat-val">{m.benchmarkReturn >= 0 ? "+" : ""}{m.benchmarkReturn}%</span>
            </div>
            <div className="bt-stat">
              <span className="bt-stat-label">Sharpe Ratio</span>
              <span className="bt-stat-val purple">{m.sharpeRatio}</span>
            </div>
            <div className="bt-stat">
              <span className="bt-stat-label">Max Drawdown</span>
              <span className="bt-stat-val orange">-{m.maxDrawdown}%</span>
            </div>
            <div className="bt-stat">
              <span className="bt-stat-label">Win Rate</span>
              <span className="bt-stat-val">{m.winRate}%</span>
            </div>
          </div>

          {/* Chart */}
          <div className="bt-chart-card">
            <div className="bt-chart-header">
              <h4>Equity Curve</h4>
              <div className="bt-chart-meta">
                <span>{m.testDays} trading days</span>
                <span className="bt-divider">·</span>
                <span>{m.retrainCount} model retrains</span>
                <span className="bt-divider">·</span>
                <span>{m.totalTrades} trades</span>
              </div>
            </div>
            <div className="bt-chart">{chartData && <Line data={chartData} options={chartOpts} />}</div>
            <div className="bt-chart-footer">
              <span>$100,000 → <strong>${m.finalValue?.toLocaleString()}</strong></span>
              <span>{m.winningTrades}W / {m.losingTrades}L · Profit Factor {m.profitFactor}</span>
            </div>
          </div>

          {/* Trade Log */}
          <div className="bt-trades-card">
            <h4>Trade Log</h4>
            <div className="bt-trades">
              <div className="bt-row hdr">
                <span>Date</span><span>Action</span><span>Price</span><span>P&L</span>
              </div>
              {result.trades.map((t, i) => (
                <div key={i} className={`bt-row ${t.type.includes("SELL") ? (t.pnl >= 0 ? "win" : "loss") : "buy"}`}>
                  <span>{t.date}</span>
                  <span className="action">{t.type}</span>
                  <span>${t.price.toFixed(2)}</span>
                  <span className={t.pnl != null ? (t.pnl >= 0 ? "pos" : "neg") : ""}>
                    {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="bt-foot">
            Expanding-window simulation with {m.retrainCount} model retrains. RF + GB + XGB ensemble trained on all available data at each interval.
            Past simulated results do not guarantee future performance.
          </p>
        </div>
      )}
    </div>
  );
}
