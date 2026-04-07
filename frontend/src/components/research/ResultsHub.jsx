import { useState, useEffect, useMemo } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import "./ResultsHub.css";

ChartJS.register(BarElement, PointElement, LineElement, Filler, CategoryScale, LinearScale, Tooltip, Legend);

const API = import.meta.env.VITE_API_URL || "";
const TRACKED = ["AAPL", "MSFT", "TSLA", "AMZN", "NVDA", "META", "NFLX", "GOOGL"];

const TEXT = "#c9d1d9";
const GRID = "rgba(48, 54, 61, 0.5)";

// ── utils ─────────────────────────────────────────────────────────
function safeJson(r) {
  if (!r.ok) return Promise.reject(new Error(`HTTP ${r.status}`));
  return r.json();
}
function pct(v, d = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Number(v).toFixed(d)}%`;
}
function pp(v, d = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${Number(v).toFixed(d)} pp`;
}
function usd(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}
function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

// Baselines: computed client-side from the raw points returned by the API.
// - "Always Up" / "Always Down" = direction-rule baseline, best-of selected
// - Persistence MAPE = |actual - current| / actual (i.e. predict price = current)
function computeBaselines(points) {
  const ev = (points || []).filter(p => p.status === "evaluated" && p.actualPrice != null);
  if (!ev.length) return null;
  const total = ev.length;

  const upCount   = ev.filter(p => p.realizedDirection === "UP").length;
  const downCount = ev.filter(p => p.realizedDirection === "DOWN").length;

  const alwaysUpRate   = (upCount   / total) * 100;
  const alwaysDownRate = (downCount / total) * 100;
  const bestNaiveRate  = Math.max(alwaysUpRate, alwaysDownRate);
  const bestNaiveName  = alwaysUpRate >= alwaysDownRate ? "Always-Up" : "Always-Down";

  const modelHits = ev.filter(p => p.hit === true).length;
  const modelRate = (modelHits / total) * 100;

  const upDayHits   = ev.filter(p => p.realizedDirection === "UP"   && p.hit === true).length;
  const downDayHits = ev.filter(p => p.realizedDirection === "DOWN" && p.hit === true).length;
  const upDayRate   = upCount   > 0 ? (upDayHits   / upCount)   * 100 : null;
  const downDayRate = downCount > 0 ? (downDayHits / downCount) * 100 : null;

  const persistErrs = ev
    .filter(p => p.currentPrice != null && p.actualPrice != null && p.actualPrice !== 0)
    .map(p => Math.abs(p.actualPrice - p.currentPrice) / p.actualPrice * 100);
  const persistenceMape = avg(persistErrs);

  const modelErrs = ev
    .filter(p => p.percentError != null)
    .map(p => Math.abs(p.percentError));
  const modelMape = avg(modelErrs);

  return {
    total, upCount, downCount,
    modelRate, alwaysUpRate, alwaysDownRate,
    bestNaiveRate, bestNaiveName,
    edgePp: modelRate - bestNaiveRate,
    upDayRate, downDayRate,
    modelMape, persistenceMape,
    mapeReductionPct: (persistenceMape != null && modelMape != null && persistenceMape > 0)
      ? ((persistenceMape - modelMape) / persistenceMape) * 100
      : null
  };
}

function barColor(hr) {
  if (hr == null) return "rgba(139, 148, 158, 0.55)";
  if (hr >= 60) return "rgba(63, 185, 80, 0.85)";
  if (hr >= 50) return "rgba(88, 166, 255, 0.85)";
  if (hr >= 40) return "rgba(210, 153, 34, 0.85)";
  return "rgba(248, 81, 73, 0.85)";
}

