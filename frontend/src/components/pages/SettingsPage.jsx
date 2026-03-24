import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const TIMEFRAME_OPTIONS = [
  "1 minute",
  "5 minutes",
  "30 minutes",
  "1 hour",
  "1 day"
];

export default function SettingsPage({ settings, onUpdate, onReset, authToken }) {
  const [savedAt, setSavedAt] = useState(null);
  const [advancedPassword, setAdvancedPassword] = useState("");
  const [advancedUnlocked, setAdvancedUnlocked] = useState(false);
  const [advancedError, setAdvancedError] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

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

  const handleChangePassword = async () => {
    setPasswordStatus("");
    if (!currentPassword || !newPassword) {
      setPasswordStatus("All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus(data.message || "Failed to update password.");
      } else {
        setPasswordStatus("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordStatus("Unable to reach the server.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUnlockAdvanced = async () => {
    setAdvancedError("");
    if (!advancedPassword) {
      setAdvancedError("Enter your password to continue.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "_verify_", password: advancedPassword })
      });
      // We use the change-password endpoint to verify — if current password is wrong it returns 400
      const verifyRes = await fetch(`${API_URL}/api/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ currentPassword: advancedPassword, newPassword: advancedPassword })
      });
      if (verifyRes.ok) {
        setAdvancedUnlocked(true);
        setAdvancedPassword("");
      } else {
        setAdvancedError("Incorrect password.");
      }
    } catch {
      setAdvancedError("Unable to verify. Please try again.");
    }
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
          <button type="button" onClick={() => scrollToSection("settings-security")}>Security</button>
          <button type="button" onClick={() => scrollToSection("settings-privacy")}>Privacy</button>
          <button type="button" onClick={() => scrollToSection("settings-advanced")}>Advanced</button>
        </div>
        <div className="settings-footer">
          <button type="button" className="btn secondary" onClick={onReset}>Reset to default</button>
          {savedAt && <span className="settings-saved">Saved {lastSavedLabel}</span>}
        </div>
      </div>

      <div className="settings-content">
        {/* Appearance */}
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

        {/* Trading & Data */}
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

            <label className="toggle-row">
              <span>
                <strong>Prediction auto-load</strong>
                <small>Automatically fetch ML predictions when viewing a stock.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.predictionAutoLoad !== false}
                onChange={(event) => handleChange({ predictionAutoLoad: event.target.checked })}
              />
            </label>
          </div>
        </div>

        {/* Notifications */}
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

            <label className="toggle-row">
              <span>
                <strong>Prediction signals</strong>
                <small>Alert when the ML model issues a Strong Buy or Strong Sell signal.</small>
              </span>
              <input
                type="checkbox"
                checked={settings.predictionAlerts !== false}
                onChange={(event) => handleChange({ predictionAlerts: event.target.checked })}
              />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="settings-card" id="settings-security">
          <div className="settings-card-header">
            <div>
              <h3>Security</h3>
              <p>Manage your password and account security.</p>
            </div>
          </div>
          <div className="settings-grid">
            {authToken ? (
              <>
                <div className="settings-password-form">
                  <div className="profile-field">
                    <label>Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="profile-field">
                    <label>New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                    />
                  </div>
                  <div className="profile-field">
                    <label>Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <button
                    className="btn primary-btn"
                    type="button"
                    onClick={handleChangePassword}
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Updating..." : "Change password"}
                  </button>
                  {passwordStatus && <div className="profile-status">{passwordStatus}</div>}
                </div>
                <div className="settings-security-info">
                  <ul>
                    <li>Passwords hashed with BCrypt</li>
                    <li>JWT session tokens (60 min expiry)</li>
                    <li>Role-based access controls active</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="settings-login-prompt">
                <p>Log in to manage your password and security settings.</p>
                <a href="#/login" className="btn primary-btn">Log in</a>
              </div>
            )}
          </div>
        </div>

        {/* Privacy */}
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

        {/* Advanced */}
        <div className="settings-card" id="settings-advanced">
          <div className="settings-card-header">
            <div>
              <h3>Advanced</h3>
              <p>Data management and account maintenance options.</p>
            </div>
          </div>
          <div className="settings-grid">
            {!advancedUnlocked ? (
              authToken ? (
                <div className="settings-password-form">
                  <p><small>Enter your password to access these options.</small></p>
                  <div className="profile-field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={advancedPassword}
                      onChange={(e) => setAdvancedPassword(e.target.value)}
                      placeholder="Enter your account password"
                      onKeyDown={(e) => e.key === "Enter" && handleUnlockAdvanced()}
                    />
                  </div>
                  <button
                    className="btn primary-btn"
                    type="button"
                    onClick={handleUnlockAdvanced}
                  >
                    Unlock
                  </button>
                  {advancedError && <div className="profile-status">{advancedError}</div>}
                </div>
              ) : (
                <div className="settings-login-prompt">
                  <p>Log in to access advanced options.</p>
                  <a href="#/login" className="btn primary-btn">Log in</a>
                </div>
              )
            ) : (
              <>
                <div className="advanced-action-block">
                  <div className="advanced-action-info">
                    <strong>Reset all settings</strong>
                    <small>Restore all preferences to their default values. Type <code>RESET</code> to confirm.</small>
                  </div>
                  <div className="advanced-action-confirm">
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder='Type "RESET" to confirm'
                      className="confirm-input"
                    />
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={resetConfirmText !== "RESET"}
                      onClick={() => {
                        onReset();
                        setResetConfirmText("");
                        setAdvancedUnlocked(false);
                      }}
                    >
                      Reset settings
                    </button>
                  </div>
                </div>

                <div className="advanced-action-block">
                  <div className="advanced-action-info">
                    <strong>Clear local data</strong>
                    <small>Remove all cached data, watchlists, and preferences from this browser. Type <code>DELETE</code> to confirm.</small>
                  </div>
                  <div className="advanced-action-confirm">
                    <input
                      type="text"
                      value={clearConfirmText}
                      onChange={(e) => setClearConfirmText(e.target.value)}
                      placeholder='Type "DELETE" to confirm'
                      className="confirm-input"
                    />
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={clearConfirmText !== "DELETE"}
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                    >
                      Clear data
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
