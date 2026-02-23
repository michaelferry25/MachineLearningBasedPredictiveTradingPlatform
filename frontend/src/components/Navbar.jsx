import { useState } from 'react';

const SKILL_STYLES = {
  Beginner: { color: "#4ade80", title: "Beginner Trader", className: "skill-beginner" },
  Intermediate: { color: "#60a5fa", title: "Market Analyst", className: "skill-intermediate" },
  Expert: { color: "#f59e0b", title: "Expert Trader", className: "skill-expert" }
};

export default function Navbar({ user, onLogout, variant = "app", currentRoute = "/overview", userSkillLevel = "Beginner" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showAppLinks = variant === "app";

  const primaryLinks = [
    { label: "Dashboard", href: "#/dashboard" },
    { label: "Live Market", href: "#/live" },
    { label: "Scanner", href: "#/screener" },
    { label: "Analytics", href: "#/analytics" },
    { label: "Portfolio", href: "#/portfolio" },
    { label: "Research", href: "#/research" },
    { label: "Learn", href: "#/learn" }
  ];

  const secondaryLinks = [
    { label: "Overview", href: "#/overview" },
    { label: "Security", href: "#/security" },
    { label: "About", href: "#/about" }
  ];

  return (
    <nav className="navbar-modern">
      <div className="nav-container">
        <a href="#/overview" className="nav-logo">
          <img src="/WhiteLogoTransparent.svg" alt="MarketMind" className="logo-img" />
        </a>

        {showAppLinks && (
          <>
            <div className="nav-links-desktop">
              {primaryLinks.map((link) => {
                const route = link.href.replace("#", "");
                const isActive = currentRoute === route;
                return (
                  <a key={link.href} href={link.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                    {link.label}
                  </a>
                );
              })}
            </div>

            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </>
        )}

        <div className="nav-actions">
          {user ? (
            <>
              <a href="#/profile" className={`user-profile ${SKILL_STYLES[userSkillLevel]?.className || ''}`}>
                <div className="user-avatar" style={{ borderColor: SKILL_STYLES[userSkillLevel]?.color }}>
                  {user.displayName?.[0] || 'T'}
                </div>
                <div className="user-name-group">
                  <span className="user-name-desktop" style={{ color: SKILL_STYLES[userSkillLevel]?.color }}>
                    {user.displayName || 'Trader'}
                  </span>
                  <span className="user-skill-tag" style={{ color: SKILL_STYLES[userSkillLevel]?.color }}>
                    {SKILL_STYLES[userSkillLevel]?.title}
                  </span>
                </div>
              </a>
              <button className="btn-signout" onClick={onLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <a className="btn-signin" href="#/auth">Sign In</a>
          )}
        </div>
      </div>

      {showAppLinks && mobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-section">
            <div className="mobile-menu-label">Main</div>
            {primaryLinks.map((link) => (
              <a 
                key={link.href} 
                href={link.href} 
                className="mobile-menu-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          
          <div className="mobile-menu-section">
            <div className="mobile-menu-label">More</div>
            {secondaryLinks.map((link) => (
              <a 
                key={link.href} 
                href={link.href} 
                className="mobile-menu-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a href="#/profile" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Profile
            </a>
            <a href="#/settings" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Settings
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}