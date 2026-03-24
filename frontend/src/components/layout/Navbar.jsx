import { useState, useRef, useEffect } from 'react';
import MarketStatus from './MarketStatus';

const API_URL = import.meta.env.VITE_API_URL || "";

const SKILL_STYLES = {
  Beginner: { color: "#4ade80", title: "Beginner Trader", className: "skill-beginner" },
  Intermediate: { color: "#60a5fa", title: "Market Analyst", className: "skill-intermediate" },
  Expert: { color: "#f59e0b", title: "Expert Trader", className: "skill-expert" }
};

const NAV_GROUPS = [
  {
    label: "Trade",
    items: [
      { label: "Dashboard", href: "#/dashboard", desc: "Charts, predictions & paper trading" },
      { label: "Live Market", href: "#/live", desc: "Real-time candlestick charts" }
    ]
  },
  {
    label: "Markets",
    items: [
      { label: "AI Scanner", href: "#/screener", desc: "Screen stocks with AI signals" },
      { label: "Analytics", href: "#/analytics", desc: "Market overview & AI insights" },
      { label: "Research", href: "#/research", desc: "AI research briefs & sentiment" }
    ]
  },
  {
    label: "Portfolio",
    items: [
      { label: "Portfolio", href: "#/portfolio", desc: "Holdings, equity curve & trade history" },
      { label: "Optimiser", href: "#/optimizer", desc: "Markowitz efficient frontier analysis" },
      { label: "Backtester", href: "#/backtester", desc: "Walk-forward ML strategy simulation" }
    ]
  },
  { label: "Learn", href: "#/learn" }
];

const MORE_LINKS = [
  { label: "Overview", href: "#/overview", desc: "Platform homepage" },
  { label: "Security", href: "#/security", desc: "How we keep your data safe" },
  { label: "About", href: "#/about", desc: "About MarketMind" }
];

/* Short hash from email for account ID display */
function generateAccountId(email) {
  if (!email) return "000000";
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString().slice(0, 8).padStart(8, "0");
}

