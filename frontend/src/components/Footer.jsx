export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Trading Insight</h4>
          <p>ML-powered trading platform for smart investors.</p>
        </div>
        
        <div className="footer-section">
          <h4>Platform</h4>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#api">API</a>
        </div>
        
        <div className="footer-section">
          <h4>Resources</h4>
          <a href="#docs">Documentation</a>
          <a href="#blog">Blog</a>
          <a href="#support">Support</a>
        </div>
        
        <div className="footer-section">
          <h4>Legal</h4>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#disclaimer">Disclaimer</a>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© 2026 Trading Insight. Built with AI-powered predictions.</p>
        <p className="disclaimer-text">⚠️ Demo Mode - Not real trading</p>
      </div>
    </footer>
  );
}