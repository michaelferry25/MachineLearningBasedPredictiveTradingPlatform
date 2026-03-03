import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import "./App.css";
import HistoricalChart from "./components/HistoricalChart";
import TradingPanel from "./components/TradingPanel";
import AuthPanel from "./components/AuthPanel";
import AnalyticsHub from "./components/AnalyticsHub";
import ResearchHub from "./components/ResearchHub";
import LiveMarket from "./components/LiveMarket";
import SettingsPage from "./components/SettingsPage";
import ProfilePage from "./components/ProfilePage";
import PortfolioPage from "./components/PortfolioPage";
import EnhancedPredictionCard from "./components/EnhancedPredictionCard";
import PredictionHistory from "./components/PredictionHistory";
import MLInsightsTabs from "./components/MLInsightsTabs";
import StockScreener from "./components/StockScreener";
import NewsSentiment from "./components/NewsSentiment";
import AboutSection from "./components/AboutSection";
import SecuritySection from "./components/SecuritySection";
import LearnPage from "./components/LearnPage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const TOKEN_KEY = "marketmind_token";
const USER_KEY = "marketmind_user";
const SETTINGS_KEY = "marketmind_settings";
const DEFAULT_SETTINGS = {
  theme: "dark",
  reduceMotion: false,
  compactMode: false,
  defaultTimeframe: "5 minutes",
  autoRefresh: true,
  showOverlays: true,
  tradeNotifications: true,
  volatilityAlerts: false,
  personalization: true,
  usageAnalytics: true
};

const getRoute = () => {
  const raw = window.location.hash || "#/overview";
  const cleaned = raw.replace("#", "");
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
};

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "GOOGL", name: "Google" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "NFLX", name: "Netflix" }
];

