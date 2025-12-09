import { useState } from "react";
import Navbar from "./components/Navbar";
import "./App.css";

export default function App() {
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <>
      <Navbar />

      <div className="landing-container">
        <h1>Trading Insight</h1>
        <p>Your machine learning powered trading platform.</p>

        <div className="buttons">
          <button className="btn">View Dashboard</button>
          <button className="btn secondary">API Docs</button>
        </div>

        {/* Stock Price Section */}
        <div className="stock-box">
          <h2>Check Live Stock Price</h2>

          <div className="stock-input">
            <input
              type="text"
              placeholder="Enter stock symbol (e.g. AAPL)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
            <button onClick={fetchPrice} className="btn small">
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
        </div>
      </div>
    </>
  );
}
