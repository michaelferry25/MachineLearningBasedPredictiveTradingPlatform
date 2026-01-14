export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="logo">⚡ Trading Insight</div>
        <div className="nav-links">
          <a href="#dashboard">Dashboard</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#about">About</a>
          <button className="nav-btn">Sign In</button>
        </div>
      </div>
    </nav>
  );
}