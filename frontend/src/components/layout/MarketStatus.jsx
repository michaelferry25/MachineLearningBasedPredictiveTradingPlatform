import { useState, useEffect } from "react";

function getMarketStatus() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = eastern.getDay();
  const hours = eastern.getHours();
  const minutes = eastern.getMinutes();
  const time = hours * 60 + minutes;

  const isWeekend = day === 0 || day === 6;
  const preMarketOpen = 4 * 60;       // 4:00 AM ET
  const marketOpen = 9 * 60 + 30;     // 9:30 AM ET
  const marketClose = 16 * 60;        // 4:00 PM ET
  const afterHoursClose = 20 * 60;    // 8:00 PM ET

  if (isWeekend) {
    // Calculate minutes until Monday 9:30 AM
    const daysUntilMonday = day === 0 ? 1 : 2;
    const minsLeft = daysUntilMonday * 24 * 60 + (marketOpen - time);
    return { status: "closed", label: "Closed", next: "Mon 9:30 AM", minsLeft };
  }

  if (time >= marketOpen && time < marketClose) {
    return { status: "open", label: "Market Open", next: "4:00 PM", minsLeft: marketClose - time };
  }
  if (time >= preMarketOpen && time < marketOpen) {
    return { status: "pre-market", label: "Pre-Market", next: "9:30 AM", minsLeft: marketOpen - time };
  }
  if (time >= marketClose && time < afterHoursClose) {
    return { status: "after-hours", label: "After-Hours", next: "8:00 PM", minsLeft: afterHoursClose - time };
  }

  // Overnight — market opens next day (or Monday if Friday night)
  let minsLeft;
  if (day === 5 && time >= afterHoursClose) {
    minsLeft = (2 * 24 * 60) + (marketOpen - time) + (24 * 60);
    return { status: "closed", label: "Closed", next: "Mon 9:30 AM", minsLeft };
  }
  minsLeft = time < preMarketOpen ? (preMarketOpen - time) : (24 * 60 - time + preMarketOpen);
  return { status: "closed", label: "Closed", next: "4:00 AM Pre", minsLeft };
}

function formatCountdown(mins) {
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function MarketStatus() {
  const [market, setMarket] = useState(getMarketStatus);

  useEffect(() => {
    const interval = setInterval(() => setMarket(getMarketStatus()), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`market-status market-status-${market.status}`}>
      <span className="market-status-dot" />
      <span className="market-status-label">{market.label}</span>
      {market.minsLeft > 0 && (
        <span className="market-status-countdown">{formatCountdown(market.minsLeft)}</span>
      )}
    </div>
  );
}
