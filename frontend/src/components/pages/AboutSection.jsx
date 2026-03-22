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
      desc: 'Our LSTM neural networks analyze years of historical price data, volume patterns, and technical indicators to forecast where stocks are heading next. Not guesswork — mathematics.',
      highlights: ['LSTM Deep Learning', 'Multi-feature Analysis', 'Confidence Scoring'],
    },
    {
      icon: '\u26A1',
      label: 'LIVE',
      title: 'Real-Time Market Data',
      desc: 'Stream live prices, track market movements as they happen, and never miss a beat. From candlestick charts to order flow — your data arrives the moment it matters.',
      highlights: ['Live Price Streaming', 'Interactive Charts', 'Instant Updates'],
    },
    {
      icon: '\uD83D\uDCC8',
      label: 'PORT',
      title: 'Portfolio Intelligence',
      desc: 'Simulate trades, track performance, and visualize your portfolio with institutional-grade analytics. See your equity curve, allocation breakdown, and risk metrics all in one view.',
      highlights: ['Paper Trading', 'Performance Analytics', 'Risk Assessment'],
    },
    {
      icon: '\uD83E\uDDE0',
      label: 'SENT',
      title: 'Sentiment Analysis',
      desc: 'We scrape and analyze thousands of news articles and Reddit posts in real time, using NLP to gauge market mood. Know what the crowd is thinking before the market moves.',
      highlights: ['News Analysis', 'Reddit Sentiment', 'Fear & Greed Index'],
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
      short: 'Every prediction backed by data, every signal grounded in evidence.',
      detail: 'We built MarketMind because we were tired of trading platforms that drown you in noise. Every feature we ship has one job: give you a clearer picture of what the market is doing, and what it might do next. No fluff, no hype — just actionable intelligence.',
    },
    {
      icon: '\uD83D\uDD13',
      title: 'Democratizing Alpha',
      short: 'Institutional-grade tools, accessible to everyone.',
      detail: 'Hedge funds spend millions on the same kind of ML models and sentiment analysis we offer. MarketMind levels the playing field. Whether you\'re managing your first portfolio or your fiftieth, you deserve the same caliber of tools that Wall Street uses.',
    },
    {
      icon: '\u26A1',
      title: 'Speed is Edge',
      short: 'Real-time data pipelines because milliseconds matter.',
      detail: 'In markets, the difference between profit and loss can come down to timing. Our architecture is built for speed — from live WebSocket feeds to instant ML inference. When sentiment shifts or a price breaks out, you\'ll know immediately.',
    },
    {
      icon: '\uD83D\uDD2C',
      title: 'Transparent AI',
      short: 'You see exactly why our models predict what they do.',
      detail: 'Black-box predictions are useless for real trading decisions. That\'s why we show you confidence scores, model accuracy history, and the specific signals driving each forecast. Trust the model because you understand it — not because we told you to.',
    },
  ];

  const techStack = [
    { name: 'React', category: 'Frontend', color: '#61dafb' },
    { name: 'TensorFlow', category: 'ML Engine', color: '#ff6f00' },
    { name: 'LSTM Networks', category: 'Prediction', color: '#ab47bc' },
    { name: 'Flask', category: 'ML API', color: '#4caf50' },
    { name: 'Spring Boot', category: 'Backend', color: '#6db33f' },
    { name: 'PostgreSQL', category: 'Database', color: '#336791' },
    { name: 'Docker', category: 'Infrastructure', color: '#2496ed' },
    { name: 'Azure', category: 'Cloud', color: '#0078d4' },
    { name: 'NLP', category: 'Sentiment', color: '#f0883e' },
    { name: 'WebSockets', category: 'Real-time', color: '#3fb950' },
  ];

  const stats = [
    { value: 6, suffix: '+', label: 'ML Models Trained' },
    { value: 50, suffix: '+', label: 'Stocks Tracked' },
    { value: 1000, suffix: 's', label: 'Predictions Made' },
    { value: 99.9, suffix: '%', label: 'Uptime' },
  ];

  return (
    <div className="about-page">
      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-bg">
          <div className="about-grid-lines" />
        </div>
        <div className="about-hero-content">
          <span className="about-kicker">About MarketMind</span>
          <h1 className="about-headline">
            Where <span className="about-gradient-text">Artificial Intelligence</span> Meets
            Market Intuition
          </h1>
          <p className="about-subheadline">
            MarketMind is a next-generation predictive trading platform that combines deep learning,
            real-time sentiment analysis, and live market data to give you an unprecedented edge in
            the markets.
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

      {/* What We Do — Interactive Feature Showcase */}
      <section className="about-section">
        <div className="about-section-header">
          <span className="about-kicker">What We Do</span>
          <h2>Four Pillars of Trading Intelligence</h2>
          <p>
            Every feature in MarketMind works together to give you a complete picture of the market.
            Explore what powers the platform.
          </p>
        </div>
        <FeatureShowcase />
      </section>

      {/* Philosophy — Expandable Cards */}
      <section className="about-section about-section-dark">
        <div className="about-section-header">
          <span className="about-kicker">Our Philosophy</span>
          <h2>Built Different, On Purpose</h2>
          <p>
            The principles that guide every line of code and every product decision we make.
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

      {/* Tech Stack */}
      <section className="about-section">
        <div className="about-section-header">
          <span className="about-kicker">Under the Hood</span>
          <h2>Powered by Serious Tech</h2>
          <p>
            From neural networks to real-time data pipelines — the technology stack behind MarketMind
            is built for performance, reliability, and scale.
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

      {/* How It Works */}
      <section className="about-section about-section-dark">
        <div className="about-section-header">
          <span className="about-kicker">How It Works</span>
          <h2>From Data to Decisions in Seconds</h2>
        </div>
        <div className="pipeline-steps">
          <div className="pipeline-step">
            <div className="pipeline-number">01</div>
            <h3>Ingest</h3>
            <p>Live market data, news feeds, and social media streams are continuously collected and processed.</p>
          </div>
          <div className="pipeline-connector" />
          <div className="pipeline-step">
            <div className="pipeline-number">02</div>
            <h3>Analyze</h3>
            <p>LSTM models process historical patterns while NLP engines gauge real-time market sentiment.</p>
          </div>
          <div className="pipeline-connector" />
          <div className="pipeline-step">
            <div className="pipeline-number">03</div>
            <h3>Predict</h3>
            <p>Multiple models converge to produce price forecasts with confidence intervals and trade signals.</p>
          </div>
          <div className="pipeline-connector" />
          <div className="pipeline-step">
            <div className="pipeline-number">04</div>
            <h3>Act</h3>
            <p>You receive clear, actionable insights — then simulate or execute trades directly on the platform.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-section about-cta">
        <h2>Ready to Trade Smarter?</h2>
        <p>
          Join MarketMind and experience the future of intelligent trading. Your edge starts here.
        </p>
        <a href="/register" className="about-cta-btn">
          Get Started Free
        </a>
      </section>
    </div>
  );
}
