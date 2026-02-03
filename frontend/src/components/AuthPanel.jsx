import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function AuthPanel({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: ""
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup") {
      if (!form.displayName.trim()) {
        setError("Please enter a display name.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    const payload =
      mode === "login"
        ? { email: form.email, password: form.password }
        : {
            email: form.email,
            password: form.password,
            displayName: form.displayName
          };

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Unable to authenticate.");
        setLoading(false);
        return;
      }

      if (onAuthSuccess) {
        onAuthSuccess(data);
      }
    } catch (err) {
      setError("Unable to reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-section" id="auth">
      <div className="auth-background" aria-hidden="true" />
      <div className="auth-grid">
        <div className="auth-copy">
          <span className="auth-badge">MarketMind Access</span>
          <h1>{mode === "login" ? "Welcome back" : "Create your trading HQ"}</h1>
          <p>
            Your trading workspace with live market intel, portfolio analytics,
            and forecast signals.
          </p>

          <div className="auth-ticker">
            <span className="ticker-item positive">AAPL +1.8%</span>
            <span className="ticker-item positive">NVDA +3.2%</span>
            <span className="ticker-item negative">TSLA -0.9%</span>
            <span className="ticker-item positive">MSFT +0.6%</span>
          </div>

          <div className="auth-toggle">
            <button
              type="button"
              className={`auth-toggle-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-toggle-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-notes">
            <div className="auth-note">
              <span className="auth-icon">SEC</span>
              <div>
                <h4>Security-first</h4>
                <p>BCrypt passwords, JWT sessions, and room for MFA.</p>
              </div>
            </div>
            <div className="auth-note">
              <span className="auth-icon">LIVE</span>
              <div>
                <h4>Always-on insights</h4>
                <p>Track watchlists, performance, and alerts in real-time.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <h3>{mode === "login" ? "Sign in" : "Sign up"}</h3>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Access your saved portfolio and alerts."
              : "Create an account and start paper trading."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label className="auth-field">
                Display name
                <input
                  type="text"
                  name="displayName"
                  placeholder="Trader Name"
                  value={form.displayName}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

            <label className="auth-field">
              Email
              <input
                type="email"
                name="email"
                placeholder="you@domain.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="auth-field">
              Password
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>

            {mode === "signup" && (
              <label className="auth-field">
                Confirm password
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn primary-btn auth-submit" disabled={loading}>
              {loading ? "Working..." : mode === "login" ? "Continue" : "Create account"}
            </button>

            <p className="auth-helper">
              {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
