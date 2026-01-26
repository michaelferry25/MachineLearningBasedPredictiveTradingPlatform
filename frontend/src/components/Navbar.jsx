export default function Navbar({ user, onLogout, variant = "app", currentRoute = "/overview" }) {
  const showAppLinks = variant === "app";
  const showAuthActions = variant === "auth" && !user;

  const links = [
    { label: "Overview", href: "#/overview" },
    { label: "Live", href: "#/live" },
    { label: "Analytics", href: "#/analytics" },
    { label: "Sessions", href: "#/sessions" },
    { label: "Dashboard", href: "#/dashboard" },
    { label: "Research", href: "#/research" },
    { label: "Security", href: "#/security" },
    { label: "About", href: "#/about" }
  ];

  return (
    <nav className={`navbar ${variant === "auth" ? "navbar-auth" : ""}`}>
      <div className="nav-content">
        <div className="logo">⚡ MarketMind</div>
        <div className="nav-links">
          {showAppLinks &&
            links.map((link) => {
              const route = link.href.replace("#", "");
              const isActive = currentRoute === route;
              return (
                <a key={link.href} href={link.href} className={isActive ? "active" : ""}>
                  {link.label}
                </a>
              );
            })}
        </div>

        <div className="nav-actions">
          {user && (
            <div className="nav-user">
              <span className="nav-user-name">{user.displayName || "Trader"}</span>
              <button className="nav-btn" onClick={onLogout} type="button">
                Sign Out
              </button>
            </div>
          )}

          {showAuthActions && (
            <>
              <a className="nav-btn" href="#/auth">Sign In</a>
              <a className="nav-btn signup" href="#/auth">Sign Up</a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
