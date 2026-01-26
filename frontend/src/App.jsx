import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./App.css";
import HistoricalChart from "./components/HistoricalChart";
import PredictionCard from "./components/PredictionCard";
import TradingPanel from "./components/TradingPanel";
import Portfolio from "./components/Portfolio";
import PopularStocks from "./components/PopularStocks";
import StockInfo from "./components/StockInfo";
import NewsSentiment from "./components/NewsSentiment";
import PerformanceChart from "./components/PerformanceChart";
import MarketStats from "./components/MarketStats";
import Watchlist from "./components/Watchlist";
import TradeHistory from "./components/TradeHistory";
import AuthPanel from "./components/AuthPanel";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const TOKEN_KEY = "marketmind_token";
const USER_KEY = "marketmind_user";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState(null);
  const [historical, setHistorical] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);

  const authToken = auth?.token;

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        const user = await res.json();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setAuth({ token, user });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuthSuccess = (payload) => {
    const token = payload.accessToken;
    const user = payload.user;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    setAuth({ token, user });
    setTimeout(() => {
      document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth(null);
  };

  const fetchPrice = async (stockSymbol) => {
    const sym = stockSymbol || symbol;
    if (!sym.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/price/${sym}`);
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Unable to connect to backend" });
    }

    setLoading(false);
  };

  const fetchHistorical = async (stockSymbol) => {
    const sym = stockSymbol || symbol;
    if (!sym.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/historical/${sym}`);
      const data = await res.json();
      setHistorical(data);
    } catch (error) {
      console.error("Historical fetch failed", error);
    }
  };

  const fetchPrediction = async (stockSymbol) => {
    const sym = stockSymbol || symbol;
    if (!sym.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/ml/predict/${sym}`);
      const data = await res.json();
      setPrediction(data);
    } catch (error) {
      console.error("Prediction fetch failed", error);
    }
  };

  const fetchPortfolio = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_URL}/api/trading/portfolio`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setPortfolio(data);
    } catch (error) {
      console.error("Portfolio fetch failed", error);
    }
  };

  const handleFetchAll = (stockSymbol) => {
    const sym = stockSymbol || symbol;
    if (stockSymbol) setSymbol(stockSymbol);
    fetchPrice(sym);
    fetchHistorical(sym);
    fetchPrediction(sym);
  };

  const handleStockSelect = (stockSymbol) => {
    setSymbol(stockSymbol);
    handleFetchAll(stockSymbol);
  };

  useEffect(() => {
    if (authToken) {
      fetchPortfolio();
    }
  }, [authToken]);

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">Loading your workspace...</div>
      </div>
    );
  }

  if (!auth) {
    return (
      <>
        <Navbar variant="auth" />
        <AuthPanel onAuthSuccess={handleAuthSuccess} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar user={auth.user} onLogout={handleLogout} variant="app" />

      <div className="landing-container">
        <div className="hero-content">
          <div className="hero-badge">🤖 AI-Powered Trading</div>
          <h1>Trading Insight</h1>
          <p>Your machine learning powered trading platform with real-time predictions.</p>

          <div className="buttons">
            <button
              className="btn primary-btn"
              onClick={() => document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" })}
            >
              Launch Dashboard →
            </button>
            <button className="btn secondary">View Analytics</button>
          </div>

          <div className="stats-row">
            <div className="stat">
              <span className="stat-number">$100K</span>
              <span className="stat-label">Demo Balance</span>
            </div>
            <div className="stat">
              <span className="stat-number">Live</span>
              <span className="stat-label">Market Data</span>
            </div>
            <div className="stat">
              <span className="stat-number">AI</span>
              <span className="stat-label">Predictions</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-container" id="dashboard">
        <MarketStats />

        <div className="dashboard-row">
          <div className="left-panel">
            <PopularStocks onSelectStock={handleStockSelect} />

            <div className="search-card">
              <h3>Search Stock</h3>
              <div className="symbol-input">
                <input
                  type="text"
                  placeholder="Enter symbol (e.g., AAPL)"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleFetchAll()}
                />
                <button className="btn small primary-btn" onClick={() => handleFetchAll()}>
                  {loading ? "..." : "Go"}
                </button>
              </div>
            </div>

            <Watchlist onSelectStock={handleStockSelect} />
          </div>

          <div className="right-panel">
            <div className="chart-wrapper">
              {historical && historical.prices?.length > 0 ? (
                <HistoricalChart
                  timestamps={historical.timestamps}
                  prices={historical.prices}
                  symbol={symbol}
                  prediction={prediction}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📈</div>
                  <h3>No Data Yet</h3>
                  <p>Select a popular stock or search for a symbol to view charts and predictions</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-row">
          <div className="left-panel">
            {result && <StockInfo symbol={symbol} result={result} />}
            {prediction && <PredictionCard prediction={prediction} />}
            <TradingPanel
              symbol={symbol}
              currentPrice={result?.price}
              onTradeComplete={fetchPortfolio}
              authToken={authToken}
            />
          </div>

          <div className="right-panel">
            <PerformanceChart portfolio={portfolio} />
            {portfolio && <Portfolio portfolio={portfolio} />}
          </div>
        </div>

        <div className="dashboard-row">
          <div className="left-panel">
            <TradeHistory authToken={authToken} />
          </div>

          <div className="right-panel">
            <NewsSentiment symbol={symbol} />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
