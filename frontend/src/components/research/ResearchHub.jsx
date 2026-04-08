import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "";
const SENTIMENT_SYMBOLS = ["AAPL", "MSFT", "TSLA", "NVDA"];

function normalizeSignal(raw) {
  const map = { "STRONG BUY": "Strong Buy", "BUY": "Buy", "HOLD": "Hold", "SELL": "Sell", "STRONG SELL": "Strong Sell" };
  return map[(raw || "").toUpperCase()] || "Hold";
}

function signalClass(signal) {
  const s = normalizeSignal(signal);
  if (s === "Strong Buy" || s === "Buy") return "positive";
  if (s === "Sell" || s === "Strong Sell") return "negative";
  return "neutral";
}

function rsiLabel(rsi) {
  if (rsi > 70) return { text: "Overbought", cls: "negative" };
  if (rsi < 30) return { text: "Oversold", cls: "positive" };
  return { text: "Neutral", cls: "neutral" };
}

function volumeLabel(ratio) {
  if (ratio > 2) return { text: "Very High", cls: "negative" };
  if (ratio > 1.5) return { text: "High", cls: "neutral" };
  return { text: "Normal", cls: "positive" };
}

function macdLabel(macd, signal) {
  return (macd || 0) > (signal || 0)
    ? { text: "Bullish", cls: "positive" }
    : { text: "Bearish", cls: "negative" };
}