// ── component ─────────────────────────────────────────────────────
export default function ResultsHub() {
  const [trackRecords, setTrackRecords] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          TRACKED.map(s =>
            fetch(`${API}/api/ml/track-record/${s}?days=365&includePending=true`)
              .then(safeJson)
              .catch(e => ({ __error: e.message, symbol: s }))
          )
        );
        const map = {};
        results.forEach((r, i) => { if (!r.__error) map[TRACKED[i]] = r; });
        setTrackRecords(map);
        if (Object.keys(map).length === 0) setError("Couldn't reach the model API.");
      } catch (e) {
        setError(`Failed to load: ${e.message}`);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Per-symbol baselines
  const baselinesBySymbol = useMemo(() => {
    const out = {};
    TRACKED.forEach(s => {
      const b = computeBaselines(trackRecords[s]?.points);
      if (b) out[s] = b;
    });
    return out;
  }, [trackRecords]);

  // Pooled baseline (all symbols)
  const pooled = useMemo(() => {
    const allPoints = Object.values(trackRecords)
      .flatMap(r => r?.points || []);
    return computeBaselines(allPoints);
  }, [trackRecords]);

  // Headline KPIs (pooled)
  const headline = useMemo(() => {
    const symbols = Object.keys(baselinesBySymbol);
    return {
      avgHitRate: pooled?.modelRate ?? null,
      avgMape:    pooled?.modelMape ?? null,
      totalEvals: pooled?.total     ?? 0,
      edgePp:     pooled?.edgePp    ?? null,
      bestNaiveName: pooled?.bestNaiveName ?? "—",
      bestNaiveRate: pooled?.bestNaiveRate ?? null,
      persistenceMape: pooled?.persistenceMape ?? null,
      mapeReductionPct: pooled?.mapeReductionPct ?? null,
      upDayRate:   pooled?.upDayRate   ?? null,
      downDayRate: pooled?.downDayRate ?? null,
      symbolsWithData: symbols.length
    };
  }, [pooled, baselinesBySymbol]);

  // Predicted vs Actual chart for selected symbol
  const pvaChart = useMemo(() => {
    const points = trackRecords[selectedSymbol]?.points || [];
    const evaluated = points.filter(p => p.status === "evaluated" && p.actualPrice != null);
    if (!evaluated.length) return null;
    const labels = evaluated.map(p =>
      new Date(p.targetAt || p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    );
    return {
      labels,
      datasets: [
        {
          label: "Actual",
          data: evaluated.map(p => Number(p.actualPrice)),
          borderColor: "#58a6ff",
          backgroundColor: "rgba(88, 166, 255, 0.15)",
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true
        },
        {
          label: "Predicted",
          data: evaluated.map(p => Number(p.predictedPrice)),
          borderColor: "#d29922",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 2,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false
        }
      ]
    };
  }, [trackRecords, selectedSymbol]);

  // Grouped bar chart: Model vs Best Naive per symbol
  const modelVsNaiveChart = useMemo(() => {
    const labels = [];
    const modelData = [];
    const naiveData = [];
    TRACKED.forEach(s => {
      const b = baselinesBySymbol[s];
      if (!b) return;
      labels.push(s);
      modelData.push(Number(b.modelRate.toFixed(2)));
      naiveData.push(Number(b.bestNaiveRate.toFixed(2)));
    });
    if (!labels.length) return null;
    return {
      labels,
      datasets: [
        {
          label: "MarketMind Ensemble",
          data: modelData,
          backgroundColor: "rgba(63, 185, 80, 0.85)",
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: "Best Naive Baseline",
          data: naiveData,
          backgroundColor: "rgba(139, 148, 158, 0.55)",
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    };
  }, [baselinesBySymbol]);

  const selectedBaselines = baselinesBySymbol[selectedSymbol];
  const hasAnyEvals = headline.totalEvals > 0;

  if (loading) {
    return (
      <section className="section-wrapper results-hub">
        <div className="results-hub-loading">
          <div className="chart-skeleton" style={{ height: 80 }} />
          <div className="chart-skeleton" style={{ height: 300, marginTop: 12 }} />
          <p className="results-loading-text">Loading model results…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-wrapper results-hub" aria-labelledby="results-title">
      <header className="results-hub-header">
        <div>
          <h1 id="results-title" className="results-title">Model Performance</h1>
          <p className="results-subtitle">
            Live production metrics for the MarketMind ensemble across {TRACKED.length} tracked symbols,
            benchmarked against naive baselines for an honest view of predictive skill.
          </p>
        </div>
      </header>

      {error && <div role="alert" className="results-error">{error}</div>}

      {/* ── Hero KPIs ────────────────────────────────────────────── */}
      <div className="kpi-band">
        <div className="kpi-card kpi-hero">
          <div className="kpi-label">Average Hit Rate</div>
          <div className="kpi-value kpi-value-lg">{pct(headline.avgHitRate, 1)}</div>
          <div className="kpi-sub">Direction accuracy · coinflip is 50%</div>
        </div>
        <div className={`kpi-card ${headline.edgePp > 0 ? "kpi-good" : headline.edgePp != null ? "kpi-warn" : ""}`}>
          <div className="kpi-label">Skill Edge vs Naive</div>
          <div className="kpi-value">{pp(headline.edgePp, 1)}</div>
          <div className="kpi-sub">
            over {headline.bestNaiveName} ({pct(headline.bestNaiveRate, 1)})
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Average Error</div>
          <div className="kpi-value">{pct(headline.avgMape, 2)}</div>
          <div className="kpi-sub">
            {headline.mapeReductionPct != null
              ? `${headline.mapeReductionPct >= 0 ? "−" : "+"}${Math.abs(headline.mapeReductionPct).toFixed(1)}% vs persistence (${pct(headline.persistenceMape, 2)})`
              : "MAPE, lower is better"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Predictions Evaluated</div>
          <div className="kpi-value">{headline.totalEvals.toLocaleString()}</div>
          <div className="kpi-sub">Across {headline.symbolsWithData} symbols</div>
        </div>
      </div>

      {!hasAnyEvals && (
        <div className="results-empty-banner">
          <strong>No evaluated predictions yet.</strong>
          <span> The scheduler logs forecasts hourly and the evaluator grades them after market close.</span>
        </div>
      )}

      {/* ── Talking points / viva readout ────────────────────────── */}
      {hasAnyEvals && (
        <div className="talking-points">
          <h2 className="results-section-title">What These Numbers Mean</h2>
          <ul className="talking-list">
            <li>
              The ensemble achieves <strong>{pct(headline.avgHitRate, 1)}</strong> direction accuracy across
              {" "}{headline.totalEvals.toLocaleString()} evaluated forecasts, a
              <strong className={headline.edgePp > 0 ? "tp-pos" : "tp-neg"}> {pp(headline.edgePp, 1)}</strong> edge
              over the best naive strategy ({headline.bestNaiveName} at {pct(headline.bestNaiveRate, 1)}) in the current regime.
            </li>
            <li>
              MAPE of <strong>{pct(headline.avgMape, 2)}</strong> on forecast price vs persistence baseline
              of <strong>{pct(headline.persistenceMape, 2)}</strong> —
              {headline.mapeReductionPct != null && headline.mapeReductionPct > 0
                ? <> a <strong className="tp-pos">{headline.mapeReductionPct.toFixed(1)}% error reduction</strong> from predicting the forward price instead of assuming it stays flat.</>
                : <> the model is not currently beating persistence on price-magnitude error.</>}
            </li>
            <li>
              Hit rate on up-days: <strong>{pct(headline.upDayRate, 1)}</strong> ·
              Hit rate on down-days: <strong>{pct(headline.downDayRate, 1)}</strong>.
              {" "}{headline.upDayRate != null && headline.downDayRate != null && Math.min(headline.upDayRate, headline.downDayRate) >= 50
                ? "Balanced performance across regimes suggests the edge isn't purely market drift."
                : "Asymmetric regime performance suggests some dependence on market direction; worth discussing as a limitation."}
            </li>
          </ul>
        </div>
      )}

      {/* ── Main chart: Predicted vs Actual ──────────────────────── */}
      {hasAnyEvals && (
        <div className="results-panel results-panel-hero">
          <div className="results-panel-header">
            <div>
              <h2 className="results-panel-title">Predicted vs Actual — {selectedSymbol}</h2>
              <p className="results-panel-desc">
                Every evaluated forecast plotted against the realised closing price. Closer lines = more accurate predictions.
              </p>
            </div>
            <div className="symbol-pills" role="tablist" aria-label="Select symbol">
              {TRACKED.map(s => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={s === selectedSymbol}
                  onClick={() => setSelectedSymbol(s)}
                  className={`symbol-pill ${s === selectedSymbol ? "symbol-pill-active" : ""}`}
                >{s}</button>
              ))}
            </div>
          </div>

          {pvaChart ? (
            <>
              <div className="chart-host chart-host-wide">
                <Line
                  data={pvaChart}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                      legend: { position: "top", align: "end",
                        labels: { color: TEXT, font: { size: 12, weight: 600 }, usePointStyle: true, pointStyle: "line" } },
                      tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}` } }
                    },
                    scales: {
                      x: { ticks: { color: TEXT }, grid: { display: false } },
                      y: { ticks: { color: TEXT, callback: v => `$${v}` }, grid: { color: GRID } }
                    }
                  }}
                />
              </div>
              {selectedBaselines && (
                <div className="inline-stats-row">
                  <span><strong>{pct(selectedBaselines.modelRate, 1)}</strong> model hit rate</span>
                  <span><strong>{pct(selectedBaselines.bestNaiveRate, 1)}</strong> {selectedBaselines.bestNaiveName.toLowerCase()}</span>
                  <span className={selectedBaselines.edgePp > 0 ? "tp-pos" : "tp-neg"}>
                    <strong>{pp(selectedBaselines.edgePp, 1)}</strong> edge
                  </span>
                  <span><strong>{pct(selectedBaselines.modelMape, 2)}</strong> MAPE</span>
                  <span><strong>{selectedBaselines.total}</strong> evaluated</span>
                </div>
              )}
            </>
          ) : (
            <div className="chart-empty">No evaluated forecasts yet for {selectedSymbol}.</div>
          )}
        </div>
      )}

      {/* ── Model vs Naive Baseline (the viva chart) ─────────────── */}
      {modelVsNaiveChart && (
        <div className="results-panel">
          <h2 className="results-panel-title">Model vs Naive Baseline — Hit Rate per Symbol</h2>
          <p className="results-panel-desc">
            Green bars: MarketMind ensemble direction accuracy. Grey bars: the best naive strategy
            (always-up or always-down, whichever is higher for that symbol's evaluation window).
            The gap between the two is the <em>skill edge</em> — what the model earns over a dumb
            "follow the prevailing trend" rule.
          </p>
          <div className="chart-host chart-host-tall">
            <Bar
              data={modelVsNaiveChart}
              options={{
                responsive: true, maintainAspectRatio: false, indexAxis: "y",
                plugins: {
                  legend: { position: "top", align: "end",
                    labels: { color: TEXT, font: { size: 12, weight: 600 }, usePointStyle: true } },
                  tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(2)}%` } }
                },
                scales: {
                  x: { min: 0, max: 100,
                    ticks: { color: TEXT, callback: v => `${v}%` },
                    grid: { color: GRID } },
                  y: { ticks: { color: TEXT, font: { weight: 600 } }, grid: { display: false } }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── Regime breakdown ─────────────────────────────────────── */}
      {hasAnyEvals && (
        <div className="results-panel">
          <h2 className="results-panel-title">Regime Breakdown</h2>
          <p className="results-panel-desc">
            Hit rate split by whether the stock actually went up or down on the day.
            A model that only wins on up-days in a bull market isn't skilful — it's lucky.
            Both bars well above 50% = regime-robust.
          </p>
          <div className="regime-grid">
            <div className="regime-cell regime-up">
              <div className="regime-label">Up-day hit rate</div>
              <div className="regime-value">{pct(headline.upDayRate, 1)}</div>
              <div className="regime-sub">{pooled?.upCount ?? 0} up-day forecasts</div>
            </div>
            <div className="regime-cell regime-down">
              <div className="regime-label">Down-day hit rate</div>
              <div className="regime-value">{pct(headline.downDayRate, 1)}</div>
              <div className="regime-sub">{pooled?.downCount ?? 0} down-day forecasts</div>
            </div>
            <div className="regime-cell regime-spread">
              <div className="regime-label">Spread</div>
              <div className="regime-value">
                {headline.upDayRate != null && headline.downDayRate != null
                  ? pp(headline.upDayRate - headline.downDayRate, 1)
                  : "—"}
              </div>
              <div className="regime-sub">closer to 0 = regime-robust</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent forecasts table ───────────────────────────────── */}
      {trackRecords[selectedSymbol]?.points?.length > 0 && (
        <div className="results-panel">
          <h2 className="results-panel-title">Recent Forecasts — {selectedSymbol}</h2>
          <p className="results-panel-desc">
            Last {Math.min(10, trackRecords[selectedSymbol].points.length)} forecasts. Pending rows are awaiting market close.
          </p>
          <div className="table-scroll">
            <table className="results-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col" className="tbl-num">Predicted</th>
                  <th scope="col" className="tbl-num">Actual</th>
                  <th scope="col">Direction</th>
                  <th scope="col">Result</th>
                  <th scope="col" className="tbl-num">Error</th>
                </tr>
              </thead>
              <tbody>
                {[...trackRecords[selectedSymbol].points].reverse().slice(0, 10).map((r, i) => {
                  const isPending = r.status !== "evaluated" || r.actualPrice == null;
                  const hit = r.hit === true;
                  const miss = r.hit === false && !isPending;
                  const dateRaw = r.targetAt || r.createdAt;
                  const dateLabel = dateRaw
                    ? new Date(dateRaw).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                    : `#${i + 1}`;
                  const dirLabel = r.direction === "UP" ? "↑ UP" : r.direction === "DOWN" ? "↓ DOWN" : "—";
                  return (
                    <tr key={r.id ?? i}>
                      <td>{dateLabel}</td>
                      <td className="tbl-num">{usd(r.predictedPrice)}</td>
                      <td className="tbl-num">{isPending ? "—" : usd(r.actualPrice)}</td>
                      <td>{dirLabel}</td>
                      <td>
                        <span className={`result-pill ${hit ? "result-hit" : miss ? "result-miss" : "result-pending"}`}>
                          {isPending ? "Pending" : hit ? "Hit" : "Miss"}
                        </span>
                      </td>
                      <td className="tbl-num">
                        {isPending || r.percentError == null ? "—" : `${Number(r.percentError).toFixed(2)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer className="results-footnote">
        <p>
          All figures computed live from the production API (<code>/api/ml/*</code>). Baselines are derived
          client-side from the same point data: <strong>Always-Up</strong> / <strong>Always-Down</strong>
          pick the higher-scoring constant direction rule; <strong>persistence MAPE</strong> is the error you
          would achieve by predicting the forward price equals the current price. The <em>skill edge</em> is
          the percentage-point gap between the ensemble and the best naive strategy on the same evaluation
          window — a standard "out-of-the-box" benchmark for financial forecasting models.
        </p>
      </footer>
    </section>
  );
}
