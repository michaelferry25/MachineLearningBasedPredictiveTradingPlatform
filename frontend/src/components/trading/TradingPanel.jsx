import { useState, useEffect, useRef, useCallback } from "react";
import { showToast } from "../layout/Toast";
import Confetti from "../layout/Confetti";
import TradeReceipt from "./TradeReceipt";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function TradingPanel({ symbol, currentPrice, onTradeComplete, authToken, heldQuantity = 0 }) {
  const [mode, setMode] = useState("shares"); // "shares" | "dollars"
  const [sharesInput, setSharesInput] = useState("1");
  const [dollarsInput, setDollarsInput] = useState("");
  const [tradeResult, setTradeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(null); // null | "buy" | "sell"
  const [cooldown, setCooldown] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const resultTimer = useRef(null);
  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);
  const closeReceipt = useCallback(() => setReceipt(null), []);

  // Clear result after 5 seconds
  useEffect(() => {
    if (tradeResult) {
      resultTimer.current = setTimeout(() => setTradeResult(null), 5000);
      return () => clearTimeout(resultTimer.current);
    }
  }, [tradeResult]);

  // Compute resolved quantity from either mode (fractional shares supported)
  const resolvedQuantity = mode === "shares"
    ? Math.max(0, parseFloat(sharesInput) || 0)
    : currentPrice > 0
      ? parseFloat(((parseFloat(dollarsInput) || 0) / currentPrice).toFixed(6))
      : 0;

  const totalValue = currentPrice ? (currentPrice * resolvedQuantity).toFixed(2) : "0.00";

  // Format quantity for display (trim trailing zeros)
  const fmtQty = (q) => {
    if (q === 0) return "0";
    if (Number.isInteger(q)) return q.toString();
    return parseFloat(q.toFixed(6)).toString();
  };

  const handleSharesChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,6}$/.test(val)) {
      setSharesInput(val);
    }
  };

  const handleDollarsChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setDollarsInput(val);
    }
  };

  const initiateOrder = (type) => {
    if (!authToken) {
      setTradeResult({ error: "Please sign in to place trades." });
      return;
    }
    if (!symbol || !currentPrice || currentPrice <= 0) {
      setTradeResult({ error: "Please fetch a valid stock price first" });
      return;
    }
    if (resolvedQuantity <= 0) {
      setTradeResult({ error: mode === "shares" ? "Enter a valid number of shares" : "Enter a valid dollar amount" });
      return;
    }
    setConfirming(type);
  };

  const cancelOrder = () => setConfirming(null);

  const handleSellAll = () => {
    if (!authToken) {
      setTradeResult({ error: "Please sign in to place trades." });
      return;
    }
    if (!symbol || !currentPrice || currentPrice <= 0) {
      setTradeResult({ error: "Please fetch a valid stock price first" });
      return;
    }
    setMode("shares");
    setSharesInput(String(parseFloat(heldQuantity.toFixed(6))));
    setConfirming("sell");
  };

  const confirmOrder = async () => {
    const type = confirming;
    setConfirming(null);
    setLoading(true);
    setTradeResult(null);

    try {
      const res = await fetch(`${API_URL}/api/trading/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ symbol, quantity: resolvedQuantity })
      });

      const data = await res.json();
      setTradeResult(data);

      if (data.success) {
        showToast(data.message, "success");
        if (data.trade) setReceipt(data.trade);
        if (type === "sell" && data.trade?.pnl > 0) setShowConfetti(true);
        if (onTradeComplete) onTradeComplete();
      } else if (data.error) {
        showToast(data.error, "error");
      }
    } catch (error) {
      setTradeResult({ error: "Trade failed: " + error.message });
      showToast("Trade failed: " + error.message, "error");
    }

    setLoading(false);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1000);
  };

  const buttonsDisabled = loading || cooldown || !currentPrice || resolvedQuantity <= 0;

  return (
    <div className="trading-panel">
      <h3>Demo Trading</h3>

      <div className="trade-input-group">
        <div className="input-row">
          <label>Symbol</label>
          <input type="text" value={symbol || ""} disabled className="disabled-input" />
        </div>

        {/* Mode toggle */}
        <div className="trade-mode-toggle">
          <button
            className={`trade-mode-btn ${mode === "shares" ? "active" : ""}`}
            onClick={() => setMode("shares")}
          >
            Shares
          </button>
          <button
            className={`trade-mode-btn ${mode === "dollars" ? "active" : ""}`}
            onClick={() => setMode("dollars")}
          >
            Dollars
          </button>
        </div>

        {mode === "shares" ? (
          <div className="input-row">
            <label>Quantity</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Enter shares amount"
              value={sharesInput}
              onChange={handleSharesChange}
            />
          </div>
        ) : (
          <div className="input-row">
            <label>Amount ($)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Enter dollar amount"
              value={dollarsInput}
              onChange={handleDollarsChange}
            />
            <div className="quick-amount-buttons">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  className={`quick-amount-btn ${dollarsInput === String(amt) ? "active" : ""}`}
                  onClick={() => setDollarsInput(String(amt))}
                >
                  ${amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>
            {currentPrice > 0 && resolvedQuantity > 0 && (
              <span className="trade-conversion-hint">
                ≈ {fmtQty(resolvedQuantity)} share{resolvedQuantity !== 1 ? "s" : ""} at ${currentPrice.toFixed(2)}
              </span>
            )}
          </div>
        )}

        <div className="input-row">
          <label>Price</label>
          <input type="text" value={currentPrice ? `$${currentPrice.toFixed(2)}` : "$0.00"} disabled className="disabled-input" />
        </div>

        <div className="total-value">
          <span className="label">Total Value</span>
          <span className="value">${totalValue}</span>
        </div>
      </div>

      {!confirming ? (
        <div className="trade-buttons-group">
          <div className="trade-buttons">
            <button className="btn buy-btn" onClick={() => initiateOrder("buy")} disabled={buttonsDisabled}>
              {loading ? "Processing..." : "Buy"}
            </button>
            <button className="btn sell-btn" onClick={() => initiateOrder("sell")} disabled={buttonsDisabled}>
              {loading ? "Processing..." : "Sell"}
            </button>
          </div>
          {heldQuantity > 0 && (
            <button
              className="btn sell-all-btn"
              onClick={handleSellAll}
              disabled={loading || cooldown || !currentPrice}
            >
              Sell All ({fmtQty(heldQuantity)} shares)
            </button>
          )}
        </div>
      ) : (
        <div className="trade-confirm-box">
          <p className="trade-confirm-text">
            {confirming === "buy" ? "Buy" : "Sell"} {fmtQty(resolvedQuantity)} share{resolvedQuantity !== 1 ? "s" : ""} of {symbol} at ${currentPrice.toFixed(2)} for ${totalValue}?
          </p>
          <div className="trade-confirm-buttons">
            <button className={`btn ${confirming === "buy" ? "buy-btn" : "sell-btn"}`} onClick={confirmOrder}>
              Confirm {confirming === "buy" ? "Buy" : "Sell"}
            </button>
            <button className="btn trade-cancel-btn" onClick={cancelOrder}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {tradeResult && (
        <div className={`trade-result ${tradeResult.error ? "error" : "success"}`}>
          {tradeResult.error ? <p>{tradeResult.error}</p> : <p>{tradeResult.message}</p>}
        </div>
      )}
      <Confetti active={showConfetti} onDone={handleConfettiDone} />
      <TradeReceipt trade={receipt} onClose={closeReceipt} />
    </div>
  );
}
