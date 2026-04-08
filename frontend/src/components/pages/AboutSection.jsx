import { useState, useEffect, useRef } from 'react';
import './AboutSection.css';

function AnimatedCounter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function FeatureShowcase() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: '&#x1D5E0;&#x1D5DF;',
      label: 'ML',
      title: 'Machine Learning Predictions',
      desc: 'An ensemble of Random Forest, Gradient Boosting and XGBoost regressors analyses historical price data, engineered technical features and integrated sentiment to forecast short-horizon returns. Not guesswork — mathematics.',
      highlights: ['Tree-Based Ensemble', 'Multi-Feature Analysis', 'Calibrated Confidence'],
    },
    {
      icon: '\u26A1',
      label: 'LIVE',
      title: 'Real-Time Market Data',
      desc: 'Live prices, candlestick charts and intraday movement — streamed from Finnhub and Yahoo Finance and rendered the moment they land.',
      highlights: ['Live Price Streaming', 'Interactive Charts', 'Instant Updates'],
    },
    {
      icon: '\uD83D\uDCC8',
      label: 'PORT',
      title: 'Portfolio Intelligence',
      desc: 'Simulate trades, track performance and visualise your portfolio with serious analytics. Equity curve, allocation breakdown and risk metrics in a single view.',
      highlights: ['Paper Trading', 'Performance Analytics', 'Risk Assessment'],
    },
    {
      icon: '\uD83E\uDDE0',
      label: 'SENT',
      title: 'Sentiment Analysis',
      desc: 'Thousands of news headlines and Reddit posts are scored in real time using FinBERT, a financial-domain transformer. Know what the crowd is thinking before the market moves.',
      highlights: ['FinBERT NLP', 'Reddit Sentiment', 'Fear & Greed Index'],
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [features.length]);

  const f = features[activeFeature];

  return (
    <div className="about-showcase">
      <div className="showcase-tabs">
        {features.map((feat, i) => (
          <button
            key={i}
            className={`showcase-tab ${i === activeFeature ? 'active' : ''}`}
            onClick={() => setActiveFeature(i)}
          >
            <span className="showcase-tab-label">{feat.label}</span>
            <div className="showcase-tab-progress">
              <div
                className={`showcase-tab-fill ${i === activeFeature ? 'running' : ''}`}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="showcase-content" key={activeFeature}>
        <div className="showcase-icon-wrap">
          <span className="showcase-icon" dangerouslySetInnerHTML={{ __html: f.icon }} />
        </div>
        <h3 className="showcase-title">{f.title}</h3>
        <p className="showcase-desc">{f.desc}</p>
        <div className="showcase-highlights">
          {f.highlights.map((h, i) => (
            <span key={i} className="showcase-chip">{h}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AboutSection() {
  const [expandedPhilosophy, setExpandedPhilosophy] = useState(null);

  const philosophyItems = [
    {
      icon: '\uD83C\uDFAF',
      title: 'Precision Over Noise',
      short: 'Every prediction is backed by data, every signal grounded in evidence.',
      detail: 'MarketMind was built to cut through the noise. Every feature has one job: give a clearer picture of what the market is doing and what it might do next. No fluff, no hype — just actionable intelligence.',
    },
    {
      icon: '\uD83D\uDD13',
      title: 'Democratising Alpha',
      short: 'Institutional-grade tools, accessible to anyone.',
      detail: 'Hedge funds spend millions on the same kind of ML models and sentiment analysis built into MarketMind. The platform puts those tools in front of anyone managing a portfolio, whether it is their first or their fiftieth.',
    },
    {
      icon: '\u26A1',
      title: 'Speed is Edge',
      short: 'Real-time data pipelines because milliseconds matter.',
      detail: 'In markets, the difference between profit and loss can come down to timing. The platform architecture is built for speed — from live quote polling to fast ML inference. When sentiment shifts or a price breaks out, the dashboard reflects it immediately.',
    },
    {
      icon: '\uD83D\uDD2C',
      title: 'Transparent AI',
      short: 'The reasoning behind every forecast is visible.',
      detail: 'Black-box predictions are useless for real trading decisions. The dashboard surfaces confidence scores, historical accuracy and the specific signals driving each forecast. Trust the model because you understand it.',
    },
  ];

  const techStack = [
    { name: 'React', category: 'Frontend', color: '#61dafb' },
    { name: 'XGBoost', category: 'ML Engine', color: '#ff6f00' },
    { name: 'RF + GB Ensemble', category: 'Prediction', color: '#ab47bc' },
    { name: 'FinBERT', category: 'Sentiment', color: '#f0883e' },
    { name: 'Flask', category: 'ML API', color: '#4caf50' },
    { name: 'Spring Boot', category: 'Backend', color: '#6db33f' },
    { name: 'PostgreSQL', category: 'Database', color: '#336791' },
    { name: 'Docker', category: 'Infrastructure', color: '#2496ed' },
    { name: 'Azure', category: 'Cloud', color: '#0078d4' },
    { name: 'Chart.js', category: 'Visualisation', color: '#3fb950' },
  ];

  const stats = [
    { value: 8, suffix: '', label: 'Symbols Tracked' },
    { value: 150, suffix: '', label: 'Day Backtest' },
    { value: 3, suffix: '', label: 'Ensemble Models' },
    { value: 29, suffix: '', label: 'Features Engineered' },
  ];

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-bg">
          <div className="about-grid-lines" />
        </div>
        <div className="about-hero-content">
          <span className="about-kicker">About MarketMind</span>
          <h1 className="about-headline">
            Where <span className="about-gradient-text">Machine Learning</span> Meets
            Market Intuition
          </h1>
          <p className="about-subheadline">
            MarketMind is a predictive trading platform built by Michael Ferry. It combines a
            tree-based ML ensemble, FinBERT sentiment analysis and live market data into a single
            honest view of short-horizon equity forecasting.
          </p>
          <div className="about-stats-row">
            {stats.map((s, i) => (
              <div key={i} className="about-stat">
                <span className="about-stat-value">
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </span>
                <span className="about-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="about-section-header">
          <span className="about-kicker">What It Does</span>
          <h2>Four Pillars of Trading Intelligence</h2>
          <p>
            Every feature in MarketMind works together to give a complete picture of the market.
          </p>
        </div>
        <FeatureShowcase />
      </section>

      <section className="about-section about-section-dark">
        <div className="about-section-header">
          <span className="about-kicker">Core Principles</span>
          <h2>Built Different, On Purpose</h2>
          <p>
            The principles that guide every design decision in MarketMind.
          </p>
        </div>
        <div className="philosophy-grid">
          {philosophyItems.map((item, i) => (
            <div
              key={i}
              className={`philosophy-card ${expandedPhilosophy === i ? 'expanded' : ''}`}
              onClick={() => setExpandedPhilosophy(expandedPhilosophy === i ? null : i)}
            >
              <div className="philosophy-card-header">
                <span className="philosophy-icon">{item.icon}</span>
                <h3>{item.title}</h3>
                <span className="philosophy-toggle">
                  {expandedPhilosophy === i ? '\u2212' : '+'}
                </span>
              </div>
              <p className="philosophy-short">{item.short}</p>
              {expandedPhilosophy === i && (
                <p className="philosophy-detail">{item.detail}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <div className="about-section-header">
          <span className="about-kicker">Under the Hood</span>
          <h2>Powered by Serious Tech</h2>
          <p>
            The technology stack behind MarketMind is built for performance, reliability and scale.
          </p>
        </div>
        <div className="tech-grid">
          {techStack.map((tech, i) => (
            <div
              key={i}
              className="tech-chip"
              style={{ '--tech-color': tech.color }}
            >
              <span className="tech-name">{tech.name}</span>
              <span className="tech-category">{tech.category}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section about-section-dark">
        <div className="about-section-header">
          <span className="about-kicker">How It Works</span>
          <h2>From Data to Decisions in Seconds</h2>
        </div>
        <div className="pipeline-steps">
          <div className="pipeline-step">
            <div className="pipeline-number">01</div>
            <h3>Ingest</h3>
            <p>Live market data, news feeds and social media streams are continuously collected and processed.</p>
          </div>
          <div className="pipeline-connector" />
          <div className="pipeline-step">
            <div className="pipeline-number">02</div>
            <h3>Analyse</h3>
            <p>A Random Forest, Gradient Boosting and XGBoost ensemble processes engineered features while FinBERT scores real-time market sentiment.</p>
          </div>
          <div className="pipeline-connector" />
          <div className="pipeline-step">
            <div className="pipeline-number">03</div>
            <h3>Predict</h3>
            <p>The ensemble members converge into a single short-horizon return forecast, surfaced with a calibrated confidence score and a regime tag.</p>
          </div>
          <div className="pipeline-connector" />
          <div className="pipeline-step">
            <div className="pipeline-number">04</div>
            <h3>Act</h3>
            <p>The dashboard turns that forecast into clear, actionable insights — then lets you paper-trade directly on the platform.</p>
          </div>
        </div>
      </section>

      <section className="about-section about-cta">
        <h2>Ready to Trade Smarter?</h2>
        <p>
          Sign up or log in and experience a transparent take on intelligent trading. Built by Michael Ferry.
        </p>
        <div className="about-cta-actions">
          <a href="#/auth" className="about-cta-btn">
            Get Started Free
          </a>
          <a href="#/auth" className="about-cta-link">
            Already have an account? Log in
          </a>
        </div>
      </section>
    </div>
  );
}
