import { useState, useEffect, useRef, useCallback } from "react";
import "./AuthPanel.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

/* ── Password strength calculator ── */
function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Weak", color: "#ff7b72", pct: 25 };
  if (score <= 3) return { label: "Fair", color: "#f0883e", pct: 50 };
  if (score <= 4) return { label: "Good", color: "#58a6ff", pct: 75 };
  return { label: "Strong", color: "#3fb950", pct: 100 };
}

/* ── Password requirement checklist ── */
function PasswordChecks({ password }) {
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special char", met: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div className="pw-checks">
      {checks.map((c, i) => (
        <span key={i} className={`pw-check ${c.met ? "met" : ""}`}>
          {c.met ? "\u2713" : "\u2022"} {c.label}
        </span>
      ))}
    </div>
  );
}

/* ── Animated mini chart SVG ── */
function MiniChart() {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    function generate() {
      const pts = [];
      let y = 50;
      for (let i = 0; i <= 40; i++) {
        y += (Math.random() - 0.48) * 8;
        y = Math.max(15, Math.min(85, y));
        pts.push({ x: (i / 40) * 100, y });
      }
      setPoints(pts);
    }
    generate();
    const interval = setInterval(generate, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!points.length) return null;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L100,100 L0,100 Z`;
  const isUp = points[points.length - 1].y < points[0].y;
  const color = isUp ? "#3fb950" : "#ff7b72";

  return (
    <svg viewBox="0 0 100 100" className="auth-mini-chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id="authChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#authChartGrad)" className="chart-area" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" className="chart-line" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} className="chart-dot" />
    </svg>
  );
}

/* ── Scrolling market tape ── */
function MarketTape() {
  const tapeData = [
    { sym: "AAPL", price: "178.32", pct: "+1.82%" },
    { sym: "NVDA", price: "924.15", pct: "+3.21%" },
    { sym: "TSLA", price: "172.80", pct: "-0.94%" },
    { sym: "MSFT", price: "421.55", pct: "+0.63%" },
    { sym: "AMZN", price: "186.42", pct: "+1.15%" },
    { sym: "GOOG", price: "155.72", pct: "+0.88%" },
    { sym: "META", price: "503.28", pct: "+2.14%" },
    { sym: "JPM", price: "198.45", pct: "+0.52%" },
  ];
  const doubled = [...tapeData, ...tapeData];

  return (
    <div className="market-tape-wrap">
      <div className="market-tape">
        {doubled.map((item, i) => (
          <span key={i} className={`tape-item ${item.pct.startsWith("-") ? "neg" : "pos"}`}>
            <span className="tape-sym">{item.sym}</span>
            <span className="tape-price">{item.price}</span>
            <span className="tape-pct">{item.pct}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Floating data particles ── */
function FloatingNumbers() {
  const numbers = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      value: (Math.random() * 500 + 100).toFixed(2),
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 7,
    }))
  );

  return (
    <div className="floating-numbers" aria-hidden="true">
      {numbers.current.map((n) => (
        <span
          key={n.id}
          className="float-num"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            animationDelay: `${n.delay}s`,
            animationDuration: `${n.duration}s`,
          }}
        >
          ${n.value}
        </span>
      ))}
    </div>
  );
}

/* ── Main component ── */
export default function AuthPanel({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const emailTimer = useRef(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });

  /* Live email availability check on signup */
  const checkEmailAvailability = useCallback(async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }
    setEmailChecking(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "CheckOnly1!", displayName: "check" }),
      });
      if (res.status === 409) {
        setEmailAvailable(false);
      } else {
        setEmailAvailable(true);
      }
    } catch {
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");

    if (name === "email" && mode === "signup") {
      setEmailAvailable(null);
      clearTimeout(emailTimer.current);
      emailTimer.current = setTimeout(() => checkEmailAvailability(value), 800);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setEmailAvailable(null);
    setTermsAccepted(false);
    setShowPassword(false);
    setShowConfirm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (mode === "signup") {
      if (!form.displayName.trim()) {
        setError("Please enter a display name.");
        return;
      }
      if (form.displayName.trim().length < 2) {
        setError("Display name must be at least 2 characters.");
        return;
      }
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (!/[A-Z]/.test(form.password)) {
        setError("Password needs at least one uppercase letter.");
        return;
      }
      if (!/[a-z]/.test(form.password)) {
        setError("Password needs at least one lowercase letter.");
        return;
      }
      if (!/[0-9]/.test(form.password)) {
        setError("Password needs at least one number.");
        return;
      }
      if (!/[^A-Za-z0-9]/.test(form.password)) {
        setError("Password needs at least one special character (e.g. !@#$%).");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (emailAvailable === false) {
        setError("This email is already registered. Try signing in.");
        return;
      }
      if (!termsAccepted) {
        setError("You must accept the Terms & Conditions to continue.");
        return;
      }
    }

    const payload =
      mode === "login"
        ? { email: form.email, password: form.password }
        : {
            email: form.email,
            password: form.password,
            displayName: form.displayName.trim(),
          };

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/auth/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setError("This email is already registered. Try signing in.");
        } else {
          setError(data.message || data.error || "Unable to authenticate.");
        }
        setLoading(false);
        return;
      }

      if (onAuthSuccess) onAuthSuccess(data);
    } catch {
      setError("Unable to reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = mode === "signup" && form.password ? getPasswordStrength(form.password) : null;

  return (
    <div className="auth-page">
      {/* Full-screen animated background */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-grid" />
        <div className="auth-bg-glow glow-1" />
        <div className="auth-bg-glow glow-2" />
        <div className="auth-bg-glow glow-3" />
        <FloatingNumbers />
      </div>

      <MarketTape />

      <div className="auth-container">
        {/* Left — Showcase */}
        <div className="auth-showcase">
          <div className="showcase-inner">
            <a href="#/" className="auth-logo-link">
              <img src="/WhiteLogoTransparent.svg" alt="MarketMind" className="auth-logo-img" />
            </a>

            <h1 className="auth-headline">
              {mode === "login" ? (
                <>The markets never sleep.<br /><span className="headline-accent">Neither does your edge.</span></>
              ) : (
                <>Intelligence meets<br /><span className="headline-accent">opportunity.</span></>
              )}
            </h1>

            <p className="auth-tagline">
              AI-powered predictions, real-time sentiment, and institutional-grade
              analytics — unified in one platform.
            </p>

            <div className="auth-chart-section">
              <div className="chart-header">
                <div className="chart-header-left">
                  <span className="chart-label">PORTFOLIO PERFORMANCE</span>
                  <span className="chart-sublabel">Last 30 days</span>
                </div>
                <span className="chart-value positive">+24.8%</span>
              </div>
              <MiniChart />
            </div>

            <div className="auth-proof-row">
              <div className="proof-item">
                <span className="proof-number">6+</span>
                <span className="proof-label">ML Models</span>
              </div>
              <div className="proof-divider" />
              <div className="proof-item">
                <span className="proof-number">50+</span>
                <span className="proof-label">Stocks Tracked</span>
              </div>
              <div className="proof-divider" />
              <div className="proof-item">
                <span className="proof-number">24/7</span>
                <span className="proof-label">Monitoring</span>
              </div>
            </div>

            <div className="auth-trust-row">
              <div className="trust-item">
                <span className="trust-tag">AES-256</span>
                <span className="trust-text">Encryption</span>
              </div>
              <div className="trust-item">
                <span className="trust-tag">LSTM</span>
                <span className="trust-text">Neural Networks</span>
              </div>
              <div className="trust-item">
                <span className="trust-tag">LIVE</span>
                <span className="trust-text">Market Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Auth form */}
        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-border" />

            {/* Mobile-only logo */}
            <div className="auth-mobile-logo">
              <img src="/WhiteLogoTransparent.svg" alt="MarketMind" className="auth-logo-img-sm" />
            </div>

            <div className="auth-toggle">
              <button
                type="button"
                className={`auth-toggle-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-toggle-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                Create Account
              </button>
              <div className={`toggle-slider ${mode === "signup" ? "right" : ""}`} />
            </div>

            <div className="auth-card-header">
              <h2>{mode === "login" ? "Welcome back" : "Get started"}</h2>
              <p>
                {mode === "login"
                  ? "Enter your credentials to access your dashboard."
                  : "Create an account and start with $100k paper trading."}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {mode === "signup" && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="displayName">Display Name</label>
                  <div className="auth-input-group">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input
                      id="displayName"
                      type="text"
                      name="displayName"
                      placeholder="Your trader alias"
                      value={form.displayName}
                      onChange={handleChange}
                      autoComplete="name"
                      maxLength={50}
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label" htmlFor="email">Email Address</label>
                <div className="auth-input-group">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                  {mode === "signup" && form.email && (
                    <span className="input-status">
                      {emailChecking && <span className="email-spinner" />}
                      {!emailChecking && emailAvailable === true && (
                        <span className="email-ok" title="Available">{"\u2713"}</span>
                      )}
                      {!emailChecking && emailAvailable === false && (
                        <span className="email-taken" title="Already registered">{"\u2717"}</span>
                      )}
                    </span>
                  )}
                </div>
                {mode === "signup" && emailAvailable === false && (
                  <span className="field-hint error">This email is already registered.</span>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="password">Password</label>
                <div className="auth-input-group">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={mode === "signup" ? "Min 8 chars, upper, lower, number, symbol" : "••••••••"}
                    value={form.password}
                    onChange={handleChange}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {mode === "signup" && form.password && (
                  <>
                    <div className="pw-strength-bar">
                      <div
                        className="pw-strength-fill"
                        style={{ width: `${pwStrength.pct}%`, background: pwStrength.color }}
                      />
                    </div>
                    <span className="pw-strength-label" style={{ color: pwStrength.color }}>
                      {pwStrength.label}
                    </span>
                    <PasswordChecks password={form.password} />
                  </>
                )}
              </div>

              {mode === "signup" && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
                  <div className="auth-input-group">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirm ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <span className="field-hint error">Passwords don't match</span>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 && (
                    <span className="field-hint success">Passwords match</span>
                  )}
                </div>
              )}

              {mode === "signup" && (
                <label className="auth-terms">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span>
                    I agree to the{" "}
                    <button type="button" className="terms-link" onClick={() => alert("Terms & Conditions: This is an academic project platform for paper trading simulation. No real money is involved. Your data is stored securely and never shared with third parties.")}>
                      Terms & Conditions
                    </button>{" "}
                    and{" "}
                    <button type="button" className="terms-link" onClick={() => alert("Privacy Policy: We collect only your email and display name. Passwords are hashed with BCrypt. Data is encrypted at rest and in transit via HTTPS.")}>
                      Privacy Policy
                    </button>
                  </span>
                </label>
              )}

              {error && (
                <div className="auth-error">
                  <svg className="error-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || (mode === "signup" && !termsAccepted)}
              >
                {loading ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" />
                    {mode === "login" ? "Authenticating..." : "Creating account..."}
                  </span>
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <svg className="btn-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </>
                )}
              </button>

              <p className="auth-switch">
                {mode === "login" ? "New to MarketMind?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Create an account" : "Sign in instead"}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
