import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function TradeHistory({ authToken }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }

    fetchTradeHistory();
    const interval = setInterval(fetchTradeHistory, 5000);
    return () => clearInterval(interval);
  }, [authToken]);

  const fetchTradeHistory = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_URL}/api/trading/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      setTrades(data.trades || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch trade history", error);
      setLoading(false);
    }
  };

  if (!authToken) {
    return (
      <div className="trade-history-card">
        <h3>📜 Trade History</h3>
        <div className="empty-trades">
          <div className="empty-icon">🔐</div>
          <p>Sign in to view your trade history</p>
          <p className="empty-hint">Your simulated trades will appear here</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="trade-history-card">
        <h3>📜 Recent Trades</h3>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="trade-history-card">
        <h3>📜 Trade History</h3>
        <div className="empty-trades">
          <div className="empty-icon">📋</div>
          <p>No trades yet</p>
          <p className="empty-hint">Buy or sell stocks to see your history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-history-card">
      <h3>📜 Recent Trades</h3>
      <div className="trades-list-new">
        {trades.slice(-5).reverse().map((trade, idx) => (
          <div key={idx} className={`trade-row ${trade.type.toLowerCase()}`}>
            <div className="trade-badge">
              <span className={`badge-${trade.type.toLowerCase()}`}>{trade.type}</span>
            </div>
            <div className="trade-info">
              <div className="trade-stock">{trade.symbol}</div>
              <div className="trade-amount">
                {trade.quantity} shares @ ${trade.price?.toFixed(2)}
              </div>
            </div>
            <div className="trade-value">${trade.totalValue?.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
