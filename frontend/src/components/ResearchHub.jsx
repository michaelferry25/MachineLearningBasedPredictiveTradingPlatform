export default function ResearchHub() {
  const briefs = [
    {
      title: "Macro Pulse",
      points: ["USD strength supports tech momentum", "Rates pricing eases to 2 cuts", "Energy breadth improving"]
    },
    {
      title: "Quant Signals",
      points: ["Momentum basket +1.6%", "Mean reversion window closes in 2h", "Volatility skew normalizing"]
    },
    {
      title: "News Intelligence",
      points: ["Chip sector headlines lift semis", "Consumer demand resilient", "FX headwinds easing"]
    }
  ];

  return (
    <section className="section-wrapper" id="research">
      <div className="section-header">
        <span className="section-kicker">Research</span>
        <h2>Curated market intelligence</h2>
        <p>Stay ahead with daily briefs, quant signals, and sentiment-driven summaries.</p>
      </div>

      <div className="research-grid">
        {briefs.map((brief) => (
          <div key={brief.title} className="research-card">
            <h3>{brief.title}</h3>
            <ul>
              {brief.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <button className="btn secondary small-btn">Open brief</button>
          </div>
        ))}
      </div>
    </section>
  );
}
