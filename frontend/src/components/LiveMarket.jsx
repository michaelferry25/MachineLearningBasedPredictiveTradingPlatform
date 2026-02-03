import { useEffect, useMemo, useState } from "react";
import CandleChart from "./CandleChart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
  const defaultFrame = useMemo(() => {
    const label = settings?.defaultTimeframe;
    return timeframes.find((frame) => frame.label === label) || timeframes[1];
  }, [settings?.defaultTimeframe]);
  const [timeframe, setTimeframe] = useState(defaultFrame);

  const autoRefresh = settings?.autoRefresh !== false;

  useEffect(() => {
    setTimeframe(defaultFrame);
  }, [defaultFrame]);

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
              <p>{timeframe.label} candles • {timeframe.labelRange}</p>
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

          <div className="live-zoom-hint">
            Use your mouse wheel or touchpad to zoom. Drag to pan across time.
          </div>

          {error && <div className="auth-error">{error}</div>}
          <CandleChart candles={candles} />
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
    </section>
  );
}
