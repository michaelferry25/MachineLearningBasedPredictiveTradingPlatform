import './LegalPage.css';

export default function AcceptableUse() {
  return (
    <div className="legal-page">
      <a href="#/overview" className="legal-back-link">&larr; Back to MarketMind</a>

      <div className="legal-header">
        <h1>Acceptable Use Policy</h1>
        <div className="legal-meta">
          <span>Last updated: March 27, 2026</span>
          <span className="legal-version-badge">Version 1.0</span>
        </div>
      </div>

      <div className="legal-highlight">
        This Acceptable Use Policy ("AUP") sets out the rules and guidelines for using the MarketMind platform. By accessing or using the Service, you agree to comply with this policy. Violations may result in suspension or termination of your account.
      </div>

      <nav className="legal-toc">
        <h3>Table of Contents</h3>
        <ol>
          <li><a href="#aup-purpose">Purpose</a></li>
          <li><a href="#aup-prohibited">Prohibited Activities</a></li>
          <li><a href="#aup-security">Account Security</a></li>
          <li><a href="#aup-integrity">Platform Integrity</a></li>
          <li><a href="#aup-consequences">Consequences of Violations</a></li>
          <li><a href="#aup-reporting">Reporting Violations</a></li>
        </ol>
      </nav>

      <section className="legal-section" id="aup-purpose">
        <h2>1. Purpose</h2>
        <p>This Acceptable Use Policy is designed to ensure that all users can enjoy a safe, fair, and productive experience on the MarketMind platform. The Service is intended for educational purposes — learning about financial markets, trading concepts, and machine learning applications.</p>
        <p>By using the Service, you agree to use it responsibly and in accordance with all applicable laws and regulations, as well as these guidelines.</p>
      </section>

      <section className="legal-section" id="aup-prohibited">
        <h2>2. Prohibited Activities</h2>
        <p>You agree not to engage in any of the following activities:</p>

        <h3>2.1 Abuse &amp; Exploitation</h3>
        <ul>
          <li>Using automated scripts, bots, scrapers, or other automated means to access or interact with the Service without prior written consent.</li>
          <li>Attempting to exploit bugs, glitches, or vulnerabilities in the platform for unfair advantage in simulated trading.</li>
          <li>Attempting to manipulate simulated trading results, leaderboard rankings, or portfolio values through illegitimate means.</li>
          <li>Flooding the platform with excessive API requests, automated trades, or other actions intended to degrade performance.</li>
        </ul>

        <h3>2.2 Unauthorised Access</h3>
        <ul>
          <li>Accessing or attempting to access another user's account without their explicit authorisation.</li>
          <li>Attempting to bypass, circumvent, or disable any authentication, security, or access control mechanisms.</li>
          <li>Probing, scanning, or testing the vulnerability of the Service or any related system or network without authorisation.</li>
          <li>Accessing any part of the Service that you are not authorised to access (e.g., the admin dashboard without admin privileges).</li>
        </ul>

        <h3>2.3 Account Misuse</h3>
        <ul>
          <li>Creating multiple accounts for the same person.</li>
          <li>Sharing your account credentials with others.</li>
          <li>Using a false identity or impersonating another person.</li>
          <li>Registering with a disposable or temporary email address with the intent to abuse the Service.</li>
        </ul>

        <h3>2.4 Harmful Conduct</h3>
        <ul>
          <li>Uploading, transmitting, or distributing any content that is unlawful, harmful, threatening, abusive, defamatory, or otherwise objectionable.</li>
          <li>Using the Service to conduct any illegal activity or to promote illegal activities.</li>
          <li>Attempting to introduce viruses, malware, or other malicious code to the platform.</li>
          <li>Interfering with or disrupting the Service or servers or networks connected to the Service.</li>
        </ul>

        <h3>2.5 Intellectual Property Violations</h3>
        <ul>
          <li>Reverse engineering, decompiling, disassembling, or otherwise attempting to derive the source code of the Service (except to the extent permitted by applicable law).</li>
          <li>Copying, reproducing, or distributing any part of the Service without prior written consent.</li>
          <li>Removing, altering, or obscuring any copyright, trademark, or other proprietary notices.</li>
        </ul>
      </section>

      <section className="legal-section" id="aup-security">
        <h2>3. Account Security</h2>
        <p>You are responsible for maintaining the security of your account. This includes:</p>
        <ul>
          <li>Using a strong, unique password that meets the platform's requirements (minimum 8 characters, including uppercase, lowercase, number, and special character).</li>
          <li>Not sharing your password or account access with anyone.</li>
          <li>Logging out of your account when using shared or public devices.</li>
          <li>Promptly notifying us at <a href="mailto:support@marketmind.cfd">support@marketmind.cfd</a> if you suspect any unauthorised access to your account.</li>
        </ul>
        <p>We are not responsible for any loss or damage resulting from your failure to maintain the security of your account credentials.</p>
      </section>

      <section className="legal-section" id="aup-integrity">
        <h2>4. Platform Integrity</h2>
        <p>To maintain the quality and reliability of the Service for all users, you agree to:</p>
        <ul>
          <li>Use the Service only for its intended educational purpose.</li>
          <li>Respect the simulated nature of the trading environment and not represent simulated results as real trading performance.</li>
          <li>Not attempt to overload, stress-test, or benchmark the Service without prior written authorisation.</li>
          <li>Report any bugs, security vulnerabilities, or issues you discover to <a href="mailto:support@marketmind.cfd">support@marketmind.cfd</a> rather than exploiting them.</li>
          <li>Respect other users' privacy and not attempt to access their data or accounts.</li>
        </ul>
      </section>

      <section className="legal-section" id="aup-consequences">
        <h2>5. Consequences of Violations</h2>
        <p>Violations of this Acceptable Use Policy may result in one or more of the following actions, at our sole discretion:</p>
        <ul>
          <li><strong>Warning:</strong> A formal notification that your conduct violates this policy.</li>
          <li><strong>Temporary suspension:</strong> Temporary restriction of your access to the Service.</li>
          <li><strong>Portfolio reset:</strong> Resetting your simulated portfolio to its default state.</li>
          <li><strong>Account termination:</strong> Permanent deletion of your account and all associated data.</li>
          <li><strong>Legal action:</strong> Where appropriate, referral to law enforcement authorities for illegal activity.</li>
        </ul>
        <p>We reserve the right to take any of these actions without prior notice if we determine, in our sole discretion, that your conduct poses a risk to the Service, its users, or any third party.</p>
      </section>

      <section className="legal-section" id="aup-reporting">
        <h2>6. Reporting Violations</h2>
        <p>If you become aware of any violation of this Acceptable Use Policy, or if you experience any abusive or harmful conduct on the platform, please report it immediately:</p>
        <div className="legal-contact-card">
          <p><strong>MarketMind — Abuse Reporting</strong></p>
          <p>Email: <a href="mailto:support@marketmind.cfd">support@marketmind.cfd</a></p>
        </div>
        <p>Please include as much detail as possible, including the nature of the violation, the user(s) involved, and any relevant screenshots or evidence. All reports will be reviewed promptly and treated confidentially.</p>
      </section>
    </div>
  );
}
