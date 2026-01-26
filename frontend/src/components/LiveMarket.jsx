import { useEffect, useState } from "react";
import CandleChart from "./CandleChart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const movers = [
  { symbol: "AAPL", change: "+1.2%", price: "$187.20", sentiment: "Bullish" },
  { symbol: "NVDA", change: "+2.9%", price: "$823.14", sentiment: "Breakout" },
  { symbol: "TSLA", change: "-0.8%", price: "$214.02", sentiment: "Volatile" },
  { symbol: "MSFT", change: "+0.6%", price: "$403.51", sentiment: "Steady" }
];

export default function LiveMarket() {
  const [symbol, setSymbol] = useState("AAPL");
  const [candles, setCandles] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCandles = async (target) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/candles/${target}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Unable to load candle data.");
        setCandles([]);
        setLoading(false);
        return;
      }
      setCandles(data.candles || []);
    } catch (err) {
      setError("Unable to reach backend for candle data.");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchCandles(symbol);
    fetchQuote(symbol);
    const interval = setInterval(() => fetchQuote(symbol), 15000);
    return () => clearInterval(interval);
  }, [symbol]);

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
              <p>60 min resolution • Last 7 days</p>
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
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder="Search symbol (e.g. AAPL)"
            />
            <button className="btn primary-btn" onClick={() => fetchCandles(symbol)} disabled={loading}>
              {loading ? "Loading" : "Load"}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}
          <CandleChart candles={candles} />
        </div>

        <div className="live-side">
          <div className="live-panel">
            <h4>Top Movers</h4>
            <div className="live-table">
              {movers.map((mover) => (
                <div key={mover.symbol} className="live-row">
                  <span className="live-symbol">{mover.symbol}</span>
                  <span className={mover.change.startsWith("-") ? "negative" : "positive"}>{mover.change}</span>
                  <span>{mover.price}</span>
                  <span className="live-chip">{mover.sentiment}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="live-panel">
            <h4>Signal Stack</h4>
            <ul className="live-signals">
              <li>Momentum score: 82/100</li>
              <li>Trend: Higher highs</li>
              <li>Liquidity: Strong</li>
              <li>Volatility: Controlled</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
