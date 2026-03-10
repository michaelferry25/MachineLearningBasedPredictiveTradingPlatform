import React, { useState, useEffect } from 'react';
import './FearGreedGauge.css';

const API_URL = import.meta.env.VITE_ML_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001';

const FearGreedGauge = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchFearGreed();
    const interval = setInterval(fetchFearGreed, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  const fetchFearGreed = async () => {
    try {
      const res = await fetch(`${API_URL}/market-fear`);
      const json = await res.json();
      if (!json.error) setData(json);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fear-greed-card">
        <h3>Market Fear & Greed</h3>
        <div className="fg-loading">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const { score, label, components } = data;
  const needleRotation = -90 + (score / 100) * 180; // -90 = far left (fear), +90 = far right (greed)

  const getColor = (s) => {
    if (s <= 20) return '#f85149';
    if (s <= 40) return '#ff7b72';
    if (s <= 60) return '#f0883e';
    if (s <= 80) return '#56d364';
    return '#3fb950';
  };

  const color = getColor(score);

  return (
    <div className="fear-greed-card">
      <h3>Market Fear & Greed</h3>

      <div className="fg-gauge-container">
        {/* SVG semicircle gauge */}
        <svg viewBox="0 0 200 120" className="fg-gauge-svg">
          {/* Background arc */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f85149" />
              <stop offset="25%" stopColor="#ff7b72" />
              <stop offset="50%" stopColor="#f0883e" />
              <stop offset="75%" stopColor="#56d364" />
              <stop offset="100%" stopColor="#3fb950" />
            </linearGradient>
          </defs>

          {/* Track (background) */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="rgba(48, 54, 61, 0.5)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Filled arc */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251.3} 251.3`}
            className="fg-gauge-fill"
          />

          {/* Needle */}
          <g transform={`rotate(${needleRotation}, 100, 105)`}>
            <line x1="100" y1="105" x2="100" y2="35" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="105" r="5" fill={color} />
          </g>

          {/* Labels */}
          <text x="20" y="118" className="fg-label-text" textAnchor="middle">Fear</text>
          <text x="180" y="118" className="fg-label-text" textAnchor="middle">Greed</text>
        </svg>

        {/* Score display */}
        <div className="fg-score-display">
          <span className="fg-score-number" style={{ color }}>{score}</span>
          <span className="fg-score-label" style={{ color }}>{label}</span>
        </div>
      </div>

      {/* Component breakdown toggle */}
      <button
        className="fg-details-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Hide Details' : 'What drives this?'}
        <span className={`fg-chevron ${expanded ? 'open' : ''}`}>▾</span>
      </button>

      {expanded && components && (
        <div className="fg-components">
          <div className="fg-component">
            <div className="fg-comp-row">
              <span className="fg-comp-label">VIX Level</span>
              <span className="fg-comp-value">{components.vix_level}</span>
            </div>
            <div className="fg-comp-bar">
              <div className="fg-comp-fill" style={{ width: `${components.vix_score}%`, background: getColor(components.vix_score) }} />
            </div>
          </div>
          <div className="fg-component">
            <div className="fg-comp-row">
              <span className="fg-comp-label">VIX Momentum</span>
              <span className="fg-comp-value">{components.vix_momentum > 0 ? '+' : ''}{components.vix_momentum}%</span>
            </div>
            <div className="fg-comp-bar">
              <div className="fg-comp-fill" style={{ width: `${components.vix_momentum_score}%`, background: getColor(components.vix_momentum_score) }} />
            </div>
          </div>
          <div className="fg-component">
            <div className="fg-comp-row">
              <span className="fg-comp-label">SPY Trend</span>
              <span className="fg-comp-value">{components.spy_trend > 0 ? '+' : ''}{components.spy_trend}%</span>
            </div>
            <div className="fg-comp-bar">
              <div className="fg-comp-fill" style={{ width: `${components.spy_trend_score}%`, background: getColor(components.spy_trend_score) }} />
            </div>
          </div>
          <div className="fg-component">
            <div className="fg-comp-row">
              <span className="fg-comp-label">SPY Momentum</span>
              <span className="fg-comp-value">{components.spy_momentum > 0 ? '+' : ''}{components.spy_momentum}%</span>
            </div>
            <div className="fg-comp-bar">
              <div className="fg-comp-fill" style={{ width: `${components.spy_momentum_score}%`, background: getColor(components.spy_momentum_score) }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FearGreedGauge;
