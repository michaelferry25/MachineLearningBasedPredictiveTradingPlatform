import { useEffect, useRef } from "react";

function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TradeReceipt({ trade, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!trade) return null;

  const isBuy = trade.type === "BUY";
  const now = new Date();
  const pnl = trade.pnl ?? null;
  const hasPnl = pnl !== null && !isBuy;

  return (
    <div className="receipt-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="receipt-modal">
        <div className={`receipt-header ${isBuy ? "receipt-buy" : "receipt-sell"}`}>
          <div className="receipt-icon">
            {isBuy ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            )}
          </div>
          <span className="receipt-type">{isBuy ? "Buy" : "Sell"} Order Filled</span>
          <span className="receipt-symbol">{trade.symbol}</span>
        </div>

        <div className="receipt-body">
          <div className="receipt-row">
            <span className="receipt-label">Type</span>
            <span className={`receipt-value receipt-tag ${isBuy ? "tag-buy" : "tag-sell"}`}>
              {trade.type}
            </span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Symbol</span>
            <span className="receipt-value receipt-value-bold">{trade.symbol}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Quantity</span>
            <span className="receipt-value">{trade.quantity} shares</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Price</span>
            <span className="receipt-value">${trade.price.toFixed(2)}</span>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-row receipt-total-row">
            <span className="receipt-label">Total</span>
            <span className="receipt-value receipt-value-bold">${trade.total.toFixed(2)}</span>
          </div>

          {hasPnl && (
            <div className="receipt-row">
              <span className="receipt-label">Realized P&L</span>
              <span className={`receipt-value ${pnl >= 0 ? "receipt-profit" : "receipt-loss"}`}>
                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
              </span>
            </div>
          )}

          <div className="receipt-divider" />

          <div className="receipt-row receipt-meta">
            <span className="receipt-label">Date</span>
            <span className="receipt-value">{formatDate(now)}</span>
          </div>
          <div className="receipt-row receipt-meta">
            <span className="receipt-label">Time</span>
            <span className="receipt-value">{formatTime(now)}</span>
          </div>
          <div className="receipt-row receipt-meta">
            <span className="receipt-label">Order ID</span>
            <span className="receipt-value receipt-order-id">
              {Date.now().toString(36).toUpperCase()}
            </span>
          </div>
        </div>

        <button className="receipt-close-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
