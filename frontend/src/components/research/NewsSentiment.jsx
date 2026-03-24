import { useState, useEffect } from "react";
import "./NewsSentiment.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function NewsSentiment({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (symbol) {
      setData(null);
      setError(null);
      fetchSentiment();
    }
  }, [symbol]);

  const fetchSentiment = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/ml/sentiment/${symbol}`);
      const json = await res.json();
      if (json.error) {
        setError(json.message || json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      setError("Could not reach sentiment service");
    } finally {
      setLoading(false);
    }
  };

  if (!symbol) {
    return (
      <div className="sentiment-dashboard">
        <div className="sentiment-dash-header">
          <h3>AI Sentiment Intelligence</h3>
        </div>
        <div className="sentiment-empty">Select a stock to analyse market sentiment</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sentiment-dashboard">
        <div className="sentiment-dash-header">
          <h3>AI Sentiment Intelligence — {symbol}</h3>
        </div>
        <div className="sentiment-loading">
          <div className="sentiment-spinner" />
          <p>Scanning news articles & Reddit posts for {symbol}...</p>
          <span className="sentiment-loading-sub">Analysing r/wallstreetbets, r/stocks, r/investing and more</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="sentiment-dashboard">
        <div className="sentiment-dash-header">
          <div>
            <h3>AI Sentiment Intelligence — {symbol}</h3>
          </div>
        </div>
        <div className="sentiment-error-state">
          <p>{error || "No sentiment data available"}</p>
          <button className="sentiment-refresh-btn" onClick={fetchSentiment}>
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  const combined = data.combined || {};
  const news = data.news || {};
  const reddit = data.reddit || {};

  const scoreColor = (s) => (s > 0.1 ? "#3fb950" : s < -0.1 ? "#ff7b72" : "#f0883e");
  const labelClass = (l) => (l || "neutral").toLowerCase().replace(" ", "-");

  const agreementText = {
    strong: "News & Reddit agree",
    divergent: "Sources disagree",
    mixed: "Mixed signals",
  };

  const agreementIcon = {
    strong: "\u2705",
    divergent: "\u26A0\uFE0F",
    mixed: "\u2796",
  };

  const subredditCounts = reddit.subreddit_counts || {};
  const activeSubreddits = Object.entries(subredditCounts).filter(([, c]) => c > 0);

  return (
    <div className="sentiment-dashboard">
      <div className="sentiment-dash-header">
        <div>
          <h3>AI Sentiment Intelligence — {symbol}</h3>
          <span className="sentiment-subtitle">
            Multi-source NLP analysis across {combined.total_sources || 0} data points
          </span>
        </div>
        <button className="sentiment-refresh-btn" onClick={fetchSentiment}>
          Refresh
        </button>
      </div>

      {/* ===== Combined Score Hero ===== */}
      <div className="sentiment-hero">
        <div className="hero-score-ring" style={{ borderColor: scoreColor(combined.score) }}>
          <span className="hero-score" style={{ color: scoreColor(combined.score) }}>
            {combined.score >= 0 ? "+" : ""}
            {combined.score?.toFixed(2)}
          </span>
          <span className="hero-score-label">NLP Score</span>
        </div>
        <div className="hero-details">
          <span className={`hero-badge ${labelClass(combined.label)}`}>{combined.label}</span>
          <div className="hero-confidence">
            <span>Confidence</span>
            <div className="mini-bar">
              <div
                className="mini-bar-fill"
                style={{
                  width: `${combined.confidence || 50}%`,
                  background: scoreColor(combined.score),
                }}
              />
            </div>
            <span>{combined.confidence?.toFixed(0)}%</span>
          </div>
          <div className="hero-agreement">
            <span>{agreementIcon[combined.agreement] || ""}</span>
            <span>{agreementText[combined.agreement] || "Analysing..."}</span>
          </div>
        </div>
        <div className="hero-weights">
          <div className="weight-item">
            <span className="weight-icon">NEWS</span>
            <div className="weight-bar">
              <div
                className="weight-fill news-fill"
                style={{ width: `${(combined.news_weight || 0.5) * 100}%` }}
              />
            </div>
            <span>{((combined.news_weight || 0.5) * 100).toFixed(0)}%</span>
          </div>
          <div className="weight-item">
            <span className="weight-icon">REDDIT</span>
            <div className="weight-bar">
              <div
                className="weight-fill reddit-fill"
                style={{ width: `${(combined.reddit_weight || 0.5) * 100}%` }}
              />
            </div>
            <span>{((combined.reddit_weight || 0.5) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* ===== Source Comparison Strip ===== */}
      <div className="source-comparison">
        <div className="source-card">
          <div className="source-header">
            <span className="source-icon">NEWS</span>
            <span className={`source-badge ${labelClass(news.label)}`}>{news.label}</span>
          </div>
          <div className="source-score" style={{ color: scoreColor(news.score) }}>
            {news.score >= 0 ? "+" : ""}
            {news.score?.toFixed(3)}
          </div>
          <div className="source-ratios">
            <div className="ratio-bar-stack">
              <div className="ratio-segment pos" style={{ width: `${news.positive_ratio}%` }} />
              <div className="ratio-segment neu" style={{ width: `${news.neutral_ratio}%` }} />
              <div className="ratio-segment neg" style={{ width: `${news.negative_ratio}%` }} />
            </div>
            <div className="ratio-labels">
              <span style={{ color: "#3fb950" }}>{news.positive_ratio}%</span>
              <span style={{ color: "#8b949e" }}>{news.neutral_ratio}%</span>
              <span style={{ color: "#ff7b72" }}>{news.negative_ratio}%</span>
            </div>
          </div>
          <span className="source-meta">{news.article_count || 0} articles analysed</span>
        </div>

        <div className="source-vs">VS</div>

        <div className="source-card">
          <div className="source-header">
            <span className="source-icon reddit-icon">REDDIT</span>
            <span className={`source-badge ${labelClass(reddit.label)}`}>{reddit.label}</span>
          </div>
          <div className="source-score" style={{ color: scoreColor(reddit.score) }}>
            {reddit.score >= 0 ? "+" : ""}
            {reddit.score?.toFixed(3)}
          </div>
          <div className="source-ratios">
            <div className="ratio-bar-stack">
              <div className="ratio-segment pos" style={{ width: `${reddit.positive_ratio}%` }} />
              <div className="ratio-segment neu" style={{ width: `${reddit.neutral_ratio}%` }} />
              <div className="ratio-segment neg" style={{ width: `${reddit.negative_ratio}%` }} />
            </div>
            <div className="ratio-labels">
              <span style={{ color: "#3fb950" }}>{reddit.positive_ratio}%</span>
              <span style={{ color: "#8b949e" }}>{reddit.neutral_ratio}%</span>
              <span style={{ color: "#ff7b72" }}>{reddit.negative_ratio}%</span>
            </div>
          </div>
          <span className="source-meta">{reddit.post_count || 0} posts from {activeSubreddits.length} subreddits</span>
        </div>
      </div>

      {/* ===== Subreddit Breakdown ===== */}
      {activeSubreddits.length > 0 && (
        <div className="subreddit-breakdown">
          <h4>Subreddit Activity</h4>
          <div className="subreddit-chips">
            {activeSubreddits
              .sort((a, b) => b[1] - a[1])
              .map(([sub, count]) => (
                <span key={sub} className={`sub-chip ${sub === "wallstreetbets" ? "wsb" : ""}`}>
                  r/{sub} <strong>{count}</strong>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* ===== Tab Bar ===== */}
      <div className="sentiment-tab-bar">
        {["overview", "reddit", "news"].map((tab) => (
          <button
            key={tab}
            className={`sentiment-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" ? "Top Signals" : tab === "reddit" ? "Reddit Posts" : "News Articles"}
          </button>
        ))}
      </div>

      {/* ===== Tab Content ===== */}
      <div className="sentiment-tab-content">
        {activeTab === "overview" && (
          <div className="signals-grid">
            {[...(reddit.top_posts || []).slice(0, 3).map((p) => ({ ...p, _source: "reddit" })),
              ...(news.top_articles || []).slice(0, 3).map((a) => ({ ...a, _source: "news" }))
            ].map((item, idx) => (
              <div key={idx} className="signal-item">
                <div className="signal-item-header">
                  <span className={`signal-source-tag ${item._source}`}>
                    {item._source === "reddit" ? `r/${item.subreddit}` : item.source}
                  </span>
                  <span className={`signal-polarity ${item.sentiment}`}>
                    {item.polarity >= 0 ? "+" : ""}{item.polarity?.toFixed(2)}
                  </span>
                </div>
                <p className="signal-title">{item.title}</p>
                {item._source === "reddit" && (
                  <div className="signal-engagement">
                    <span>{item.ups} upvotes</span>
                    <span>{item.num_comments} comments</span>
                  </div>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="signal-link">
                    View source
                  </a>
                )}
              </div>
            ))}
            {(reddit.top_posts || []).length === 0 && (news.top_articles || []).length === 0 && (
              <div className="sentiment-empty">No signals found this week</div>
            )}
          </div>
        )}

        {activeTab === "reddit" && (
          <div className="posts-list">
            {(reddit.top_posts || []).map((post, idx) => (
              <div key={idx} className="post-item">
                <div className="post-item-header">
                  <span className={`sub-chip ${post.subreddit === "wallstreetbets" ? "wsb" : ""}`}>
                    r/{post.subreddit}
                  </span>
                  <span className={`signal-polarity ${post.sentiment}`}>
                    {post.polarity >= 0 ? "+" : ""}{post.polarity?.toFixed(3)}
                  </span>
                </div>
                <p className="post-title">{post.title}</p>
                <div className="post-meta">
                  <span>{post.ups} upvotes</span>
                  <span>{post.num_comments} comments</span>
                  <span>Weight: {post.weight}x</span>
                </div>
                {post.url && (
                  <a href={post.url} target="_blank" rel="noopener noreferrer" className="signal-link">
                    View on Reddit
                  </a>
                )}
              </div>
            ))}
            {(reddit.top_posts || []).length === 0 && (
              <div className="sentiment-empty">No Reddit posts found for {symbol} this week</div>
            )}
          </div>
        )}

        {activeTab === "news" && (
          <div className="posts-list">
            {(news.top_articles || []).map((article, idx) => (
              <div key={idx} className="post-item">
                <div className="post-item-header">
                  <span className="news-source-tag">{article.source}</span>
                  <span className={`signal-polarity ${article.sentiment}`}>
                    {article.polarity >= 0 ? "+" : ""}{article.polarity?.toFixed(3)}
                  </span>
                </div>
                <p className="post-title">{article.title}</p>
                {article.url && (
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="signal-link">
                    Read article
                  </a>
                )}
              </div>
            ))}
            {(news.top_articles || []).length === 0 && (
              <div className="sentiment-empty">No news articles found for {symbol}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
