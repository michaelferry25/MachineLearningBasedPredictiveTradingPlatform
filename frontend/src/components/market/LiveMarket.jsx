import { useEffect, useMemo, useState } from "react";
import CandleChart from "../charts/CandleChart";
import TradingViewWidget from "../trading/TradingViewWidget";

const API_URL = import.meta.env.VITE_API_URL || "";

const timeframes = [
  { label: "1 minute", interval: "1min", outputsize: 300, labelRange: "Last 5 hours" },
  { label: "5 minutes", interval: "5min", outputsize: 300, labelRange: "Last 25 hours" },
  { label: "30 minutes", interval: "30min", outputsize: 300, labelRange: "Last 6 days" },
  { label: "1 hour", interval: "1h", outputsize: 300, labelRange: "Last 12 days" },
  { label: "1 day", interval: "1day", outputsize: 30, labelRange: "Last 30 days" }
];

export default function LiveMarket({ settings }) {
  const [symbol, setSymbol] = useState("AAPL");
  const [symbolInput, setSymbolInput] = useState("AAPL");
  const [candles, setCandles] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastCandleRefresh, setLastCandleRefresh] = useState(null);
  const [lastQuoteRefresh, setLastQuoteRefresh] = useState(null);
  const [showVolume, setShowVolume] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const defaultFrame = useMemo(() => {
    const label = settings?.defaultTimeframe;
    return timeframes.find((frame) => frame.label === label) || timeframes[1];
  }, [settings?.defaultTimeframe]);
  const [timeframe, setTimeframe] = useState(defaultFrame);

  const autoRefresh = settings?.autoRefresh !== false;
  const theme = settings?.theme || "dark";

  useEffect(() => {
    setTimeframe(defaultFrame);
  }, [defaultFrame]);

  const formatTime = (value) => {
    if (!value) return "--";
    return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const updateLastCandleWithQuote = (price) => {
    const numeric = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(numeric)) return;
    setCandles((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      const updated = {
        ...last,
        c: numeric,
        h: Math.max(last.h, numeric),
        l: Math.min(last.l, numeric)
      };
      return [...prev.slice(0, -1), updated];
    });
  };

  const fetchCandles = async (target, frame = timeframe, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const query = `interval=${encodeURIComponent(frame.interval)}&outputsize=${frame.outputsize}`;
      const res = await fetch(`${API_URL}/api/candles/${target}?${query}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        if (!silent) {
          setError(data.error || "Unable to load candle data.");
          setCandles([]);
        }
        return;
      }
      setCandles(data.candles || []);
      setLastCandleRefresh(Date.now());
    } catch (err) {
      if (!silent) {
        setError("Unable to reach backend for candle data.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchQuote = async (target) => {
    try {
      const res = await fetch(`${API_URL}/api/price/${target}`);
      const data = await res.json();
      if (res.ok) {
        setQuote(data);
        setLastQuoteRefresh(Date.now());
        if (data?.price) {
          updateLastCandleWithQuote(data.price);
        }
      }
    } catch (err) {
      // ignore
    }
  };

  const refreshMs = (frame) => {
    switch (frame.interval) {
      case "1min":
        return 60000;
      case "5min":
        return 120000;
      case "30min":
        return 300000;
      case "1h":
        return 600000;
      case "1day":
        return 1800000;
      default:
        return 120000;
    }
  };

  useEffect(() => {
    fetchCandles(symbol);
    fetchQuote(symbol);
    const quoteInterval = setInterval(() => fetchQuote(symbol), 15000);
    let candleInterval;
    if (autoRefresh) {
      candleInterval = setInterval(() => fetchCandles(symbol, timeframe, true), refreshMs(timeframe));
    }
    return () => {
      clearInterval(quoteInterval);
      if (candleInterval) clearInterval(candleInterval);
    };
  }, [symbol, timeframe, autoRefresh]);

  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const change = latest && previous ? latest.c - previous.c : null;
  const changePercent = latest && previous ? (change / previous.c) * 100 : null;
  const rangeLabel = `${timeframe.outputsize} candles`;

  return (
    <section className="section-wrapper" id="live">
      <div className="section-header">
        <span className="section-kicker">Live Markets</span>
        <h2>Live candles, momentum, and price action</h2>
        <p>Track real-time price action with professional candlestick analysis.</p>
      </div>

      <div className="live-grid">
        <div className="live-chart-card">
          <div className="live-chart-header">
            <div>
              <h3>{symbol} Candles</h3>
              <p>{timeframe.label} • {rangeLabel}</p>
              <div className="live-update">
                <span>Price updated {formatTime(lastQuoteRefresh)}</span>
                <span>• Candles updated {formatTime(lastCandleRefresh)}</span>
                <span>• Auto refresh {autoRefresh ? "on" : "off"}</span>
              </div>
            </div>
            <div className="live-quote">
              <div className="quote-price">{quote?.price ? `$${quote.price.toFixed(2)}` : "--"}</div>
              {changePercent !== null && (
                <div className={`quote-change ${changePercent >= 0 ? "positive" : "negative"}`}>
                  {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                </div>
              )}
            </div>
          </div>

          <div className="live-search">
            <input
              type="text"
              value={symbolInput}
              onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
              placeholder="Search symbol (e.g. AAPL)"
            />
            <button
              className="btn primary-btn"
              onClick={() => setSymbol(symbolInput.trim().toUpperCase())}
              disabled={loading}
            >
              {loading ? "Loading" : "Load"}
            </button>
          </div>

          <div className="live-timeframes">
            {timeframes.map((frame) => (
              <button
                key={frame.label}
                className={`timeframe-btn ${timeframe.label === frame.label ? "active" : ""}`}
                onClick={() => setTimeframe(frame)}
                type="button"
              >
                {frame.label}
              </button>
            ))}
          </div>

          <div className="live-tools">
            <button
              type="button"
              className={`tool-btn ${showSMA ? "active" : ""}`}
              onClick={() => setShowSMA((prev) => !prev)}
            >
              SMA 20
            </button>
            <button
              type="button"
              className={`tool-btn ${showVolume ? "active" : ""}`}
              onClick={() => setShowVolume((prev) => !prev)}
            >
              Volume
            </button>
            <button
              type="button"
              className="tool-btn"
              onClick={() => setResetToken((prev) => prev + 1)}
            >
              Reset view
            </button>
          </div>

          <div className="live-zoom-hint">
            Use your mouse wheel or touchpad to zoom. Drag to pan across time.
          </div>

          {error && <div className="auth-error">{error}</div>}
          <CandleChart
            candles={candles}
            interval={timeframe.interval}
            theme={theme}
            showVolume={showVolume}
            showSMA={showSMA}
            fitKey={`${symbol}-${timeframe.interval}`}
            resetToken={resetToken}
          />
        </div>

        <div className="live-side">
          <div className="live-panel">
            <h4>Chart Controls</h4>
            <ul className="live-signals">
              <li>Scroll to zoom in or out on candles</li>
              <li>Drag the chart to move through time</li>
              <li>Hover to see open, high, low, close, volume</li>
              <li>Time scale updates with every zoom level</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="live-advanced-card">
        <div className="live-chart-header">
          <div>
            <h3>Advanced charting tools</h3>
            <p>TradingView-powered chart with drawing tools and indicators.</p>
          </div>
          <div className="live-chip">TradingView</div>
        </div>
        <div className="tv-embed">
          <TradingViewWidget symbol={symbol} interval={timeframe.interval} theme={theme} />
        </div>
      </div>
    </section>
  );
}
