import { useEffect, useState } from "react";

const sessions = [
  {
    name: "New York",
    exchange: "NYSE / Nasdaq",
    tz: "America/New_York",
    open: "09:30",
    close: "16:00",
    accent: "positive"
  },
  {
    name: "London",
    exchange: "LSE",
    tz: "Europe/London",
    open: "08:00",
    close: "16:30",
    accent: "neutral"
  },
  {
    name: "Tokyo",
    exchange: "TSE",
    tz: "Asia/Tokyo",
    open: "09:00",
    close: "15:00",
    accent: "negative"
  }
];

const getTimeParts = (timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  return { hour, minute, weekday };
};

const toMinutes = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const getStatus = ({ open, close }, parts) => {
  const weekend = parts.weekday === "Sat" || parts.weekday === "Sun";
  if (weekend) {
    return { label: "Closed", state: "closed" };
  }

  const now = parts.hour * 60 + parts.minute;
  const openMinutes = toMinutes(open);
  const closeMinutes = toMinutes(close);

  if (now >= openMinutes && now <= closeMinutes) {
    const minutesLeft = closeMinutes - now;
    if (minutesLeft <= 30) {
      return { label: "Closing Soon", state: "warning" };
    }
    return { label: "Open", state: "open" };
  }

  const minutesToOpen = openMinutes - now;
  if (minutesToOpen > 0 && minutesToOpen <= 30) {
    return { label: "Opening Soon", state: "warning" };
  }

  return { label: "Closed", state: "closed" };
};

export default function MarketSessions() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="section-wrapper" id="sessions">
      <div className="section-header">
        <span className="section-kicker">Market Clock</span>
        <h2>Global sessions & live trading windows</h2>
        <p>Track regional open/close windows and align your strategy with liquidity peaks.</p>
      </div>

      <div className="session-grid">
        {sessions.map((session) => {
          const parts = getTimeParts(session.tz);
          const status = getStatus(session, parts);
          const timeLabel = new Intl.DateTimeFormat("en-GB", {
            timeZone: session.tz,
            hour: "2-digit",
            minute: "2-digit"
          }).format(now);

          return (
            <div key={session.name} className="session-card">
              <div className="session-header">
                <div>
                  <h3>{session.name}</h3>
                  <p className="session-exchange">{session.exchange}</p>
                </div>
                <span className={`session-status ${status.state}`}>{status.label}</span>
              </div>
              <div className="session-time">{timeLabel}</div>
              <div className="session-meta">
                {session.open} - {session.close} ({session.tz.split("/")[1]})
              </div>
              <div className={`session-accent ${session.accent}`}>
                Liquidity focus: {session.accent === "positive" ? "High" : session.accent === "neutral" ? "Balanced" : "Opportunity"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
