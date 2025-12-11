import { useState } from "react";
import Navbar from "./components/Navbar";
import "./App.css";
import HistoricalChart from "./components/HistoricalChart";

export default function App() {
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState(null);
  const [historical, setHistorical] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch live stock price
  const fetchPrice = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`http://localhost:8080/api/price/${symbol}`);
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Unable to connect to backend" });
    }

    setLoading(false);
  };

  // Fetch historical prices
  const fetchHistorical = async () => {
    if (!symbol.trim()) return;

    try {
      const res = await fetch(`http://localhost:8080/api/historical/${symbol}`);
      const data = await res.json();
      setHistorical(data);
    } catch (error) {
      console.error("Historical fetch failed", error);
    }
  };

  return (
    <>
      <Navbar />

      {/* LANDING HERO SECTION */}
      <div className="landing-container">
        <h1>Trading Insight</h1>
        <p>Your machine learning powered trading platform.</p>

        <div className="buttons">
          <button className="btn">View Dashboard</button>
          <button className="btn secondary">API Docs</button>
        </div>
      </div>

      {/* EVERYTHING BELOW IS THE DASHBOARD */}
      <div className="dashboard-container">

        {/* LEFT SIDE — PRICE CARD */}
        <div className="price-card">
          <h2>Check Live Stock Price</h2>

          <div className="symbol-input">
            <input
              type="text"
              placeholder="AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />

            <button className="btn small" onClick={fetchPrice}>
              Fetch
            </button>
          </div>

          {loading && <p>Loading...</p>}

          {result && (
            <div className="stock-result">
              {result.error ? (
                <p className="error">{result.error}</p>
              ) : (
                <>
                  <h3>{result.symbol}</h3>
                  <p>Price: ${result.price}</p>
                  <p className="source">{result.source}</p>
                </>
              )}
            </div>
          )}

          <button className="btn secondary" onClick={fetchHistorical}>
            View Historical Chart
          </button>
        </div>

        {/* RIGHT SIDE — CHART */}
        <div className="chart-wrapper">
          {historical && historical.prices?.length > 0 ? (
            <HistoricalChart
              timestamps={historical.timestamps}
              prices={historical.prices}
            />
          ) : (
            <p style={{ opacity: 0.5, marginTop: "40px" }}>
              Chart will appear here
            </p>
          )}
        </div>

      </div>
    </>
  );
}