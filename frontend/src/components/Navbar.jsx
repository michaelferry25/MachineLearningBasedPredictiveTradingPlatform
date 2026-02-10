import { useState } from 'react';

export default function Navbar({ user, onLogout, variant = "app", currentRoute = "/overview" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showAppLinks = variant === "app";

  const primaryLinks = [
    { label: "Dashboard", href: "#/dashboard" },
    { label: "Live Market", href: "#/live" },
    { label: "Analytics", href: "#/analytics" },
    { label: "Portfolio", href: "#/portfolio" },
    { label: "Research", href: "#/research" }
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
              <a href="#/profile" className="user-profile">
                <div className="user-avatar">{user.displayName?.[0] || 'T'}</div>
                <span className="user-name-desktop">{user.displayName || 'Trader'}</span>
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