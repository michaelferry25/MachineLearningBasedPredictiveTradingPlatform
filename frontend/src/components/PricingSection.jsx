export default function PricingSection() {
  const tiers = [
    {
      name: "Starter",
      price: "Free",
      description: "Essential tools for paper trading and watchlists.",
      features: ["Real-time quotes", "ML prediction snapshot", "5 watchlists", "Community insights"]
    },
    {
      name: "Pro",
      price: "$29/mo",
      description: "Advanced analytics and signal tracking for active traders.",
      features: ["Institutional analytics", "Custom alerts", "Unlimited watchlists", "Priority support"],
      highlight: true
    },
    {
      name: "Desk",
      price: "$79/mo",
      description: "Multi-portfolio workspace for power users and teams.",
      features: ["Multi-account", "Risk dashboards", "Shared workspaces", "API access"]
    }
  ];

  return (
    <section className="section-wrapper section-alt" id="pricing">
      <div className="section-header">
        <span className="section-kicker">Pricing</span>
        <h2>Plans built for serious trading</h2>
        <p>Scale from demo to desk-ready analytics with flexible monthly plans.</p>
      </div>

      <div className="pricing-grid">
        {tiers.map((tier) => (
          <div key={tier.name} className={`pricing-card ${tier.highlight ? "featured" : ""}`}>
            <div className="pricing-header">
              <h3>{tier.name}</h3>
              <span className="pricing-price">{tier.price}</span>
              <p>{tier.description}</p>
            </div>
            <ul>
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button className={`btn ${tier.highlight ? "primary-btn" : "secondary"}`}>
              Start {tier.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
