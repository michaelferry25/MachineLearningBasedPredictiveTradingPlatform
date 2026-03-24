import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function PopularStocks({ onSelectStock }) {
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple', color: '#000000' },
    { symbol: 'GOOGL', name: 'Google', color: '#4285F4' },
    { symbol: 'MSFT', name: 'Microsoft', color: '#00A4EF' },
    { symbol: 'TSLA', name: 'Tesla', color: '#E82127' },
    { symbol: 'AMZN', name: 'Amazon', color: '#FF9900' },
    { symbol: 'NVDA', name: 'NVIDIA', color: '#76B900' },
    { symbol: 'META', name: 'Meta', color: '#0668E1' },
    { symbol: 'NFLX', name: 'Netflix', color: '#E50914' },
  ];

  const [quotes, setQuotes] = useState({});
  const intervalRef = useRef(null);

  const fetchQuotes = async () => {
    const results = await Promise.allSettled(
      popularStocks.map(async (stock) => {
        const res = await fetch(`${API_URL}/api/price/${stock.symbol}`);
        const data = await res.json();
        return { symbol: stock.symbol, ...data };
      })
    );

    const newQuotes = {};
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.price > 0) {
        newQuotes[r.value.symbol] = r.value;
      }
    });
    setQuotes(newQuotes);
  };

  useEffect(() => {
    fetchQuotes();
    intervalRef.current = setInterval(fetchQuotes, 60000);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="popular-stocks">
      <h3>Popular Stocks</h3>
      <div className="stock-grid">
        {popularStocks.map((stock) => {
          const q = quotes[stock.symbol];
          const pct = q?.changePercent ?? null;
          const isPositive = pct !== null && pct >= 0;

          return (
            <button
              key={stock.symbol}
              className="stock-chip"
              onClick={() => onSelectStock(stock.symbol)}
              style={{ borderColor: stock.color }}
            >
              <div className="stock-chip-content">
                <span className="stock-symbol">{stock.symbol}</span>
                <span className="stock-name">{stock.name}</span>
              </div>
              {pct !== null && (
                <span
                  className="stock-chip-change"
                  style={{ color: isPositive ? '#3fb950' : '#f85149' }}
                >
                  {isPositive ? '+' : ''}{pct.toFixed(2)}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
