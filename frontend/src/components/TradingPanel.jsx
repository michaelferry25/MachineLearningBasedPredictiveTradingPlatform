import { useState } from "react";

export default function TradingPanel({ symbol, currentPrice, onTradeComplete }) {
  const [quantity, setQuantity] = useState(1);
  const [tradeResult, setTradeResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const executeTrade = async (type) => {
    if (!symbol || !currentPrice || currentPrice <= 0) {
      setTradeResult({ error: "Please fetch a valid stock price first" });
      return;
    }

    setLoading(true);
    setTradeResult(null);

    try {
      const res = await fetch(`http://localhost:8080/api/trading/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity })
      });

      const data = await res.json();
      setTradeResult(data);
      
      if (data.success && onTradeComplete) {
        onTradeComplete();
      }
    } catch (error) {
      setTradeResult({ error: "Trade failed: " + error.message });
    }

    setLoading(false);
  };

  const totalValue = currentPrice ? (currentPrice * quantity).toFixed(2) : 0;

  return (
    <div className="trading-panel">
      <h3>Demo Trading</h3>
      
      <div className="trade-input-group">
        <div className="input-row">
          <label>Symbol</label>
          <input 
            type="text" 
            value={symbol} 
            disabled 
            className="disabled-input"
          />
        </div>

        <div className="input-row">
          <label>Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="input-row">
          <label>Price</label>
          <input 
            type="text" 
            value={currentPrice ? `$${currentPrice}` : "$0.00"} 
            disabled 
            className="disabled-input"
          />
        </div>

        <div className="total-value">
          <span className="label">Total Value</span>
          <span className="value">${totalValue}</span>
        </div>
      </div>

      <div className="trade-buttons">
        <button 
          className="btn buy-btn" 
          onClick={() => executeTrade("buy")}
          disabled={loading || !currentPrice}
        >
          {loading ? "Processing..." : "Buy"}
        </button>
        <button 
          className="btn sell-btn" 
          onClick={() => executeTrade("sell")}
          disabled={loading || !currentPrice}
        >
          {loading ? "Processing..." : "Sell"}
        </button>
      </div>

      {tradeResult && (
        <div className={`trade-result ${tradeResult.error ? 'error' : 'success'}`}>
          {tradeResult.error ? (
            <p>{tradeResult.error}</p>
          ) : (
            <p>✓ {tradeResult.message}</p>
          )}
        </div>
      )}
    </div>
  );
}