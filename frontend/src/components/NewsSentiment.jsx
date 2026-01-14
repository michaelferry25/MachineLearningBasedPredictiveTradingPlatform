import { useState, useEffect } from "react";

export default function NewsSentiment({ symbol }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbol) {
      fetchNews();
    }
  }, [symbol]);

  const fetchNews = async () => {
    if (!symbol) return;
    
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/news/${symbol}`);
      const data = await res.json();
      setNews(data.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch news", error);
      setLoading(false);
    }
  };

  if (!symbol) {
    return (
      <div className="news-sentiment-card">
        <h3>📰 Market News</h3>
        <div className="empty-news">
          <p>Select a stock to view related news</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="news-sentiment-card">
        <h3>📰 Market News</h3>
        <p className="loading-text">Loading news...</p>
      </div>
    );
  }

  const getSentimentColor = (sentiment) => {
    if (sentiment === 'positive') return 'positive';
    if (sentiment === 'negative') return 'negative';
    return 'neutral';
  };

  const getSentimentIcon = (sentiment) => {
    if (sentiment === 'positive') return '😊';
    if (sentiment === 'negative') return '😟';
    return '😐';
  };

  return (
    <div className="news-sentiment-card">
      <h3>📰 Market News - {symbol}</h3>
      <div className="news-list">
        {news.length === 0 ? (
          <p className="no-news">No news available</p>
        ) : (
          news.map((article, idx) => (
            <div key={idx} className="news-item">
              <div className="news-header">
                <span className={`sentiment-badge ${getSentimentColor(article.sentiment)}`}>
                  {getSentimentIcon(article.sentiment)} {article.sentiment}
                </span>
                <span className="news-source">{article.source}</span>
              </div>
              <h4 className="news-title">{article.title}</h4>
              {article.url && (
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="news-link">
                  Read more →
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}