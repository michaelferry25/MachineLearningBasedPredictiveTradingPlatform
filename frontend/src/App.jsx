import Navbar from "./components/Navbar";
import "./App.css";

export default function App() {
  return (
    <>
      <Navbar />

      <div className="landing-container">
        <h1>Trading Insight</h1>
        <p>Your machine learning powered trading platform.</p>

        <div className="buttons">
          <button className="btn">View Dashboard</button>
          <button className="btn secondary">API Docs</button>
        </div>
      </div>
    </>
  );
}