export default function ResearchHub({ authToken }) {
  const [scanData, setScanData] = useState(null);
  const [sentiments, setSentiments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBrief, setExpandedBrief] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const scanRes = await fetch(`${API}/api/ml/scan`)
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`ml/scan ${r.status}`)))
          .catch(err => { setError(`Could not load predictions (${err.message}).`); return null; });
        if (scanRes?.predictions) setScanData(scanRes.predictions);

        const sentMap = {};
        const sentResults = await Promise.allSettled(
          SENTIMENT_SYMBOLS.map(async sym => {
            const res = await fetch(`${API}/api/ml/sentiment/${sym}`);
            if (!res.ok) throw new Error(`${sym} ${res.status}`);
            const data = await res.json();
            if (!data.error) sentMap[sym] = data;
          })
        );
        const sentFailures = sentResults.filter(r => r.status === "rejected").length;
        if (sentFailures === SENTIMENT_SYMBOLS.length) {
          setError(prev => prev || "Sentiment service unavailable.");
        }
        setSentiments(sentMap);
      } catch (e) {
        setError(`Failed to load research data: ${e.message}`);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- Brief 1: ML Stock Predictions ---
  const buildPredictionBrief = () => {
    if (!scanData) return null;
    const bullish = scanData.filter(p => ["BUY", "STRONG BUY"].includes((p.signal || "").toUpperCase()));
    const sorted = [...scanData].sort((a, b) => {
      const aChg = Math.abs(((Number(a.prediction) - Number(a.current_price)) / Number(a.current_price)) * 100);
      const bChg = Math.abs(((Number(b.prediction) - Number(b.current_price)) / Number(b.current_price)) * 100);
      return bChg - aChg;
    });
    const top = sorted[0];
    const topChg = ((Number(top.prediction) - Number(top.current_price)) / Number(top.current_price) * 100);
    const avgConf = (scanData.reduce((s, p) => s + (Number(p.confidence) || 0), 0) / scanData.length).toFixed(1);
    const confLevel = avgConf >= 70 ? "high" : avgConf >= 55 ? "moderate" : "low";

    return {
      title: "ML Stock Predictions",
      icon: "chart-line",
      points: [
        `${bullish.length} out of ${scanData.length} stocks look bullish (the model thinks they'll go up)`,
        `${top.symbol} has the biggest predicted move: ${topChg >= 0 ? "+" : ""}${topChg.toFixed(2)}%`,
        `Average model confidence is ${avgConf}% — ${confLevel} conviction`
      ]
    };
  };

  // --- Brief 2: Technical Health Check ---
  const buildTechnicalBrief = () => {
    if (!scanData) return null;
    const overbought = scanData.filter(p => (p.technical_indicators?.rsi || 50) > 70);
    const oversold = scanData.filter(p => (p.technical_indicators?.rsi || 50) < 30);
    const bullishMacd = scanData.filter(p => {
      const ti = p.technical_indicators || {};
      return (ti.macd || 0) > (ti.macd_signal || 0);
    });
    const highVol = scanData.filter(p => (p.technical_indicators?.volume_ratio || 1) > 1.5);

    const points = [];
    if (overbought.length > 0) {
      points.push(`${overbought.map(p => p.symbol).join(", ")} look${overbought.length === 1 ? "s" : ""} overbought (RSI > 70) — may be due for a pullback`);
    } else if (oversold.length > 0) {
      points.push(`${oversold.map(p => p.symbol).join(", ")} look${oversold.length === 1 ? "s" : ""} oversold (RSI < 30) — could be a buying opportunity`);
    } else {
      points.push("All stocks have healthy RSI readings — no extreme conditions detected");
    }
    points.push(`${bullishMacd.length} of ${scanData.length} stocks have bullish momentum (MACD crossover) — the trend is in their favour`);
    if (highVol.length > 0) {
      points.push(`${highVol.map(p => p.symbol).join(", ")} ha${highVol.length === 1 ? "s" : "ve"} unusually high trading volume — something's catching attention`);
    } else {
      points.push("Trading volume is normal across all stocks — no unusual activity");
    }

    return { title: "Technical Health Check", icon: "activity", points };
  };

  // --- Brief 3: What's the Buzz? ---
  const buildSentimentBrief = () => {
    const entries = Object.entries(sentiments).filter(([, s]) => s.combined);
    if (entries.length === 0) return {
      title: "What's the Buzz?",
      icon: "message-circle",
      points: ["Sentiment data is still loading — check back in a moment"]
    };

    const sorted = entries.sort((a, b) => (b[1].combined.score || 0) - (a[1].combined.score || 0));
    const [topSym, topSent] = sorted[0];
    const [botSym, botSent] = sorted[sorted.length - 1];
    const agreeing = entries.filter(([, s]) => s.combined?.agreement === "strong");

    const points = [
      `${topSym} has the most positive news & social media buzz (${topSent.combined.label})`,
    ];
    if (sorted.length > 1 && botSent.combined.score < topSent.combined.score) {
      points.push(`${botSym} has the weakest sentiment — worth watching carefully (${botSent.combined.label})`);
    } else {
      points.push("All tracked stocks have similar sentiment levels");
    }
    points.push(
      agreeing.length > 0
        ? `News and Reddit agree on ${agreeing.map(([sym]) => sym).join(", ")} — stronger signal`
        : "Mixed signals between news and social media — be cautious"
    );

    return { title: "What's the Buzz?", icon: "message-circle", points };
  };

  // --- Expanded content ---
  const renderExpanded = (title) => {
    if (title === "ML Stock Predictions" && scanData) {
      return (
        <div className="brief-expanded">
          <table className="brief-expanded-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>Price</th>
                <th>Predicted</th>
                <th>Change</th>
                <th>Signal</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {scanData.map(p => {
                const cur = Number(p.current_price) || 0;
                const pred = Number(p.prediction) || 0;
                const chg = cur ? ((pred - cur) / cur * 100) : 0;
                return (
                  <tr key={p.symbol}>
                    <td className="brief-symbol">{p.symbol}</td>
                    <td>${cur.toFixed(2)}</td>
                    <td>${pred.toFixed(2)}</td>
                    <td className={chg >= 0 ? "positive" : "negative"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</td>
                    <td><span className={`indicator-label ${signalClass(p.signal)}`}>{normalizeSignal(p.signal)}</span></td>
                    <td>{Number(p.confidence).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (title === "Technical Health Check" && scanData) {
      return (
        <div className="brief-expanded">
          <table className="brief-expanded-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>RSI</th>
                <th>Status</th>
                <th>MACD</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {scanData.map(p => {
                const ti = p.technical_indicators || {};
                const rsi = rsiLabel(ti.rsi || 50);
                const macd = macdLabel(ti.macd, ti.macd_signal);
                const vol = volumeLabel(ti.volume_ratio || 1);
                return (
                  <tr key={p.symbol}>
                    <td className="brief-symbol">{p.symbol}</td>
                    <td>{(ti.rsi || 50).toFixed(1)}</td>
                    <td><span className={`indicator-label ${rsi.cls}`}>{rsi.text}</span></td>
                    <td><span className={`indicator-label ${macd.cls}`}>{macd.text}</span></td>
                    <td><span className={`indicator-label ${vol.cls}`}>{vol.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (title === "What's the Buzz?") {
      const entries = Object.entries(sentiments).filter(([, s]) => s.combined);
      if (entries.length === 0) return <div className="brief-expanded"><p style={{ color: "#8b949e" }}>No sentiment data available yet.</p></div>;
      return (
        <div className="brief-expanded">
          <table className="brief-expanded-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>Overall</th>
                <th>News</th>
                <th>Reddit</th>
                <th>Agreement</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([sym, s]) => (
                <tr key={sym}>
                  <td className="brief-symbol">{sym}</td>
                  <td><span className={`indicator-label ${s.combined.score > 0.05 ? "positive" : s.combined.score < -0.05 ? "negative" : "neutral"}`}>{s.combined.label}</span></td>
                  <td>{s.news?.label || "N/A"}</td>
                  <td>{s.reddit?.label || "N/A"}</td>
                  <td>{s.combined.agreement === "strong" ? "News & Reddit agree" : "Mixed signals"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  const briefs = [buildPredictionBrief(), buildTechnicalBrief(), buildSentimentBrief()].filter(Boolean);

  if (loading) {
    return (
      <section className="section-wrapper" id="research">
        <div className="section-header">
          <span className="section-kicker">Research</span>
          <h2>ML Market Research Briefs</h2>
          <p>Analysing stocks, news, and social media...</p>
        </div>
        <div className="research-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="research-card">
              <h3>Loading...</h3>
              <ul><li style={{ color: "#6e7681" }}>Fetching latest data...</li></ul>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (briefs.length === 0) {
    return (
      <section className="section-wrapper" id="research">
        <div className="section-header">
          <span className="section-kicker">Research</span>
          <h2>ML Market Research Briefs</h2>
          <p role="alert">{error || "Unable to load research data. Make sure the ML service is running and try again."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-wrapper" id="research">
      <div className="section-header">
        <span className="section-kicker">Research</span>
        <h2>ML Market Research Briefs</h2>
        <p>The MarketMind ensemble analyses stocks, news and social media — here's what it found, explained simply.</p>
      </div>

      <div className="research-grid">
        {briefs.map(brief => {
          const isExpanded = expandedBrief === brief.title;
          return (
            <div key={brief.title} className={`research-card ${isExpanded ? "expanded" : ""}`}>
              <h3>{brief.title}</h3>
              <ul>
                {brief.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
              <button
                className="btn secondary small-btn"
                onClick={() => setExpandedBrief(isExpanded ? null : brief.title)}
              >
                {isExpanded ? "Close brief" : "Open brief"}
              </button>
              {isExpanded && renderExpanded(brief.title)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
