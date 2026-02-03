import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export default function ProfilePage({ user, authToken, onProfileUpdate, portfolio }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDisplayName(user?.displayName || "");
  }, [user]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setStatus("Display name is required.");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ displayName })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || "Unable to update profile.");
        setSaving(false);
        return;
      }
      onProfileUpdate(data);
      setStatus("Profile updated successfully.");
    } catch (error) {
      setStatus("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const portfolioSummary = [
    { label: "Total value", value: portfolio?.totalValue ?? 0 },
    { label: "Cash balance", value: portfolio?.cashBalance ?? 0 },
    { label: "Holdings value", value: portfolio?.holdingsValue ?? 0 },
    { label: "Trades executed", value: portfolio?.tradeCount ?? 0 }
  ];

  return (
    <section className="section-wrapper profile-shell" id="profile">
      <div className="profile-header">
        <div>
          <span className="section-kicker">Profile</span>
          <h2>Trader identity & account details</h2>
          <p>Keep your display name current and review account activity.</p>
        </div>
        <button className="btn primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <h3>Profile information</h3>
          <div className="profile-field">
            <label>Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Trader name"
            />
          </div>
          <div className="profile-field">
            <label>Email</label>
            <input type="email" value={user?.email || ""} disabled />
          </div>
          <div className="profile-meta">
            <div>
              <span>Role</span>
              <strong>{user?.role || "USER"}</strong>
            </div>
            <div>
              <span>Member since</span>
              <strong>{formatDate(user?.createdAt)}</strong>
            </div>
          </div>
          {status && <div className="profile-status">{status}</div>}
        </div>

        <div className="profile-card">
          <h3>Portfolio snapshot</h3>
          <div className="profile-metrics">
            {portfolioSummary.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>
                  {item.label.includes("Trades")
                    ? item.value
                    : `$${Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                </strong>
              </div>
            ))}
          </div>
          <div className="profile-note">
            Portfolio metrics update as you place simulated trades in the dashboard.
          </div>
        </div>

        <div className="profile-card">
          <h3>Security overview</h3>
          <ul className="profile-security">
            <li>JWT sessions enabled</li>
            <li>Passwords hashed with BCrypt</li>
            <li>Role-based access controls active</li>
          </ul>
          <button className="btn secondary" type="button" disabled>
            Change password (coming soon)
          </button>
        </div>

        <div className="profile-card">
          <h3>Connected services</h3>
          <div className="profile-connections">
            <div>
              <span>Market data</span>
              <strong>Finnhub + Twelve Data</strong>
            </div>
            <div>
              <span>ML engine</span>
              <strong>Python Flask</strong>
            </div>
            <div>
              <span>News intelligence</span>
              <strong>NewsAPI</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
