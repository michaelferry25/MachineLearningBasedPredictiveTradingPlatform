import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function TradeHistory({ authToken }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }

    fetchTradeHistory();
    const interval = setInterval(fetchTradeHistory, 10000);
    return () => clearInterval(interval);
  }, [authToken]);

  const fetchTradeHistory = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_URL}/api/trading/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setTrades(data.trades || []);
      setLoading(false);
    } catch (error) {
      /* Error handled silently */
      setLoading(false);
    }
  };

  if (!authToken) {
    return (
      <div className="trade-history-card">
        <h3>Trade History</h3>
        <div className="empty-trades">
          <p>Sign in to view your trade history</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="trade-history-card">
        <h3>Trade History</h3>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="trade-history-card">
        <h3>Trade History</h3>
        <div className="empty-trades">
          <p>No trades yet</p>
          <p className="empty-hint">Buy or sell stocks to see your history</p>
        </div>
      </div>
    );
  }

  const formatTime = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString("en-IE", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="trade-history-card">
      <h3>Trade History</h3>
      <div className="trades-list-new">
        {trades.map((trade, idx) => (
          <div key={idx} className={`trade-row ${trade.type.toLowerCase()}`}>
            <div className="trade-badge">
              <span className={`badge-${trade.type.toLowerCase()}`}>{trade.type}</span>
            </div>
            <div className="trade-info">
              <div className="trade-stock">{trade.symbol}</div>
              <div className="trade-amount">
                {trade.quantity} shares @ ${trade.price?.toFixed(2)}
                {trade.timestamp && <span> &middot; {formatTime(trade.timestamp)}</span>}
              </div>
            </div>
            <div className="trade-value">${trade.totalValue?.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
