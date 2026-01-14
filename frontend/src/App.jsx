import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import "./App.css";
import HistoricalChart from "./components/HistoricalChart";
import PredictionCard from "./components/PredictionCard";
import TradingPanel from "./components/TradingPanel";
import Portfolio from "./components/Portfolio";

export default function App() {
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState(null);
  const [historical, setHistorical] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
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

  const fetchPrediction = async () => {
    if (!symbol.trim()) return;

    try {
      const res = await fetch(`http://localhost:8080/api/ml/predict/${symbol}`);
      const data = await res.json();
      setPrediction(data);
    } catch (error) {
      console.error("Prediction fetch failed", error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/trading/portfolio");
      const data = await res.json();
      setPortfolio(data);
    } catch (error) {
      console.error("Portfolio fetch failed", error);
    }
  };

  const handleFetchAll = () => {
    fetchPrice();
    fetchHistorical();
    fetchPrediction();
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  return (
    <>
      <Navbar />

      <div className="landing-container">
        <h1>Trading Insight</h1>
        <p>Your machine learning powered trading platform.</p>

        <div className="buttons">
          <button className="btn" onClick={() => document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' })}>
            View Dashboard
          </button>
          <button className="btn secondary">API Docs</button>
        </div>
      </div>

      <div className="dashboard-container" id="dashboard">
        <div className="left-panel">
          <div className="price-card">
            <h2>Check Live Stock Price</h2>

            <div className="symbol-input">
              <input
                type="text"
                placeholder="AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleFetchAll()}
              />

              <button className="btn small" onClick={handleFetchAll}>
                Fetch All
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
                    <p className="price">${result.price}</p>
                    <p className="source">{result.source}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {prediction && <PredictionCard prediction={prediction} />}

          <TradingPanel 
            symbol={symbol} 
            currentPrice={result?.price} 
            onTradeComplete={fetchPortfolio}
          />
        </div>

        <div className="right-panel">
          <div className="chart-wrapper">
            {historical && historical.prices?.length > 0 ? (
              <HistoricalChart
                timestamps={historical.timestamps}
                prices={historical.prices}
                symbol={symbol}
              />
            ) : (
              <p className="placeholder-text">
                Enter a stock symbol and click "Fetch All" to view data
              </p>
            )}
          </div>

          {portfolio && <Portfolio portfolio={portfolio} />}
        </div>
      </div>
    </>
  );
}