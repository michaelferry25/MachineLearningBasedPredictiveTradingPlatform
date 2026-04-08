import './LegalPage.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <a href="#/overview" className="legal-back-link">&larr; Back to MarketMind</a>

      <div className="legal-header">
        <h1>Privacy Policy</h1>
        <div className="legal-meta">
          <span>Last updated: March 27, 2026</span>
          <span className="legal-version-badge">Version 1.0</span>
        </div>
      </div>

      <div className="legal-highlight">
        <strong>Your privacy matters.</strong> MarketMind is an academic project that collects only the minimum data necessary to provide the Service. We do not sell, rent, or share your personal data with third parties for marketing purposes.
      </div>

      <nav className="legal-toc">
        <h3>Table of Contents</h3>
        <ol>
          <li><a href="#pp-controller">Data Controller</a></li>
          <li><a href="#pp-collected">Data We Collect</a></li>
          <li><a href="#pp-use">How We Use Your Data</a></li>
          <li><a href="#pp-legal-basis">Legal Basis for Processing (GDPR)</a></li>
          <li><a href="#pp-storage">Data Storage &amp; Security</a></li>
          <li><a href="#pp-cookies">Cookies &amp; Local Storage</a></li>
          <li><a href="#pp-third-party">Third-Party Services</a></li>
          <li><a href="#pp-retention">Data Retention</a></li>
          <li><a href="#pp-rights">Your Rights</a></li>
          <li><a href="#pp-children">Children's Privacy</a></li>
          <li><a href="#pp-transfers">International Data Transfers</a></li>
          <li><a href="#pp-changes">Changes to This Policy</a></li>
          <li><a href="#pp-contact">Contact Information</a></li>
        </ol>
      </nav>

      <section className="legal-section" id="pp-controller">
        <h2>1. Data Controller</h2>
        <p>MarketMind is an academic Final Year Project. For the purposes of applicable data protection legislation (including the EU General Data Protection Regulation 2016/679, "GDPR"), the data controller is:</p>
        <div className="legal-contact-card">
          <p><strong>Michael Ferry</strong></p>
          <p>Email: <a href="mailto:support@marketmind.cfd">support@marketmind.cfd</a></p>
        </div>
      </section>

      <section className="legal-section" id="pp-collected">
        <h2>2. Data We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li><strong>Account information:</strong> Email address, display name, and password (stored as a BCrypt hash — we never store plaintext passwords).</li>
          <li><strong>Profile preferences:</strong> Theme settings, display preferences, and notification preferences.</li>
          <li><strong>Terms acceptance:</strong> Timestamp and version of Terms of Service accepted.</li>
        </ul>
        <h3>2.2 Information Generated Through Use</h3>
        <ul>
          <li><strong>Simulated trading activity:</strong> Paper trade orders (buy/sell), virtual portfolio holdings, trade history, and simulated profit/loss calculations.</li>
          <li><strong>Learning progress:</strong> Completed lessons, quiz scores, XP points, and skill level.</li>
          <li><strong>ML prediction requests:</strong> Stock symbols you search for and prediction data generated for those symbols.</li>
        </ul>
        <h3>2.3 Information We Do NOT Collect</h3>
        <ul>
          <li>Real financial account numbers, bank details, or payment information.</li>
          <li>Government-issued identification.</li>
          <li>Precise geolocation data.</li>
          <li>Data from your contacts, camera, or microphone.</li>
          <li>Browsing activity on other websites (we do not use tracking pixels or cross-site trackers).</li>
        </ul>
      </section>

      <section className="legal-section" id="pp-use">
        <h2>3. How We Use Your Data</h2>
        <p>We use the data we collect exclusively for the following purposes:</p>
        <ul>
          <li><strong>Providing the Service:</strong> Authenticating your account, managing your simulated portfolio, displaying predictions, and tracking learning progress.</li>
          <li><strong>Platform improvement:</strong> Analysing aggregated, anonymised usage patterns to improve the Service (e.g., ML model accuracy metrics).</li>
          <li><strong>Security:</strong> Detecting and preventing unauthorised access, abuse, or fraud.</li>
          <li><strong>Academic purposes:</strong> Aggregated, anonymised data may be referenced in the Final Year Project report and presentation.</li>
        </ul>
        <p><strong>We do not:</strong></p>
        <ul>
          <li>Sell your personal data to third parties.</li>
          <li>Use your data for targeted advertising.</li>
          <li>Share your individual data with any third party without your explicit consent.</li>
          <li>Use your data for automated decision-making that produces legal effects concerning you.</li>
        </ul>
      </section>

      <section className="legal-section" id="pp-legal-basis">
        <h2>4. Legal Basis for Processing (GDPR)</h2>
        <p>Under the GDPR, we process your personal data on the following legal bases:</p>
        <ul>
          <li><strong>Consent (Article 6(1)(a)):</strong> You provide explicit consent when creating your account and accepting these terms. You may withdraw consent at any time by deleting your account.</li>
          <li><strong>Contract performance (Article 6(1)(b)):</strong> Processing is necessary to provide the Service you have requested (e.g., managing your account and simulated portfolio).</li>
          <li><strong>Legitimate interest (Article 6(1)(f)):</strong> Processing for platform security, abuse prevention, and aggregated analytics, where these interests do not override your fundamental rights.</li>
        </ul>
      </section>

      <section className="legal-section" id="pp-storage">
        <h2>5. Data Storage &amp; Security</h2>
        <p>We implement appropriate technical and organisational measures to protect your personal data:</p>
        <ul>
          <li><strong>Encryption in transit:</strong> All data transmitted between your browser and our servers is encrypted using HTTPS (TLS/SSL) with Let's Encrypt certificates.</li>
          <li><strong>Password hashing:</strong> Passwords are hashed using BCrypt with a cost factor of 10. We never store or have access to your plaintext password.</li>
          <li><strong>Database security:</strong> Data is stored in a PostgreSQL 15 database hosted on a secured Microsoft Azure virtual machine with restricted network access.</li>
          <li><strong>Authentication tokens:</strong> JWT (JSON Web Tokens) are used for session management, signed with HS256 and configured to expire after 60 minutes.</li>
          <li><strong>Access control:</strong> Role-based access control (RBAC) restricts administrative functions to authorised personnel only.</li>
        </ul>
        <p>While we strive to use commercially acceptable means to protect your personal data, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.</p>
      </section>

      <section className="legal-section" id="pp-cookies">
        <h2>6. Cookies &amp; Local Storage</h2>
        <p>MarketMind does not use traditional HTTP cookies. Instead, we use your browser's Local Storage and Session Storage for essential functionality. For full details, please see our <a href="#/cookie-policy">Cookie Policy</a>.</p>
        <p>In summary, we store:</p>
        <ul>
          <li><strong>Authentication token:</strong> A JWT token to keep you logged in.</li>
          <li><strong>User preferences:</strong> Theme, display settings, and compact mode preferences.</li>
          <li><strong>Cached user data:</strong> Your display name and role for UI rendering.</li>
        </ul>
        <p>We do not use any third-party tracking cookies or analytics services (such as Google Analytics).</p>
      </section>

      <section className="legal-section" id="pp-third-party">
        <h2>7. Third-Party Services</h2>
        <p>MarketMind integrates with the following third-party services to provide market data and analysis. When you use features that rely on these services, data requests are made from our server (not your browser) on your behalf:</p>
        <ul>
          <li><strong>Finnhub (finnhub.io):</strong> Real-time and historical stock price data. Subject to <a href="https://finnhub.io/terms-of-service" target="_blank" rel="noopener noreferrer">Finnhub's Terms of Service</a>.</li>
          <li><strong>Yahoo Finance (via yfinance):</strong> Historical price data for ML model training and technical indicator calculations.</li>
          <li><strong>NewsAPI (newsapi.org):</strong> Financial news articles for sentiment analysis. Subject to <a href="https://newsapi.org/terms" target="_blank" rel="noopener noreferrer">NewsAPI's Terms</a>.</li>
          <li><strong>Reddit (reddit.com):</strong> Public post data from financial subreddits for sentiment analysis. Subject to <a href="https://www.redditinc.com/policies/user-agreement" target="_blank" rel="noopener noreferrer">Reddit's User Agreement</a>.</li>
          <li><strong>TradingView:</strong> Embedded chart widgets for market visualisation. Subject to <a href="https://www.tradingview.com/policies/" target="_blank" rel="noopener noreferrer">TradingView's Policies</a>.</li>
        </ul>
        <p>We do not share your personal account information with any of these services. API requests are made using platform-level API keys, not your personal credentials.</p>
      </section>

      <section className="legal-section" id="pp-retention">
        <h2>8. Data Retention</h2>
        <p>We retain your personal data for as long as your account remains active. Specifically:</p>
        <ul>
          <li><strong>Account data:</strong> Retained until you delete your account.</li>
          <li><strong>Trading history:</strong> Retained with your account for portfolio performance tracking.</li>
          <li><strong>Learning progress:</strong> Retained with your account.</li>
          <li><strong>ML prediction logs:</strong> Aggregated prediction data may be retained for model accuracy analysis after anonymisation.</li>
        </ul>
        <p>When you delete your account (via Settings), all personally identifiable data is permanently removed from our database. Anonymised, aggregated statistics may be retained for academic reporting purposes.</p>
      </section>

      <section className="legal-section" id="pp-rights">
        <h2>9. Your Rights</h2>
        <p>Under the GDPR and applicable Irish data protection law, you have the following rights:</p>
        <ul>
          <li><strong>Right of access (Article 15):</strong> You can view your personal data at any time via your <a href="#/profile">Profile</a> and <a href="#/portfolio">Portfolio</a> pages.</li>
          <li><strong>Right to rectification (Article 16):</strong> You can update your display name and profile information via your <a href="#/profile">Profile</a> page.</li>
          <li><strong>Right to erasure (Article 17):</strong> You can delete your account and all associated data via the <a href="#/settings">Settings</a> page ("Delete Account" feature).</li>
          <li><strong>Right to data portability (Article 20):</strong> You can export your trade history and portfolio data in CSV format from the <a href="#/portfolio">Portfolio</a> page.</li>
          <li><strong>Right to withdraw consent:</strong> You may withdraw your consent at any time by deleting your account. This does not affect the lawfulness of processing carried out before withdrawal.</li>
          <li><strong>Right to lodge a complaint:</strong> You have the right to lodge a complaint with the Irish Data Protection Commission (DPC) at <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">www.dataprotection.ie</a>.</li>
        </ul>
        <p>To exercise any of these rights, please contact us at the email address provided below.</p>
      </section>

      <section className="legal-section" id="pp-children">
        <h2>10. Children's Privacy</h2>
        <p>The Service is not directed to children under the age of 13. We do not knowingly collect personal data from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us immediately. If we become aware that we have collected personal data from a child under 13 without verification of parental consent, we will take steps to remove that information from our servers.</p>
        <p>Users between the ages of 13 and 18 should use the Service only with the involvement and consent of a parent or legal guardian.</p>
      </section>

      <section className="legal-section" id="pp-transfers">
        <h2>11. International Data Transfers</h2>
        <p>The Service is hosted on Microsoft Azure infrastructure. Third-party APIs used by the Service (Finnhub, NewsAPI, Yahoo Finance, Reddit) may process data on servers located outside the European Economic Area (EEA), including in the United States.</p>
        <p>Where personal data is transferred outside the EEA, we rely on:</p>
        <ul>
          <li>The European Commission's adequacy decisions, where applicable.</li>
          <li>Standard Contractual Clauses (SCCs) adopted by the European Commission.</li>
          <li>The service providers' compliance with applicable data protection frameworks.</li>
        </ul>
      </section>

      <section className="legal-section" id="pp-changes">
        <h2>12. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this page and, where appropriate, posting a notice on the platform.</p>
        <p>We encourage you to review this Privacy Policy periodically for any changes. Changes are effective when they are posted on this page. Your continued use of the Service after changes are posted constitutes your acceptance of the revised policy.</p>
      </section>

      <section className="legal-section" id="pp-contact">
        <h2>13. Contact Information</h2>
        <p>If you have any questions about this Privacy Policy, wish to exercise your data protection rights, or have a complaint, please contact us:</p>
        <div className="legal-contact-card">
          <p><strong>MarketMind — Data Protection</strong></p>
          <p>Email: <a href="mailto:support@marketmind.cfd">support@marketmind.cfd</a></p>
        </div>
        <p>You also have the right to contact the Irish Data Protection Commission:</p>
        <div className="legal-contact-card">
          <p><strong>Data Protection Commission (DPC)</strong></p>
          <p>21 Fitzwilliam Square South, Dublin 2, D02 RD28, Ireland</p>
          <p>Website: <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">www.dataprotection.ie</a></p>
        </div>
      </section>
    </div>
  );
}
