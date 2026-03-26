import './LegalPage.css';

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <a href="#/overview" className="legal-back-link">&larr; Back to MarketMind</a>

      <div className="legal-header">
        <h1>Cookie &amp; Storage Policy</h1>
        <div className="legal-meta">
          <span>Last updated: March 27, 2026</span>
          <span className="legal-version-badge">Version 1.0</span>
        </div>
      </div>

      <div className="legal-highlight">
        MarketMind does not use traditional HTTP cookies for tracking. We use your browser's Local Storage and Session Storage exclusively for essential platform functionality. We do not use any third-party analytics or advertising trackers.
      </div>

      <nav className="legal-toc">
        <h3>Table of Contents</h3>
        <ol>
          <li><a href="#cp-what">What Are Cookies &amp; Web Storage</a></li>
          <li><a href="#cp-local">Local Storage Usage</a></li>
          <li><a href="#cp-session">Session Storage Usage</a></li>
          <li><a href="#cp-third-party">Third-Party Content</a></li>
          <li><a href="#cp-managing">Managing Your Data</a></li>
          <li><a href="#cp-changes">Changes to This Policy</a></li>
        </ol>
      </nav>

      <section className="legal-section" id="cp-what">
        <h2>1. What Are Cookies &amp; Web Storage</h2>
        <h3>Cookies</h3>
        <p>Cookies are small text files stored on your device by a website. They are widely used to make websites function, improve efficiency, and provide reporting information. MarketMind does not set any HTTP cookies directly.</p>
        <h3>Local Storage</h3>
        <p>Local Storage is a web browser feature that allows websites to store data on your device with no expiration date. The data persists even after you close your browser. Unlike cookies, Local Storage data is not automatically sent to the server with every request.</p>
        <h3>Session Storage</h3>
        <p>Session Storage is similar to Local Storage but is cleared when you close the browser tab or window. It is used for temporary data that is only needed during your current browsing session.</p>
      </section>

      <section className="legal-section" id="cp-local">
        <h2>2. Local Storage Usage</h2>
        <p>MarketMind stores the following data in your browser's Local Storage. All items are essential for the platform to function correctly:</p>

        <h3>2.1 Authentication Token</h3>
        <ul>
          <li><strong>Key:</strong> <code>marketmind_token</code></li>
          <li><strong>Purpose:</strong> Stores your JWT (JSON Web Token) authentication token to keep you logged in between page refreshes and browser sessions.</li>
          <li><strong>Data stored:</strong> Encrypted token string containing your user ID, role, and session expiration time.</li>
          <li><strong>Expiry:</strong> The token expires after 60 minutes of inactivity. The Local Storage entry is removed when you log out.</li>
          <li><strong>Essential:</strong> Yes — the platform cannot authenticate you without this.</li>
        </ul>

        <h3>2.2 User Profile Cache</h3>
        <ul>
          <li><strong>Key:</strong> <code>marketmind_user</code></li>
          <li><strong>Purpose:</strong> Caches your basic profile information (display name, email, role) for faster UI rendering without requiring an API call on every page load.</li>
          <li><strong>Data stored:</strong> JSON object with your display name, email, and user role.</li>
          <li><strong>Expiry:</strong> Updated on each login. Removed when you log out.</li>
          <li><strong>Essential:</strong> Yes — used for displaying your name and role in the navigation bar.</li>
        </ul>

        <h3>2.3 User Settings</h3>
        <ul>
          <li><strong>Key:</strong> <code>marketmind_settings</code></li>
          <li><strong>Purpose:</strong> Stores your display preferences so they persist between sessions.</li>
          <li><strong>Data stored:</strong> JSON object containing your theme preference (dark/light), reduced motion setting, and compact mode setting.</li>
          <li><strong>Expiry:</strong> Persists until you change settings or clear browser data.</li>
          <li><strong>Essential:</strong> Yes — ensures your display preferences are remembered.</li>
        </ul>
      </section>

      <section className="legal-section" id="cp-session">
        <h2>3. Session Storage Usage</h2>
        <p>The following data is stored in Session Storage and is automatically cleared when you close the browser tab:</p>

        <h3>3.1 Selected Stock</h3>
        <ul>
          <li><strong>Key:</strong> <code>screener_selected_stock</code></li>
          <li><strong>Purpose:</strong> Remembers which stock you selected in the Stock Screener so it remains selected if you navigate away and return during the same session.</li>
          <li><strong>Data stored:</strong> Stock ticker symbol (e.g., "AAPL").</li>
          <li><strong>Essential:</strong> No — convenience feature for better user experience.</li>
        </ul>

        <h3>3.2 New Signup Flag</h3>
        <ul>
          <li><strong>Key:</strong> <code>marketmind_new_signup</code></li>
          <li><strong>Purpose:</strong> Temporarily flags that you have just created a new account, allowing the platform to display a welcome experience on your first login.</li>
          <li><strong>Data stored:</strong> Boolean flag ("true").</li>
          <li><strong>Essential:</strong> No — used only for the initial welcome experience.</li>
        </ul>
      </section>

      <section className="legal-section" id="cp-third-party">
        <h2>4. Third-Party Content</h2>
        <h3>4.1 TradingView Widget</h3>
        <p>MarketMind embeds TradingView chart widgets for market data visualisation. TradingView may set its own cookies or use its own storage mechanisms when these widgets are loaded. These are subject to <a href="https://www.tradingview.com/policies/" target="_blank" rel="noopener noreferrer">TradingView's own privacy and cookie policies</a>.</p>
        <p>We have no control over and accept no responsibility for TradingView's data practices.</p>

        <h3>4.2 No Analytics or Advertising Trackers</h3>
        <p>MarketMind does <strong>not</strong> use any of the following:</p>
        <ul>
          <li>Google Analytics or any other web analytics service.</li>
          <li>Advertising trackers or retargeting pixels.</li>
          <li>Social media tracking pixels (Facebook Pixel, Twitter Pixel, etc.).</li>
          <li>Any form of cross-site tracking or fingerprinting.</li>
        </ul>
      </section>

      <section className="legal-section" id="cp-managing">
        <h2>5. Managing Your Data</h2>
        <p>You have full control over the data stored in your browser:</p>

        <h3>5.1 Viewing Stored Data</h3>
        <p>You can view all data MarketMind has stored in your browser by opening your browser's Developer Tools (usually F12 or Ctrl+Shift+I) and navigating to the "Application" or "Storage" tab.</p>

        <h3>5.2 Clearing Data</h3>
        <p>You can clear all MarketMind data from your browser at any time by:</p>
        <ul>
          <li><strong>Logging out:</strong> The logout function automatically clears your authentication token and cached user data from Local Storage.</li>
          <li><strong>Browser settings:</strong> Use your browser's "Clear browsing data" or "Clear site data" feature to remove all Local Storage and Session Storage data for the MarketMind domain.</li>
          <li><strong>Developer Tools:</strong> Manually delete individual storage entries via the Application/Storage tab in Developer Tools.</li>
        </ul>
        <p>Please note that clearing your authentication token will log you out. Clearing your settings will reset your display preferences to defaults.</p>

        <h3>5.3 Deleting Your Account</h3>
        <p>Deleting your account via the <a href="#/settings">Settings</a> page will remove all server-side data. To also remove client-side data, clear your browser's Local Storage as described above, or simply log out before deleting your account.</p>
      </section>

      <section className="legal-section" id="cp-changes">
        <h2>6. Changes to This Policy</h2>
        <p>We may update this Cookie &amp; Storage Policy from time to time. Changes will be reflected by updating the "Last updated" date at the top of this page. We encourage you to review this policy periodically.</p>
        <p>If you have any questions about this policy, please contact us:</p>
        <div className="legal-contact-card">
          <p><strong>MarketMind</strong></p>
          <p>Email: <a href="mailto:support@marketmind.cfd">support@marketmind.cfd</a></p>
        </div>
      </section>
    </div>
  );
}