export default function Navbar({ user, onLogout, variant = "app", currentRoute = "/overview", userSkillLevel = "Beginner", authToken, portfolio }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [assetsVisible, setAssetsVisible] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [livePortfolio, setLivePortfolio] = useState(portfolio || null);
  const profileRef = useRef(null);
  const profileTimeoutRef = useRef(null);
  const showAppLinks = variant === "app";

  /* Sync portfolio prop */
  useEffect(() => {
    if (portfolio) setLivePortfolio(portfolio);
  }, [portfolio]);

  /* Fetch portfolio when dropdown opens if we don't have data */
  useEffect(() => {
    if (profileDropdownOpen && authToken && !livePortfolio) {
      fetch(`${API_URL}/api/trading/portfolio`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setLivePortfolio(data); })
        .catch(() => {});
    }
  }, [profileDropdownOpen, authToken, livePortfolio]);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileExpanded(null);
  }, [currentRoute]);

  const isRouteActive = (href) => currentRoute === href.replace("#", "");
  const isGroupActive = (group) => group.href ? isRouteActive(group.href) : group.items?.some(i => isRouteActive(i.href));

  const toggleMobileSection = (label) => setMobileExpanded(prev => prev === label ? null : label);

  const handleProfileEnter = () => {
    clearTimeout(profileTimeoutRef.current);
    setProfileDropdownOpen(true);
  };

  const handleProfileLeave = () => {
    profileTimeoutRef.current = setTimeout(() => setProfileDropdownOpen(false), 250);
  };

  const copyAccountId = () => {
    const id = generateAccountId(user?.email);
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    });
  };

  const formatMoney = (val) => {
    if (!assetsVisible) return "****";
    if (val == null) return "--";
    return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const skill = SKILL_STYLES[userSkillLevel] || SKILL_STYLES.Beginner;
  const accountId = user ? generateAccountId(user.email) : "";
  const totalReturn = livePortfolio ? ((livePortfolio.totalValue - 100000) / 100000 * 100) : null;

  return (
    <>
      <nav className="navbar-modern">
        <div className="nav-container">
          <a href="#/overview" className="nav-logo">
            <img src="/WhiteLogoTransparent.svg" alt="MarketMind" className="logo-img" />
          </a>

          {showAppLinks && (
            <div className="nav-links-desktop">
              {NAV_GROUPS.map((group) => {
                if (group.href) {
                  return (
                    <a key={group.label} href={group.href} className={`nav-link ${isRouteActive(group.href) ? "active" : ""}`}>
                      {group.label}
                    </a>
                  );
                }
                return (
                  <div key={group.label} className="nav-dropdown-wrap">
                    <button className={`nav-link nav-dropdown-trigger ${isGroupActive(group) ? "active" : ""}`}>
                      {group.label}
                      <svg className="nav-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <div className="nav-dropdown-panel">
                      {group.items.map((item) => (
                        <a key={item.href} href={item.href} className={`nav-dropdown-item ${isRouteActive(item.href) ? "active" : ""}`}>
                          <span className="nav-dropdown-item-label">{item.label}</span>
                          <span className="nav-dropdown-item-desc">{item.desc}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="nav-dropdown-wrap">
                <button className="nav-link nav-dropdown-trigger">
                  More
                  <svg className="nav-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="nav-dropdown-panel">
                  {MORE_LINKS.map((item) => (
                    <a key={item.href} href={item.href} className={`nav-dropdown-item ${isRouteActive(item.href) ? "active" : ""}`}>
                      <span className="nav-dropdown-item-label">{item.label}</span>
                      <span className="nav-dropdown-item-desc">{item.desc}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showAppLinks && (
            <button className={`mobile-menu-btn ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          )}

          {/* ── Market Status ── */}
          {showAppLinks && <MarketStatus />}

          {/* ── Profile / Auth ── */}
          <div className="nav-actions">
            {user ? (
              <div className="nav-profile-wrap" ref={profileRef} onMouseEnter={handleProfileEnter} onMouseLeave={handleProfileLeave}>
                <button className={`nav-profile-trigger ${skill.className}`} onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
                  <div className="user-avatar" style={{ borderColor: skill.color }}>
                    {user.displayName?.[0] || "T"}
                  </div>
                  <svg className={`nav-chevron profile-chevron ${profileDropdownOpen ? "flipped" : ""}`} width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {profileDropdownOpen && (
                  <div className="nav-profile-dropdown">
                    {/* Header: avatar + name + skill badge + account ID */}
                    <div className="pdrop-header">
                      <div className={`pdrop-avatar ${skill.className}`} style={{ borderColor: skill.color }}>
                        {user.displayName?.[0] || "T"}
                      </div>
                      <div className="pdrop-user-info">
                        <div className="pdrop-name-row">
                          <span className="pdrop-name">{user.displayName || "Trader"}</span>
                          <span className="pdrop-skill-badge" style={{ background: `${skill.color}20`, color: skill.color, borderColor: `${skill.color}40` }}>
                            {skill.title}
                          </span>
                        </div>
                        <div className="pdrop-id-row">
                          <span className="pdrop-id-label">UID:</span>
                          <span className="pdrop-id-value">{accountId}</span>
                          <button className="pdrop-copy-btn" onClick={copyAccountId} title="Copy UID">
                            {copiedId ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pdrop-divider" />

                    {/* Assets section */}
                    <div className="pdrop-assets-section">
                      <div className="pdrop-assets-header">
                        <span className="pdrop-assets-title">Assets</span>
                        <button className="pdrop-eye-btn" onClick={() => setAssetsVisible(!assetsVisible)} title={assetsVisible ? "Hide assets" : "Show assets"}>
                          {assetsVisible ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="pdrop-assets-total">
                        <span className="pdrop-total-label">Total Value</span>
                        <span className="pdrop-total-value">{formatMoney(livePortfolio?.totalValue)}</span>
                        {totalReturn != null && assetsVisible && (
                          <span className={`pdrop-total-pnl ${totalReturn >= 0 ? "positive" : "negative"}`}>
                            {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="pdrop-assets-grid">
                        <div className="pdrop-asset-item">
                          <span className="pdrop-asset-label">Holdings</span>
                          <span className="pdrop-asset-value">{formatMoney(livePortfolio?.holdingsValue)}</span>
                        </div>
                        <div className="pdrop-asset-item">
                          <span className="pdrop-asset-label">Cash</span>
                          <span className="pdrop-asset-value">{formatMoney(livePortfolio?.cashBalance)}</span>
                        </div>
                        <div className="pdrop-asset-item">
                          <span className="pdrop-asset-label">Positions</span>
                          <span className="pdrop-asset-value">{assetsVisible ? (livePortfolio?.positions?.length ?? "--") : "****"}</span>
                        </div>
                        <div className="pdrop-asset-item">
                          <span className="pdrop-asset-label">Trades</span>
                          <span className="pdrop-asset-value">{assetsVisible ? (livePortfolio?.tradeCount ?? "--") : "****"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pdrop-divider" />

                    {/* Nav links */}
                    <div className="pdrop-links">
                      <a href="#/profile" className="pdrop-link" onClick={() => setProfileDropdownOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Account
                      </a>
                      <a href="#/portfolio" className="pdrop-link" onClick={() => setProfileDropdownOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                        Portfolio
                      </a>
                      <a href="#/learn" className="pdrop-link" onClick={() => setProfileDropdownOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                        Academy
                      </a>
                      <a href="#/settings" className="pdrop-link" onClick={() => setProfileDropdownOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                        Settings
                      </a>
                    </div>

                    <div className="pdrop-divider" />

                    <button className="pdrop-logout" onClick={() => { setProfileDropdownOpen(false); onLogout(); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a className="btn-signin" href="#/auth">Sign In</a>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile fullscreen menu (outside nav to avoid backdrop-filter containing block) ── */}
      {showAppLinks && mobileMenuOpen && (
        <div className="mobile-menu-overlay">
          <div className="mobile-menu-header">
            <a href="#/overview" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
              <img src="/WhiteLogoTransparent.svg" alt="MarketMind" className="logo-img" />
            </a>
            <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mobile-menu-body">
            {NAV_GROUPS.map((group) => {
              if (group.href) {
                return (
                  <a key={group.label} href={group.href} className={`mobile-menu-link ${isRouteActive(group.href) ? "active" : ""}`} onClick={() => setMobileMenuOpen(false)}>
                    {group.label}
                  </a>
                );
              }
              const isExpanded = mobileExpanded === group.label;
              return (
                <div key={group.label} className="mobile-menu-group">
                  <button className={`mobile-menu-link mobile-menu-group-trigger ${isExpanded ? "expanded" : ""}`} onClick={() => toggleMobileSection(group.label)}>
                    {group.label}
                    <svg className={`mobile-chevron ${isExpanded ? "rotated" : ""}`} width="12" height="7" viewBox="0 0 12 7" fill="none">
                      <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="mobile-menu-sub">
                      {group.items.map((item) => (
                        <a key={item.href} href={item.href} className={`mobile-menu-sub-link ${isRouteActive(item.href) ? "active" : ""}`} onClick={() => setMobileMenuOpen(false)}>
                          {item.label}
                          <span className="mobile-sub-desc">{item.desc}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="mobile-menu-group">
              <button className={`mobile-menu-link mobile-menu-group-trigger ${mobileExpanded === "More" ? "expanded" : ""}`} onClick={() => toggleMobileSection("More")}>
                More
                <svg className={`mobile-chevron ${mobileExpanded === "More" ? "rotated" : ""}`} width="12" height="7" viewBox="0 0 12 7" fill="none">
                  <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {mobileExpanded === "More" && (
                <div className="mobile-menu-sub">
                  {MORE_LINKS.map((item) => (
                    <a key={item.href} href={item.href} className={`mobile-menu-sub-link ${isRouteActive(item.href) ? "active" : ""}`} onClick={() => setMobileMenuOpen(false)}>
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {user && (
            <div className="mobile-menu-footer">
              <a href="#/profile" className="mobile-profile-card" onClick={() => setMobileMenuOpen(false)}>
                <div className={`user-avatar ${skill.className}`} style={{ borderColor: skill.color }}>
                  {user.displayName?.[0] || "T"}
                </div>
                <div className="mobile-profile-info">
                  <span className="mobile-profile-name">{user.displayName || "Trader"}</span>
                  <span className="mobile-profile-skill" style={{ color: skill.color }}>{skill.title}</span>
                </div>
              </a>
              <button className="mobile-logout-btn" onClick={() => { setMobileMenuOpen(false); onLogout(); }}>
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
