export default function HeroSection() {
    return (
      <div className="hero-modern">
        <div className="hero-container">
          <div className="hero-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
            </svg>
            AI-Powered Trading
          </div>
  
          <h1 className="hero-title">MarketMind</h1>
          
          <p className="hero-subtitle">
            Machine learning predictions with real-time market data
          </p>
  
          <div className="hero-actions">
            <a href="#/dashboard" className="hero-btn primary">
              Launch Dashboard
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#/analytics" className="hero-btn secondary">
              View Analytics
            </a>
          </div>
  
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">$100K</div>
              <div className="stat-label">Demo Balance</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">Real-time</div>
              <div className="stat-label">Market Data</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">AI Powered</div>
              <div className="stat-label">Predictions</div>
            </div>
          </div>
        </div>
      </div>
    );
  }