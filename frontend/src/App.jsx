import { useState, useEffect } from "react";
import "./App.css";

// Layout
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import HeroSection from "./components/layout/HeroSection";
import ToastContainer from "./components/layout/Toast";

// Auth
import AuthPanel from "./components/auth/AuthPanel";
import ProfilePage from "./components/auth/ProfilePage";

// Market
import LiveMarket from "./components/market/LiveMarket";
import StockScreener from "./components/market/StockScreener";

// Trading
import TradingPanel from "./components/trading/TradingPanel";
import PortfolioPage from "./components/trading/PortfolioPage";
import PortfolioOptimizer from "./components/trading/PortfolioOptimizer";
import Backtester from "./components/trading/Backtester";

// Charts
import HistoricalChart from "./components/charts/HistoricalChart";

// Predictions
import EnhancedPredictionCard from "./components/predictions/EnhancedPredictionCard";
import PredictionHistory from "./components/predictions/PredictionHistory";
import MLInsightsTabs from "./components/predictions/MLInsightsTabs";

// Research
import AnalyticsHub from "./components/research/AnalyticsHub";
import ResearchHub from "./components/research/ResearchHub";
import NewsSentiment from "./components/research/NewsSentiment";

// Infographics
import FearGreedGauge from "./components/FearGreedGauge";

// Pages
import SettingsPage from "./components/pages/SettingsPage";
import AboutSection from "./components/pages/AboutSection";
import SecuritySection from "./components/pages/SecuritySection";
import LearnPage from "./components/pages/LearnPage";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
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
  const [showShortcuts, setShowShortcuts] = useState(false);

  const authToken = auth?.token;

  // Keyboard shortcuts (active on dashboard)
  useEffect(() => {
    const handler = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const currentRoute = getRoute();

      if (e.key === "?") {
        setShowShortcuts((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        setShowShortcuts(false);
        return;
      }

      // Only stock/trade shortcuts on dashboard
      if (currentRoute !== "/dashboard") return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= POPULAR_STOCKS.length) {
        handleStockSelect(POPULAR_STOCKS[num - 1].symbol);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
        loadSettingsFromBackend(token);
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

  const loadSettingsFromBackend = (token) => {
    fetch(`${API_URL}/api/auth/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.settings && data.settings !== "{}") {
          try {
            const remote = typeof data.settings === "string" ? JSON.parse(data.settings) : data.settings;
            setSettings((prev) => ({ ...prev, ...remote }));
          } catch {}
        }
      })
      .catch(() => {});
  };

  const handleAuthSuccess = (payload) => {
    const token = payload.accessToken;
    const user = payload.user;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuth({ token, user });

    // Load user settings from backend
    if (token) loadSettingsFromBackend(token);

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

  const syncSettingsToBackend = (newSettings) => {
    if (!authToken) return;
    fetch(`${API_URL}/api/auth/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ settings: newSettings })
    }).catch(() => {});
  };

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      syncSettingsToBackend(next);
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    syncSettingsToBackend(DEFAULT_SETTINGS);
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
        
        <div className="dashboard-welcome">
          <h2>Welcome to your <span>Trading Dashboard</span></h2>
          <p>Search for a stock, pick from the popular tickers below, or check your watchlist to get started. Select any stock to view live prices, AI predictions, charts, and trading tools.</p>
        </div>

        {/* Left/Top controls: Search, Popular, Watchlist - no column wrapper */}
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
        {/* End of controls */}
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
        {/* End of main chart panel */}

        {/* Trading, Portfolio, Fear & Greed */}
          <TradingPanel
            symbol={symbol}
            currentPrice={result?.price}
            onTradeComplete={fetchPortfolio}
            authToken={authToken}
            heldQuantity={portfolio?.positions?.find(p => p.symbol === symbol)?.quantity || 0}
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

          <FearGreedGauge />

          <div className="keyboard-hint">
            Press <kbd>1</kbd>-<kbd>8</kbd> to quick-select stocks or <kbd>?</kbd> for all shortcuts
          </div>

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
      case "/optimizer":
        return (
          <section className="section-wrapper" id="optimizer">
            <PortfolioOptimizer authToken={authToken} onRefresh={fetchPortfolio} />
          </section>
        );
      case "/backtester":
        return (
          <section className="section-wrapper" id="backtester">
            <Backtester />
          </section>
        );
      case "/settings":
        return <SettingsPage settings={settings} onUpdate={updateSettings} onReset={resetSettings} authToken={authToken} />;
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
      <ToastContainer />
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Keyboard Shortcuts</h3>
            <div className="shortcuts-grid">
              <div className="shortcut-group">
                <h4>Dashboard</h4>
                <div className="shortcut-row"><kbd>1</kbd>-<kbd>8</kbd><span>Select popular stock</span></div>
                <div className="shortcut-row"><kbd>?</kbd><span>Toggle this overlay</span></div>
                <div className="shortcut-row"><kbd>Esc</kbd><span>Close overlay</span></div>
              </div>
            </div>
            <p className="shortcuts-hint">Press <kbd>?</kbd> to close</p>
          </div>
        </div>
      )}
      <Navbar user={auth.user} onLogout={handleLogout} variant="app" currentRoute={route} userSkillLevel={userSkillLevel} authToken={authToken} portfolio={portfolio} />
      <main className="page-content">{renderPage()}</main>
      <Footer />
    </>
  );
}
