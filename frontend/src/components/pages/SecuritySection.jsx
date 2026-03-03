export default function SecuritySection() {
  const items = [
    {
      title: "Encrypted credentials",
      body: "BCrypt password hashing and JWT session controls with expiry enforcement."
    },
    {
      title: "Role-based access",
      body: "Expandable role system for admin controls and premium analytics."
    },
    {
      title: "Audit-ready logs",
      body: "Structured activity trails for trades, portfolio changes, and alerts."
    },
    {
      title: "Secure architecture",
      body: "Stateless services with planned OAuth, MFA, and secure key vaulting."
    }
  ];

  return (
    <section className="section-wrapper" id="security">
      <div className="section-header">
        <span className="section-kicker">Security</span>
        <h2>Built for trust and compliance</h2>
        <p>Enterprise-grade controls and modern auth foundations keep accounts protected.</p>
      </div>

      <div className="security-grid">
        {items.map((item) => (
          <div key={item.title} className="security-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
