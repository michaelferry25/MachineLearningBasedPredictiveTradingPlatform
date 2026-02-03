export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>MarketMind</h4>
          <p>Data-driven trading platform delivering professional-grade analytics.</p>
        </div>

        <div className="footer-section">
          <h4>Platform</h4>
          <a href="#/overview">Overview</a>
          <a href="#/analytics">Analytics</a>
          <a href="#/dashboard">Dashboard</a>
        </div>

        <div className="footer-section">
          <h4>Research</h4>
          <a href="#/research">Market briefs</a>
          <a href="#/security">Security</a>
          <a href="#/sessions">Sessions</a>
        </div>

        <div className="footer-section">
          <h4>Company</h4>
          <a href="#/about">About</a>
          <a href="#/live">Live Markets</a>
          <a href="#/overview">Overview</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 MarketMind. Built with data-driven forecasts.</p>
        <p className="disclaimer-text">⚠️ Demo Mode - Not real trading</p>
      </div>
    </footer>
  );
}