export default function App() {
  const [auth, setAuth] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [route, setRoute] = useState(getRoute());
  const [symbol, setSymbol] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [result, setResult] = useState(null);
  const [historical, setHistorical] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predictionComparison, setPredictionComparison] = useState(null);
  const [detailedPrediction, setDetailedPrediction] = useState(null);
  const [trackRecord, setTrackRecord] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [watchlist, setWatchlist] = useState(["AAPL", "GOOGL", "MSFT", "TSLA"]);
  const [newTicker, setNewTicker] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chartRange, setChartRange] = useState("1mo");
  const [userSkillLevel, setUserSkillLevel] = useState("Beginner");

  const authToken = auth?.token;

  useEffect(() => {
    const onHashChange = () => {
      const newRoute = getRoute();
      setRoute(newRoute);
      window.scrollTo(0, 0);

      if (newRoute === "/dashboard") {
        const fromScreener = sessionStorage.getItem("screener_selected_stock");
        if (fromScreener) {
          sessionStorage.removeItem("screener_selected_stock");
          handleStockSelect(fromScreener);
        }
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.body.classList.toggle("theme-light", settings.theme === "light");
    document.body.classList.toggle("reduce-motion", settings.reduceMotion);
    document.body.classList.toggle("compact-mode", settings.compactMode);
    document.documentElement.style.colorScheme = settings.theme;
  }, [settings]);

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
        if (!res.ok) throw new Error("Unauthorized");
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

  useEffect(() => {
    if (!authToken) return;
    fetch(`${API_URL}/api/learning/progress`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.skillLevel) setUserSkillLevel(data.skillLevel);
      })
      .catch(() => {});
  }, [authToken]);

  const handleAuthSuccess = (payload) => {
    const token = payload.accessToken;
    const user = payload.user;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuth({ token, user });
    const isNewSignup = payload.newUser || (!payload.user?.updatedAt);
    if (isNewSignup) {
      sessionStorage.setItem("marketmind_new_signup", "true");
      window.location.hash = "#/learn";
    } else {
      window.location.hash = "#/overview";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth(null);
    window.location.hash = "#/auth";
  };

  const handleProfileUpdate = (user) => {
    setAuth((prev) => (prev ? { ...prev, user } : prev));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const updateSettings = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
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

  const fetchHistorical = async (stockSymbol, range) => {
    const sym = stockSymbol || symbol;
    const r = range || chartRange;
    if (!sym.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/historical/${sym}?range=${r}`);
      const data = await res.json();
      setHistorical(data);
    } catch (error) {
      /* error handled silently */
    }
  };

  const handleRangeChange = (range) => {
    setChartRange(range);
    if (symbol) fetchHistorical(symbol, range);
  };

  const fetchPrediction = async (stockSymbol, options = {}) => {
    const sym = stockSymbol || symbol;
    if (!sym.trim()) return;
    const params = new URLSearchParams();
    if (options.refresh) params.set("refresh", "true");
    if (options.source) params.set("source", options.source);
    const query = params.toString() ? `?${params.toString()}` : "";
    try {
      const res = await fetch(`${API_URL}/api/ml/predict/${sym}${query}`);
      const data = await res.json();
      if (res.ok && !data.error) {
        setPrediction(data);
      } else {
        setPrediction(null);
      }
    } catch (error) {
      setPrediction(null);
    }
  };

  const fetchPredictionComparison = async (stockSymbol) => {
    const sym = stockSymbol || symbol;
    if (!sym.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/ml/predict-comparison/${sym}`);
      const data = await res.json();
      if (res.ok && !data.error) {
        setPredictionComparison(data);
      } else {
        setPredictionComparison(null);
      }
    } catch (error) {
      setPredictionComparison(null);
    }
  };

  const fetchDetailedPrediction = async (stockSymbol) => {
    const sym = stockSymbol || symbol;
    if (!sym.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/ml/predict/${sym}/detailed`);
      const data = await res.json();
      if (res.ok && !data.error) {
        setDetailedPrediction(data);
      } else {
        setDetailedPrediction(null);
      }
    } catch (error) {
      setDetailedPrediction(null);
    }
  };

  const handleRefreshPrediction = async () => {
    if (!symbol) return;
    await fetchPrediction(symbol, { refresh: true });
    await fetchPredictionComparison(symbol);
    await fetchTrackRecord(symbol);
  };

  const fetchTrackRecord = async (stockSymbol) => {
    const sym = stockSymbol || symbol;
    if (!sym.trim()) return;

    try {
      const fetchBySource = async (source) => {
        const params = new URLSearchParams({
          days: "365",
          includePending: "true",
          source,
        });
        const res = await fetch(`${API_URL}/api/ml/track-record/${sym}?${params.toString()}`);
        const data = await res.json();
        return { ok: res.ok && !data.error, data };
      };

      // Canonical chart overlay: use daily close records first.
      let response = await fetchBySource("scheduler_daily_close");
      if (!response.ok || !Array.isArray(response.data?.points) || response.data.points.length === 0) {
        // Safe fallback so the chart never goes blank on new datasets.
        response = await fetchBySource("scheduler_hourly");
      }

      if (response.ok) {
        setTrackRecord(response.data);
      } else {
        setTrackRecord(null);
      }
    } catch (error) {
      setTrackRecord(null);
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
      /* error handled silently */
    }
  };

  const handleStockSelect = (stockSymbol) => {
    setShowAdvanced(false);
    setPrediction(null);
    setPredictionComparison(null);
    setDetailedPrediction(null);
    setTrackRecord(null);
    setSymbol(stockSymbol);
    setSearchInput(stockSymbol);
    fetchPrice(stockSymbol);
    fetchHistorical(stockSymbol);
    fetchPrediction(stockSymbol, { source: "scheduler_hourly" });
    fetchPredictionComparison(stockSymbol);
    fetchTrackRecord(stockSymbol);
  };

  const handleToggleAdvanced = () => {
    setShowAdvanced((prev) => {
      const next = !prev;
      if (next && symbol && !detailedPrediction) {
        fetchDetailedPrediction(symbol);
      }
      return next;
    });
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      handleStockSelect(searchInput.toUpperCase());
    }
  };

  const addToWatchlist = () => {
    if (newTicker.trim() && !watchlist.includes(newTicker.toUpperCase())) {
      setWatchlist([...watchlist, newTicker.toUpperCase()]);
      setNewTicker("");
    }
  };

  const removeFromWatchlist = (ticker) => {
    setWatchlist(watchlist.filter(t => t !== ticker));
  };

  useEffect(() => {
    if (authToken) {
      fetchPortfolio();
    }
  }, [authToken]);

  useEffect(() => {
    if (!symbol) return;
    const timer = setInterval(() => {
      fetchPrediction(symbol, { source: "scheduler_hourly" });
      fetchPredictionComparison(symbol);
      fetchTrackRecord(symbol);
    }, 300000);
    return () => clearInterval(timer);
  }, [symbol]);

  const renderDashboard = () => (
    <div className="dashboard-unified">
      <div className="dashboard-grid">
        
        <aside className="stock-selector-panel">
          <div className="search-section">
            <h3>Search Stock</h3>
            <div className="symbol-input">
              <input
                type="text"
                placeholder="Enter symbol (e.g., AAPL)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="btn small primary-btn" onClick={handleSearch}>
                {loading ? "..." : "Go"}
              </button>
            </div>
          </div>

          <div className="popular-section">
            <h3>Popular Stocks</h3>
            <div className="stock-grid">
              {POPULAR_STOCKS.map(stock => (
                <button
                  key={stock.symbol}
                  className={`stock-btn ${symbol === stock.symbol ? 'active' : ''}`}
                  onClick={() => handleStockSelect(stock.symbol)}
                >
                  <div className="stock-symbol">{stock.symbol}</div>
                  <div className="stock-name">{stock.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="watchlist-section">
            <h3>⭐ My Watchlist</h3>
            <div className="watchlist-add">
              <input
                type="text"
                placeholder="Add ticker..."
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && addToWatchlist()}
              />
              <button className="btn small" onClick={addToWatchlist}>Add</button>
            </div>
            <div className="watchlist-items">
              {watchlist.map(ticker => (
                <div key={ticker} className="watchlist-item">
                  <button 
                    className="watchlist-ticker"
                    onClick={() => handleStockSelect(ticker)}
                  >
                    {ticker}
                  </button>
                  <button 
                    className="watchlist-remove"
                    onClick={() => removeFromWatchlist(ticker)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="chart-prediction-panel">
          {symbol ? (
            <>
              <div className="stock-header">
                <h2>{symbol}</h2>
                {result && !result.error && (
                  <div className="live-price">
                    <span className="price">${result.price?.toFixed(2)}</span>
                    <span className={`change ${(result.change ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(result.change ?? 0) >= 0 ? '↑' : '↓'} {Math.abs(result.change ?? 0).toFixed(2)} ({(result.changePercent ?? 0).toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>

              <div className="chart-container">
                <div className="chart-timeframe-bar">
                  {[
                    { key: '5d', label: '1W' },
                    { key: '1mo', label: '1M' },
                    { key: '3mo', label: '3M' },
                    { key: '6mo', label: '6M' },
                    { key: '1y', label: '1Y' },
                  ].map(tf => (
                    <button
                      key={tf.key}
                      className={`timeframe-btn ${chartRange === tf.key ? 'active' : ''}`}
                      onClick={() => handleRangeChange(tf.key)}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
                {historical && historical.prices?.length > 0 ? (
                  <HistoricalChart
                    timestamps={historical.timestamps}
                    prices={historical.prices}
                    symbol={symbol}
                    prediction={prediction}
                    predictionComparison={predictionComparison}
                    indicatorData={detailedPrediction?.indicator_timeseries}
                    chartRange={chartRange}
                    trackRecord={trackRecord}
                  />
                ) : (
                  <div className="chart-loading">Loading chart...</div>
                )}
              </div>

              <EnhancedPredictionCard
                symbol={symbol}
                prediction={prediction}
                predictionComparison={predictionComparison}
                showAdvanced={showAdvanced}
                onToggleAdvanced={handleToggleAdvanced}
                onRefreshPrediction={handleRefreshPrediction}
              />

              <NewsSentiment symbol={symbol} />

              {showAdvanced && detailedPrediction && (
                <MLInsightsTabs detailedPrediction={detailedPrediction} />
              )}

              <PredictionHistory symbol={symbol} />
            </>
          ) : (
            <div className="empty-state-main">
              <div className="empty-icon">📊</div>
              <h2>Select a Stock</h2>
              <p>Choose from popular stocks or search for a symbol to get started</p>
            </div>
          )}
        </main>

        <aside className="trading-portfolio-panel">
          <TradingPanel
            symbol={symbol}
            currentPrice={result?.price}
            onTradeComplete={fetchPortfolio}
            authToken={authToken}
          />

          {portfolio && (
            <div className="portfolio-quick-card">
              <div>
                <span className="quick-label">Total value</span>
                <strong className="quick-value">${portfolio.totalValue?.toFixed(2)}</strong>
              </div>
              <div>
                <span className="quick-label">Assets value</span>
                <strong className="quick-value">${portfolio.holdingsValue?.toFixed(2)}</strong>
              </div>
              <div>
                <span className="quick-label">Cash balance</span>
                <strong className="quick-value">${portfolio.cashBalance?.toFixed(2)}</strong>
              </div>
              <div>
                <span className="quick-label">Open positions</span>
                <strong className="quick-value">{portfolio.positions?.length || 0}</strong>
              </div>
              <button
                className="btn secondary portfolio-link"
                type="button"
                onClick={() => (window.location.hash = "#/portfolio")}
              >
                View portfolio
              </button>
            </div>
          )}
        </aside>

      </div>
    </div>
  );

  const renderPage = () => {
    switch (route) {
      case "/analytics":
        return <AnalyticsHub authToken={authToken} />;
      case "/screener":
        return <StockScreener />;
      case "/dashboard":
        return renderDashboard();
      case "/research":
        return <ResearchHub authToken={authToken} />;
      case "/live":
        return <LiveMarket settings={settings} />;
      case "/portfolio":
        return <PortfolioPage portfolio={portfolio} onRefresh={fetchPortfolio} authToken={authToken} />;
      case "/settings":
        return <SettingsPage settings={settings} onUpdate={updateSettings} onReset={resetSettings} />;
      case "/profile":
        return <ProfilePage user={auth?.user} authToken={authToken} onProfileUpdate={handleProfileUpdate} portfolio={portfolio} />;
      case "/learn":
        return <LearnPage authToken={authToken} user={auth?.user} onSkillLevelChange={setUserSkillLevel} />;
      case "/security":
        return <SecuritySection />;
      case "/about":
        return <AboutSection />;
      case "/overview":
      default:
        return (
          <div className="overview-page">
            <HeroSection />
            <AnalyticsHub authToken={authToken} />
          </div>
        );
    }
  };

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">Loading...</div>
      </div>
    );
  }

  if (!auth) {
    return (
      <>
        <Navbar variant="auth" currentRoute={route} />
        <AuthPanel onAuthSuccess={handleAuthSuccess} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar user={auth.user} onLogout={handleLogout} variant="app" currentRoute={route} userSkillLevel={userSkillLevel} authToken={authToken} portfolio={portfolio} />
      <main className="page-content">{renderPage()}</main>
      <Footer />
    </>
  );
}
