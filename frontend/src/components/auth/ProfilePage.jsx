import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

const SKILL_CONFIG = {
  Beginner: { title: "Beginner Trader", color: "#4ade80", nextLevel: "Intermediate", nextXp: 300 },
  Intermediate: { title: "Market Analyst", color: "#60a5fa", nextLevel: "Expert", nextXp: 1000 },
  Expert: { title: "Expert Trader", color: "#f59e0b", nextLevel: null, nextXp: null }
};

const BADGE_ICONS = {
  "First Steps": "👣", "Getting Started": "⭐", "Scholar": "🎓",
  "On Fire": "🔥", "Dedicated": "🏆", "Market Basics": "📊",
  "Data Whiz": "🧠", "Market Pro": "🚀"
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export default function ProfilePage({ user, authToken, onProfileUpdate, portfolio }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [learnProgress, setLearnProgress] = useState(null);

  useEffect(() => {
    setDisplayName(user?.displayName || "");
  }, [user]);

  useEffect(() => {
    if (!authToken) return;
    fetch(`${API_URL}/api/learning/progress`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setLearnProgress(data); })
      .catch(() => {});
  }, [authToken]);

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
          <h3>Learning Progress</h3>
          {learnProgress ? (() => {
            const skill = SKILL_CONFIG[learnProgress.skillLevel] || SKILL_CONFIG.Beginner;
            const prevThreshold = learnProgress.skillLevel === "Expert" ? 1000 : learnProgress.skillLevel === "Intermediate" ? 300 : 0;
            const xpProgress = skill.nextXp
              ? ((learnProgress.totalXp - prevThreshold) / (skill.nextXp - prevThreshold)) * 100
              : 100;
            return (
              <>
                <div className="profile-skill-badge" style={{ color: skill.color }}>
                  <span className="profile-skill-icon" style={{ background: skill.color, color: "#0f172a" }}>
                    {learnProgress.skillLevel[0]}
                  </span>
                  {skill.title}
                </div>
                <div className="profile-metrics">
                  <div>
                    <span>XP</span>
                    <strong>{learnProgress.totalXp}</strong>
                  </div>
                  <div>
                    <span>Lessons</span>
                    <strong>{learnProgress.completedCount} / {learnProgress.totalLessons}</strong>
                  </div>
                  <div>
                    <span>Streak</span>
                    <strong>{learnProgress.currentStreak} days</strong>
                  </div>
                </div>
                <div className="profile-xp-bar">
                  <div className="profile-xp-track">
                    <div className="profile-xp-fill" style={{ width: `${Math.min(xpProgress, 100)}%`, background: skill.color }} />
                  </div>
                  <span className="profile-xp-label">
                    {skill.nextXp ? `${learnProgress.totalXp} / ${skill.nextXp} XP to ${skill.nextLevel}` : "Max level!"}
                  </span>
                </div>
                {learnProgress.badges?.length > 0 && (
                  <div className="profile-badges">
                    {learnProgress.badges.map(b => (
                      <span key={b} className="profile-badge-chip">{BADGE_ICONS[b] || "🏅"} {b}</span>
                    ))}
                  </div>
                )}
                <a href="#/learn" className="btn secondary" style={{ marginTop: "0.75rem", display: "inline-block" }}>
                  Continue Learning
                </a>
              </>
            );
          })() : (
            <div className="profile-note">
              <a href="#/learn">Start learning</a> to track your progress here.
            </div>
          )}
        </div>

        <div className="profile-card">
          <h3>Connected services</h3>
          <div className="profile-connections">
            <div>
              <span>Market data</span>
              <strong>Finnhub + Twelve Data</strong>
            </div>
            <div>
              <span>Forecast engine</span>
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
