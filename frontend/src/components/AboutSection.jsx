export default function AboutSection() {
  return (
    <section className="section-wrapper section-alt" id="about">
      <div className="section-header">
        <span className="section-kicker">About</span>
        <h2>MarketMind is your professional trading command center</h2>
        <p>
          We blend ML forecasting, live market data, and portfolio simulation into a single
          workspace built for modern traders.
        </p>
      </div>

      <div className="about-grid">
        <div className="about-card">
          <h3>Mission</h3>
          <p>Give retail investors the clarity, speed, and intelligence of institutional tools.</p>
        </div>
        <div className="about-card">
          <h3>Capabilities</h3>
          <p>End-to-end workflow from discovery to execution, supported by AI insights.</p>
        </div>
        <div className="about-card">
          <h3>Next on the roadmap</h3>
          <p>Multi-factor auth, sentiment alerts, and personalized strategy backtests.</p>
        </div>
      </div>
    </section>
  );
}
