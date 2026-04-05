import { useState, useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import "./ResultsHub.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API = import.meta.env.VITE_API_URL || "";
const TRACKED = ["AAPL", "MSFT", "TSLA", "AMZN", "NVDA", "META", "NFLX", "GOOGL"];

function safeJson(r) {
  if (!r.ok) return Promise.reject(new Error(`HTTP ${r.status}`));
  return r.json();
}

function formatPct(v, digits = 2) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return `${Number(v).toFixed(digits)}%`;
}

function formatPrice(v) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function reliabilityGrade(hitRate, mape) {
  if (hitRate == null || mape == null) return { grade: "—", tone: "neutral" };
  const score = (hitRate * 0.6) + ((10 - Math.min(mape, 10)) * 4);
  if (score > 75) return { grade: "A", tone: "good" };
  if (score > 60) return { grade: "B", tone: "good" };
  if (score > 45) return { grade: "C", tone: "warn" };
  if (score > 30) return { grade: "D", tone: "warn" };
  return { grade: "F", tone: "bad" };
}

export default function ResultsHub() {
  const [scan, setScan] = useState(null);
  const [trackRecords, setTrackRecords] = useState({});
  const [detailed, setDetailed] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSymbolDetails = async (symbol) => {
    setRefreshing(true);
    try {
      const [detailedRes, sentimentRes] = await Promise.allSettled([
        fetch(`${API}/api/ml/predict/${symbol}/detailed`).then(safeJson),
        fetch(`${API}/api/ml/sentiment/${symbol}`).then(safeJson)
      ]);
      if (detailedRes.status === "fulfilled") setDetailed(detailedRes.value);
      if (sentimentRes.status === "fulfilled") setSentiment(sentimentRes.value);
    } catch (e) {
      // best-effort; errors already surfaced by the initial loader
    }
    setRefreshing(false);
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const trackPromises = TRACKED.map(s =>
          fetch(`${API}/api/ml/track-record/${s}?days=365&includePending=true&source=scheduler_daily_close`)
            .then(safeJson)
            .catch(e => ({ __error: e.message, symbol: s }))
        );
        const [scanRes, ...trackResults] = await Promise.all([
          fetch(`${API}/api/ml/scan`).then(safeJson).catch(e => ({ __error: e.message })),
          ...trackPromises
        ]);

        if (!scanRes.__error) setScan(scanRes);

        const tm = {};
        trackResults.forEach((r, i) => {
          if (!r.__error) tm[TRACKED[i]] = r;
        });
        setTrackRecords(tm);

        const failures = [scanRes, ...trackResults].filter(r => r.__error).length;
        if (failures === TRACKED.length + 1) {
          setError("Couldn't reach the model API. Check your connection and try again.");
        } else if (failures > 2) {
          setError(`Partial data load — ${failures} requests failed.`);
        }
      } catch (e) {
        setError(`Failed to load results: ${e.message}`);
      }
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    loadSymbolDetails(selectedSymbol);
  }, [selectedSymbol]);

  // ── Derived aggregate metrics ────────────────────────────────────────
  const aggregate = useMemo(() => {
    const entries = Object.values(trackRecords).filter(Boolean);
    if (!entries.length) {
      return { avgHitRate: null, avgMape: null, totalEvals: 0, totalPending: 0, bestSymbol: null, worstSymbol: null };
    }
    let hrSum = 0, mapeSum = 0, hrCount = 0, mapeCount = 0;
    let totalEvals = 0, totalPending = 0;
    let best = null, worst = null;
    entries.forEach(e => {
      const hr = e.hitRate ?? e.hit_rate ?? e.directionAccuracy ?? null;
      const mape = e.mape ?? e.meanAbsolutePercentageError ?? null;
      if (hr != null) { hrSum += hr; hrCount += 1; }
      if (mape != null) { mapeSum += mape; mapeCount += 1; }
      totalEvals += e.evaluated ?? e.evaluatedCount ?? (e.records?.filter(r => r.result && r.result !== "PENDING").length ?? 0);
      totalPending += e.pending ?? e.pendingCount ?? (e.records?.filter(r => r.result === "PENDING").length ?? 0);
      if (hr != null) {
        if (!best || hr > best.hr) best = { symbol: e.symbol, hr };
        if (!worst || hr < worst.hr) worst = { symbol: e.symbol, hr };
      }
    });
    return {
      avgHitRate: hrCount ? hrSum / hrCount : null,
      avgMape: mapeCount ? mapeSum / mapeCount : null,
      totalEvals,
      totalPending,
      bestSymbol: best,
      worstSymbol: worst
    };
  }, [trackRecords]);

  const scanPredictions = useMemo(() => {
    if (!scan?.predictions) return {};
    const map = {};
    scan.predictions.forEach(p => { map[p.symbol] = p; });
    return map;
  }, [scan]);

  const featureChartData = useMemo(() => {
    if (!detailed?.feature_importance) return null;
    const top = detailed.feature_importance
      .filter(f => (f.importance ?? 0) > 0)
      .slice(0, 10)
      .reverse();
    return {
      labels: top.map(f => f.feature),
      datasets: [{
        label: "Importance",
        data: top.map(f => (f.importance * 100).toFixed(2)),
        backgroundColor: "rgba(88, 166, 255, 0.6)",
        borderColor: "#58a6ff",
        borderWidth: 1,
      }]
    };
  }, [detailed]);

  if (loading) {
    return (
      <section className="section-wrapper results-hub">
        <div className="results-hub-loading">
          <div className="chart-skeleton" style={{ height: 80 }} />
          <div className="chart-skeleton" style={{ height: 160, marginTop: 12 }} />
          <p className="results-loading-text">Loading model results…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-wrapper results-hub" aria-labelledby="results-title">
      <header className="results-hub-header">
        <div>
          <h1 id="results-title" className="results-title">Model Results &amp; Performance</h1>
          <p className="results-subtitle">
            Live production metrics across {TRACKED.length} tracked symbols. Automatically refreshed by the hourly prediction scheduler and the daily close evaluator.
          </p>
        </div>
        <div className="results-meta">
          <span className="results-tag">Ensemble: RF + GB + XGBoost</span>
          <span className="results-tag">FinBERT sentiment</span>
          <span className="results-tag">29 features</span>
        </div>
      </header>

      {error && (
        <div role="alert" className="results-error">{error}</div>
      )}

      {/* ── Aggregate KPIs ─────────────────────────────────────────────── */}
      <div className="kpi-band">
        <div className="kpi-card">
          <div className="kpi-label">Symbols Tracked</div>
          <div className="kpi-value">{TRACKED.length}</div>
          <div className="kpi-sub">Hourly + daily close</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Average Hit Rate</div>
          <div className="kpi-value">{aggregate.avgHitRate != null ? formatPct(aggregate.avgHitRate, 1) : "—"}</div>
          <div className="kpi-sub">Direction accuracy (UP/DOWN)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Average MAPE</div>
          <div className="kpi-value">{aggregate.avgMape != null ? formatPct(aggregate.avgMape, 2) : "—"}</div>
          <div className="kpi-sub">Lower is better</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Predictions Logged</div>
          <div className="kpi-value">{aggregate.totalEvals.toLocaleString()}</div>
          <div className="kpi-sub">{aggregate.totalPending} pending evaluation</div>
        </div>
      </div>

      {/* ── Per-symbol scorecards ─────────────────────────────────────── */}
      <h2 className="results-section-title">Per-Symbol Performance</h2>
      <div className="symbol-grid">
        {TRACKED.map(symbol => {
          const scanRow = scanPredictions[symbol];
          const track = trackRecords[symbol];
          const hitRate = track?.hitRate ?? track?.hit_rate ?? null;
          const mape = track?.mape ?? null;
          const rel = reliabilityGrade(hitRate, mape);
          const isActive = symbol === selectedSymbol;
          return (
            <button
              key={symbol}
              type="button"
              onClick={() => setSelectedSymbol(symbol)}
              className={`symbol-card ${isActive ? "symbol-card-active" : ""}`}
              aria-pressed={isActive}
              aria-label={`View detailed results for ${symbol}`}
            >
              <div className="symbol-card-row">
                <span className="symbol-ticker">{symbol}</span>
                <span className={`reliability-pill reliability-${rel.tone}`}>{rel.grade}</span>
              </div>
              <div className="symbol-card-row">
                <span className="symbol-price-label">Price</span>
                <span className="symbol-price-value">{formatPrice(scanRow?.current_price)}</span>
              </div>
              <div className="symbol-card-row">
                <span className="symbol-price-label">Forecast</span>
                <span className="symbol-price-value">{formatPrice(scanRow?.prediction)}</span>
              </div>
              <div className="symbol-card-row">
                <span className="symbol-price-label">Signal</span>
                <span className={`symbol-signal symbol-signal-${(scanRow?.signal || "hold").toLowerCase().replace(" ", "-")}`}>
                  {scanRow?.signal || "—"}
                </span>
              </div>
              <div className="symbol-card-metrics">
                <div className="symbol-metric">
                  <span className="symbol-metric-label">Hit Rate</span>
                  <span className="symbol-metric-value">{formatPct(hitRate, 1)}</span>
                </div>
                <div className="symbol-metric">
                  <span className="symbol-metric-label">MAPE</span>
                  <span className="symbol-metric-value">{formatPct(mape, 2)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Detailed view ─────────────────────────────────────────────── */}
      <div className="results-detail-header">
        <h2 className="results-section-title">Detailed view — {selectedSymbol}</h2>
        {refreshing && <span className="results-refreshing" aria-live="polite">Refreshing…</span>}
      </div>

      {detailed && (
        <>
          {/* Model comparison */}
          <div className="results-panel">
            <h3 className="results-panel-title">Ensemble Model Comparison</h3>
            <p className="results-panel-desc">
              Each constituent model's forward prediction, validation MAPE, R², and inverse-MAE ensemble weight.
            </p>
            <table className="results-table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col" className="tbl-num">Prediction</th>
                  <th scope="col" className="tbl-num">Expected Return</th>
                  <th scope="col" className="tbl-num">MAPE</th>
                  <th scope="col" className="tbl-num">R²</th>
                  <th scope="col" className="tbl-num">Weight</th>
                </tr>
              </thead>
              <tbody>
                {(detailed.model_comparison?.models || []).map(m => (
                  <tr key={m.name}>
                    <td>{m.name}</td>
                    <td className="tbl-num">{formatPrice(m.prediction)}</td>
                    <td className={`tbl-num ${m.predicted_return_pct >= 0 ? "tbl-pos" : "tbl-neg"}`}>
                      {m.predicted_return_pct != null ? `${m.predicted_return_pct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="tbl-num">{formatPct(m.mape, 2)}</td>
                    <td className="tbl-num">{m.r2 != null ? m.r2.toFixed(3) : "—"}</td>
                    <td className="tbl-num">{m.weight != null ? m.weight.toFixed(3) : "—"}</td>
                  </tr>
                ))}
                <tr className="results-table-footer">
                  <td><strong>Ensemble</strong></td>
                  <td className="tbl-num"><strong>{formatPrice(detailed.prediction)}</strong></td>
                  <td className={`tbl-num ${(detailed.expected_return_percent ?? 0) >= 0 ? "tbl-pos" : "tbl-neg"}`}>
                    <strong>{detailed.expected_return_percent != null ? `${detailed.expected_return_percent.toFixed(2)}%` : "—"}</strong>
                  </td>
                  <td className="tbl-num"><strong>{formatPct(detailed.model_comparison?.ensemble_mape, 2)}</strong></td>
                  <td className="tbl-num">—</td>
                  <td className="tbl-num"><strong>1.000</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Feature importance */}
          {featureChartData && (
            <div className="results-panel">
              <h3 className="results-panel-title">Top 10 Feature Importance</h3>
              <p className="results-panel-desc">
                Which technical, regime, and sentiment features the ensemble relies on most for this symbol.
              </p>
              <div style={{ maxWidth: 720 }}>
                <Bar
                  data={featureChartData}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        title: { display: true, text: "Importance (%)" },
                        grid: { color: "rgba(255,255,255,0.05)" }
                      },
                      y: { grid: { display: false } }
                    }
                  }}
                  height={320}
                />
              </div>
            </div>
          )}

          {/* Sentiment */}
          {sentiment?.combined && (
            <div className="results-panel">
              <h3 className="results-panel-title">Sentiment Snapshot</h3>
              <p className="results-panel-desc">
                Combined FinBERT sentiment across news articles and Reddit posts, weighted by source volume.
              </p>
              <div className="sentiment-grid">
                <div className="sentiment-cell">
                  <div className="sentiment-cell-label">Score</div>
                  <div className={`sentiment-cell-value ${sentiment.combined.score >= 0 ? "tbl-pos" : "tbl-neg"}`}>
                    {sentiment.combined.score != null ? sentiment.combined.score.toFixed(3) : "—"}
                  </div>
                  <div className="sentiment-cell-sub">{sentiment.combined.label || "—"}</div>
                </div>
                <div className="sentiment-cell">
                  <div className="sentiment-cell-label">Confidence</div>
                  <div className="sentiment-cell-value">{sentiment.combined.confidence != null ? `${sentiment.combined.confidence.toFixed(1)}%` : "—"}</div>
                  <div className="sentiment-cell-sub">{sentiment.combined.agreement || "—"} agreement</div>
                </div>
                <div className="sentiment-cell">
                  <div className="sentiment-cell-label">Sources</div>
                  <div className="sentiment-cell-value">{sentiment.combined.total_sources ?? 0}</div>
                  <div className="sentiment-cell-sub">
                    {sentiment.news?.article_count ?? 0} news · {sentiment.reddit?.post_count ?? 0} reddit
                  </div>
                </div>
                <div className="sentiment-cell">
                  <div className="sentiment-cell-label">Weights</div>
                  <div className="sentiment-cell-value">
                    {sentiment.combined.news_weight != null ? `${Math.round(sentiment.combined.news_weight * 100)}/${Math.round(sentiment.combined.reddit_weight * 100)}` : "—"}
                  </div>
                  <div className="sentiment-cell-sub">news / reddit blend</div>
                </div>
              </div>
            </div>
          )}

          {/* Track record */}
          {trackRecords[selectedSymbol]?.records?.length > 0 && (
            <div className="results-panel">
              <h3 className="results-panel-title">Recent Track Record</h3>
              <p className="results-panel-desc">
                Last {Math.min(10, trackRecords[selectedSymbol].records.length)} daily-close forecasts. Pending entries are awaiting the next market close.
              </p>
              <table className="results-table">
                <thead>
                  <tr>
                    <th scope="col">Forecast For</th>
                    <th scope="col" className="tbl-num">Predicted</th>
                    <th scope="col" className="tbl-num">Actual</th>
                    <th scope="col">Direction</th>
                    <th scope="col">Result</th>
                    <th scope="col" className="tbl-num">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {trackRecords[selectedSymbol].records.slice(0, 10).map((r, i) => {
                    const isPending = r.result === "PENDING" || r.actual == null;
                    const hit = (r.result || "").toUpperCase() === "HIT";
                    const miss = (r.result || "").toUpperCase() === "MISS";
                    return (
                      <tr key={i}>
                        <td>{r.forecastFor || r.targetDate || r.timestamp || `#${i + 1}`}</td>
                        <td className="tbl-num">{formatPrice(r.predicted ?? r.prediction)}</td>
                        <td className="tbl-num">{isPending ? "—" : formatPrice(r.actual)}</td>
                        <td>{r.direction ? (r.direction === "UP" ? "↑ UP" : "↓ DOWN") : "—"}</td>
                        <td>
                          <span className={`result-pill ${hit ? "result-hit" : miss ? "result-miss" : "result-pending"}`}>
                            {isPending ? "Pending" : (r.result || "—")}
                          </span>
                        </td>
                        <td className="tbl-num">
                          {isPending || r.errorPercent == null ? "—" : `${Number(r.errorPercent).toFixed(2)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <footer className="results-footnote">
        <p>
          Figures are computed live from the production API (<code>/api/ml/*</code>). No cached or static values.
          Direction accuracy measures whether the forecast correctly identified up-or-down movement to market close. MAPE is mean absolute percentage error on price.
        </p>
      </footer>
    </section>
  );
}
