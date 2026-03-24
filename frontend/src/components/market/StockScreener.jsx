import { useState, useEffect } from "react";
import "./StockScreener.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function normalizeSignal(rawSignal) {
  const map = {
    "STRONG BUY": "Strong Buy",
    "BUY": "Buy",
    "HOLD": "Hold",
    "SELL": "Sell",
    "STRONG SELL": "Strong Sell",
  };
  return map[(rawSignal || "").toUpperCase()] || "Hold";
}

function signalClass(signal) {
  return signal.toLowerCase().replace(" ", "-");
}

export default function StockScreener() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("confidence");
  const [sortDir, setSortDir] = useState("desc");
  const [filterSignal, setFilterSignal] = useState("ALL");
  const [lastScanned, setLastScanned] = useState(null);

  useEffect(() => {
    runScan();
  }, []);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/ml/scan`);

      if (!res.ok) {
        const text = await res.text();
        try {
          const errData = JSON.parse(text);
          throw new Error(errData.message || errData.error || `Server error ${res.status}`);
        } catch {
          throw new Error(`Server error ${res.status}`);
        }
      }

      const data = await res.json();

      if (data.error && (!data.predictions || data.predictions.length === 0)) {
        throw new Error(data.message || data.error);
      }

      const predictions = data.predictions || [];
      const enriched = predictions.map((p) => {
        const currentPrice = Number(p.current_price) || 0;
        const prediction = Number(p.prediction) || 0;
        const confidence = Number(p.confidence) || 0;
        const direction =
          p.direction || (prediction > currentPrice ? "UP" : prediction < currentPrice ? "DOWN" : "NEUTRAL");

        return {
          ...p,
          current_price: currentPrice,
          prediction,
          confidence,
          direction,
          signal: normalizeSignal(p.signal),
          changePercent: currentPrice !== 0 ? ((prediction - currentPrice) / currentPrice) * 100 : 0,
        };
      });

      setResults(enriched);
      setLastScanned(new Date());
    } catch (err) {
      setError(err.message || "Scan failed — check that the ML service is running");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortArrow = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  };

  const displayed = results
    .filter((r) => filterSignal === "ALL" || r.signal === filterSignal)
    .sort((a, b) => {
      const av = typeof a[sortKey] === "number" ? a[sortKey] : 0;
      const bv = typeof b[sortKey] === "number" ? b[sortKey] : 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });

  const bullish = results.filter((r) => ["Strong Buy", "Buy"].includes(r.signal)).length;
  const bearish = results.filter((r) => ["Strong Sell", "Sell"].includes(r.signal)).length;
  const topPick = results.length
    ? results.reduce((best, r) => (r.confidence > (best?.confidence ?? 0) ? r : best), null)
    : null;

  const handleRowClick = (symbol) => {
    sessionStorage.setItem("screener_selected_stock", symbol);
    window.location.hash = "#/dashboard";
  };

  return (
    <section className="screener-page">
      <div className="screener-header">
        <div>
          <span className="section-kicker">AI Scanner</span>
          <h2>Market Screener</h2>
          <p className="screener-subtitle">ML ensemble predictions across all tracked stocks</p>
        </div>
        <button className="btn primary-btn" onClick={runScan} disabled={loading}>
          {loading ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      <div className="screener-stats-grid">
        <div className="screener-stat-card">
          <span className="stat-label">Stocks Scanned</span>
          <strong className="stat-value">{results.length}</strong>
          {lastScanned && <small className="stat-meta">{lastScanned.toLocaleTimeString()}</small>}
        </div>
        <div className="screener-stat-card">
          <span className="stat-label">Bullish Signals</span>
          <strong className="stat-value" style={{ color: "#3fb950" }}>
            {bullish}
          </strong>
        </div>
        <div className="screener-stat-card">
          <span className="stat-label">Bearish Signals</span>
          <strong className="stat-value" style={{ color: "#ff7b72" }}>
            {bearish}
          </strong>
        </div>
        <div className="screener-stat-card">
          <span className="stat-label">Highest Confidence</span>
          <strong className="stat-value" style={{ color: "#58a6ff" }}>
            {topPick ? `${topPick.symbol} (${topPick.confidence.toFixed(1)}%)` : "--"}
          </strong>
        </div>
      </div>

      <div className="screener-filter-bar">
        {["ALL", "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"].map((sig) => (
          <button
            key={sig}
            className={`filter-btn ${filterSignal === sig ? "active" : ""}`}
            onClick={() => setFilterSignal(sig)}
          >
            {sig}
          </button>
        ))}
      </div>

      {loading && (
        <div className="screener-skeleton">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton-row shimmer" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="screener-error">
          <p>{error}</p>
          <button className="btn primary-btn" onClick={runScan}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="screener-table-wrapper">
          <table className="screener-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="sortable" onClick={() => handleSort("current_price")}>
                  Current{sortArrow("current_price")}
                </th>
                <th className="sortable" onClick={() => handleSort("prediction")}>
                  Predicted{sortArrow("prediction")}
                </th>
                <th className="sortable" onClick={() => handleSort("changePercent")}>
                  Change %{sortArrow("changePercent")}
                </th>
                <th>Signal</th>
                <th className="sortable" onClick={() => handleSort("confidence")}>
                  Confidence{sortArrow("confidence")}
                </th>
                <th>RSI</th>
                <th>MACD</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((row) => {
                const ti = row.technical_indicators || {};
                const macdTrend = ti.macd > (ti.macd_signal || 0) ? "Bullish" : "Bearish";
                const changeColor = row.changePercent >= 0 ? "#3fb950" : "#ff7b72";
                return (
                  <tr
                    key={row.symbol}
                    className="screener-row clickable"
                    onClick={() => handleRowClick(row.symbol)}
                    title={`View ${row.symbol} on Dashboard`}
                  >
                    <td className="symbol-cell">{row.symbol}</td>
                    <td>${row.current_price.toFixed(2)}</td>
                    <td>${row.prediction.toFixed(2)}</td>
                    <td style={{ color: changeColor }}>
                      {row.changePercent >= 0 ? "+" : ""}
                      {row.changePercent.toFixed(2)}%
                    </td>
                    <td>
                      <span className={`signal-badge ${signalClass(row.signal)}`}>{row.signal}</span>
                    </td>
                    <td>{row.confidence.toFixed(1)}%</td>
                    <td className={ti.rsi > 70 ? "val-overbought" : ti.rsi < 30 ? "val-oversold" : ""}>
                      {ti.rsi?.toFixed(1) ?? "--"}
                    </td>
                    <td style={{ color: macdTrend === "Bullish" ? "#3fb950" : "#ff7b72" }}>{macdTrend}</td>
                    <td>{ti.volume_ratio?.toFixed(2) ?? "--"}x</td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">
                    No results match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
