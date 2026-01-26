export default function Navbar({ user, onLogout, variant = "app" }) {
  const showAppLinks = variant === "app";
  const showAuthActions = variant === "auth" && !user;

  return (
    <nav className={`navbar ${variant === "auth" ? "navbar-auth" : ""}`}>
      <div className="nav-content">
        <div className="logo">⚡ MarketMind</div>
        <div className="nav-links">
          {showAppLinks && (
            <>
              <a href="#dashboard">Dashboard</a>
              <a href="#portfolio">Portfolio</a>
              <a href="#about">About</a>
            </>
          )}

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
              <a className="nav-btn" href="#auth">Sign In</a>
              <a className="nav-btn signup" href="#auth">Sign Up</a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
