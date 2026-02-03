import { useState } from "react";

const TIMEFRAME_OPTIONS = [
  "1 minute",
  "5 minutes",
  "30 minutes",
  "1 hour",
  "1 day"
];

export default function SettingsPage({ settings, onUpdate, onReset }) {
  const [savedAt, setSavedAt] = useState(null);

  const handleChange = (patch) => {
    onUpdate(patch);
    setSavedAt(Date.now());
  };

  const scrollToSection = (id) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({
      behavior: settings?.reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  };

  const lastSavedLabel = savedAt
    ? new Date(savedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <section className="section-wrapper settings-shell" id="settings">
      <div className="settings-nav">
        <h2>Settings</h2>
        <p>Customize your MarketMind experience and trading workflow.</p>
        <div className="settings-links">
          <button type="button" onClick={() => scrollToSection("settings-appearance")}>Appearance</button>
          <button type="button" onClick={() => scrollToSection("settings-trading")}>Trading</button>
          <button type="button" onClick={() => scrollToSection("settings-notifications")}>Notifications</button>
          <button type="button" onClick={() => scrollToSection("settings-privacy")}>Privacy</button>
        </div>
        <div className="settings-footer">
          <button type="button" className="btn secondary" onClick={onReset}>Reset to default</button>
          {savedAt && <span className="settings-saved">Saved {lastSavedLabel}</span>}
        </div>
      </div>

      <div className="settings-content">
        <div className="settings-card" id="settings-appearance">
          <div className="settings-card-header">
            <div>
              <h3>Appearance</h3>
              <p>Switch between light and dark themes, adjust density, and motion.</p>
            </div>
          </div>
          <div className="settings-grid">
            <label className="toggle-row">
              <span>
                <strong>Theme</strong>
                <small>Toggle between light and dark modes.</small>
              </span>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`pill-btn ${settings.theme === "dark" ? "active" : ""}`}
                  onClick={() => handleChange({ theme: "dark" })}
                >
                  Dark
                </button>
                <button
                  type="button"
                  className={`pill-btn ${settings.theme === "light" ? "active" : ""}`}
                  onClick={() => handleChange({ theme: "light" })}
                >
                  Light
                </button>
              </div>
            </label>

            <label className="toggle-row">
              <span>
                <strong>Reduce motion</strong>
                <small>Limit animations for a calmer viewing experience.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(event) => handleChange({ reduceMotion: event.target.checked })}
              />
            </label>

            <label className="toggle-row">
              <span>
                <strong>Compact layout</strong>
                <small>Use tighter spacing in dashboards and tables.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(event) => handleChange({ compactMode: event.target.checked })}
              />
            </label>
          </div>
        </div>

        <div className="settings-card" id="settings-trading">
          <div className="settings-card-header">
            <div>
              <h3>Trading & Data</h3>
              <p>Control default chart intervals and refresh behavior.</p>
            </div>
          </div>
          <div className="settings-grid">
            <label className="toggle-row">
              <span>
                <strong>Default chart interval</strong>
                <small>Used when you open Live Markets.</small>
              </span>
              <select
                value={settings.defaultTimeframe}
                onChange={(event) => handleChange({ defaultTimeframe: event.target.value })}
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="toggle-row">
              <span>
                <strong>Auto-refresh candles</strong>
                <small>Keep charts updated automatically (recommended).</small>
              </span>
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(event) => handleChange({ autoRefresh: event.target.checked })}
              />
            </label>

            <label className="toggle-row">
              <span>
                <strong>Show advanced overlays</strong>
                <small>Display moving averages and reference lines.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.showOverlays}
                onChange={(event) => handleChange({ showOverlays: event.target.checked })}
              />
            </label>
          </div>
        </div>

        <div className="settings-card" id="settings-notifications">
          <div className="settings-card-header">
            <div>
              <h3>Notifications</h3>
              <p>Choose how you receive market alerts and trade confirmations.</p>
            </div>
          </div>
          <div className="settings-grid">
            <label className="toggle-row">
              <span>
                <strong>Trade confirmations</strong>
                <small>Prompt confirmation toast after every simulated order.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.tradeNotifications}
                onChange={(event) => handleChange({ tradeNotifications: event.target.checked })}
              />
            </label>

            <label className="toggle-row">
              <span>
                <strong>Volatility alerts</strong>
                <small>Notify when selected symbols break your threshold.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.volatilityAlerts}
                onChange={(event) => handleChange({ volatilityAlerts: event.target.checked })}
              />
            </label>
          </div>
        </div>

        <div className="settings-card" id="settings-privacy">
          <div className="settings-card-header">
            <div>
              <h3>Privacy</h3>
              <p>Control data sharing and personalization.</p>
            </div>
          </div>
          <div className="settings-grid">
            <label className="toggle-row">
              <span>
                <strong>Personalization</strong>
                <small>Use activity data to improve recommendations.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.personalization}
                onChange={(event) => handleChange({ personalization: event.target.checked })}
              />
            </label>

            <label className="toggle-row">
              <span>
                <strong>Share usage analytics</strong>
                <small>Help improve MarketMind by sharing anonymized usage.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.usageAnalytics}
                onChange={(event) => handleChange({ usageAnalytics: event.target.checked })}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
