/**
 * 404 page shown when the client-side hash route doesn't match any known view.
 * Replaces the previous silent fall-through to the overview page.
 */
export default function NotFoundPage({ route }) {
  return (
    <section className="section-wrapper" id="not-found" role="alert" aria-live="polite">
      <div className="section-header" style={{ textAlign: "center", padding: "64px 16px" }}>
        <span className="section-kicker">404</span>
        <h2>Page not found</h2>
        {route ? (
          <p>
            We couldn&apos;t find <code>{route}</code>. It may have been moved or never existed.
          </p>
        ) : (
          <p>We couldn&apos;t find the page you were looking for.</p>
        )}
        <p style={{ marginTop: 16 }}>
          <a href="#/overview" className="btn-primary">Return to overview</a>
        </p>
      </div>
    </section>
  );
}
