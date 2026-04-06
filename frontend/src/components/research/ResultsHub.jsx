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

function safeJson(r) {
  if (!r.ok) return Promise.reject(new Error(`HTTP ${r.status}`));
  return r.json();
}

function pct(v, d = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Number(v).toFixed(d)}%`;
}

function usd(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function barColor(hr) {
  if (hr == null) return "rgba(139, 148, 158, 0.55)";
  if (hr >= 60) return "rgba(63, 185, 80, 0.85)";
  if (hr >= 50) return "rgba(88, 166, 255, 0.85)";
  if (hr >= 40) return "rgba(210, 153, 34, 0.85)";
  return "rgba(248, 81, 73, 0.85)";
}

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
        if (Object.keys(map).length === 0) {
          setError("Couldn't reach the model API.");
        }
      } catch (e) {
        setError(`Failed to load: ${e.message}`);
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── Aggregate headline stats ─────────────────────────────────────
  const headline = useMemo(() => {
    const entries = Object.values(trackRecords).filter(Boolean);
    let hrSum = 0, mapeSum = 0, hrCount = 0, mapeCount = 0;
    let totalEvals = 0;
    let best = null;
    entries.forEach(e => {
      const s = e.stats || {};
      const ev = s.evaluated ?? 0;
      totalEvals += ev;
      if (ev > 0) {
        if (s.hitRate != null)  { hrSum += s.hitRate; hrCount++; }
        if (s.mape != null)     { mapeSum += s.mape;  mapeCount++; }
        if (!best || s.hitRate > best.hitRate) best = { symbol: e.symbol, hitRate: s.hitRate };
      }
    });
    return {
      avgHitRate: hrCount ? hrSum / hrCount : null,
      avgMape: mapeCount ? mapeSum / mapeCount : null,
      totalEvals,
      bestSymbol: best
    };
  }, [trackRecords]);

  // ── Hit Rate by Symbol bar chart ─────────────────────────────────
  const hitRateChart = useMemo(() => {
    const labels = [];
    const data = [];
    const colors = [];
    TRACKED.forEach(s => {
      const stats = trackRecords[s]?.stats;
      if (stats && (stats.evaluated ?? 0) > 0) {
        labels.push(s);
        data.push(Number(stats.hitRate?.toFixed(2) ?? 0));
        colors.push(barColor(stats.hitRate));
      }
    });
    return { labels, data, colors };
  }, [trackRecords]);

  // ── Predicted vs Actual line chart ───────────────────────────────
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

  const selectedStats = trackRecords[selectedSymbol]?.stats;
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
            How accurate the MarketMind ensemble has been on live production forecasts, tracked across {TRACKED.length} symbols.
          </p>
        </div>
      </header>

      {error && <div role="alert" className="results-error">{error}</div>}

      {/* ── Hero stats ───────────────────────────────────────────── */}
      <div className="kpi-band">
        <div className="kpi-card kpi-hero">
          <div className="kpi-label">Average Hit Rate</div>
          <div className="kpi-value kpi-value-lg">{pct(headline.avgHitRate, 1)}</div>
          <div className="kpi-sub">Direction accuracy · coinflip is 50%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Average Error</div>
          <div className="kpi-value">{pct(headline.avgMape, 2)}</div>
          <div className="kpi-sub">Mean absolute % error</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Predictions Evaluated</div>
          <div className="kpi-value">{headline.totalEvals.toLocaleString()}</div>
          <div className="kpi-sub">Since deployment</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Strongest Symbol</div>
          <div className="kpi-value">{headline.bestSymbol?.symbol || "—"}</div>
          <div className="kpi-sub">
            {headline.bestSymbol ? `${pct(headline.bestSymbol.hitRate, 1)} hit rate` : "awaiting data"}
          </div>
        </div>
      </div>

      {!hasAnyEvals && (
        <div className="results-empty-banner">
          <strong>No evaluated predictions yet.</strong>
          <span> The scheduler logs forecasts hourly and the evaluator grades them after market close. Charts will populate once the first cycle completes.</span>
        </div>
      )}

      {/* ── Main chart: Predicted vs Actual over time ────────────── */}
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
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {pvaChart ? (
            <>
              <div className="chart-host chart-host-wide">
                <Line
                  data={pvaChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                      legend: {
                        position: "top",
                        align: "end",
                        labels: { color: TEXT, font: { size: 12, weight: 600 }, usePointStyle: true, pointStyle: "line" }
                      },
                      tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}` } }
                    },
                    scales: {
                      x: { ticks: { color: TEXT }, grid: { display: false } },
                      y: { ticks: { color: TEXT, callback: v => `$${v}` }, grid: { color: GRID } }
                    }
                  }}
                />
              </div>
              {selectedStats && (
                <div className="inline-stats-row">
                  <span><strong>{pct(selectedStats.hitRate, 1)}</strong> hit rate</span>
                  <span><strong>{pct(selectedStats.mape, 2)}</strong> error</span>
                  <span><strong>{selectedStats.evaluated ?? 0}</strong> evaluated</span>
                  {selectedStats.reliabilityGrade && (
                    <span>Grade <strong>{selectedStats.reliabilityGrade}</strong></span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="chart-empty">No evaluated forecasts yet for {selectedSymbol}.</div>
          )}
        </div>
      )}

      {/* ── Hit Rate by Symbol ───────────────────────────────────── */}
      {hasAnyEvals && hitRateChart.labels.length > 0 && (
        <div className="results-panel">
          <h2 className="results-panel-title">Hit Rate by Symbol</h2>
          <p className="results-panel-desc">
            Direction-accuracy % per ticker. Green &gt; 60%, blue 50–60%, amber 40–50%, red &lt; 40%.
          </p>
          <div className="chart-host chart-host-tall">
            <Bar
              data={{
                labels: hitRateChart.labels,
                datasets: [{
                  label: "Hit Rate %",
                  data: hitRateChart.data,
                  backgroundColor: hitRateChart.colors,
                  borderRadius: 8,
                  borderSkipped: false,
                  barThickness: 26
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => `${ctx.parsed.x.toFixed(2)}%` } }
                },
                scales: {
                  x: {
                    min: 0,
                    max: 100,
                    ticks: { color: TEXT, callback: v => `${v}%` },
                    grid: { color: GRID }
                  },
                  y: { ticks: { color: TEXT, font: { weight: 600 } }, grid: { display: false } }
                }
              }}
            />
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
          All figures computed live from the production API (<code>/api/ml/*</code>). Direction accuracy = forecast correctly called up/down to market close. Error = mean absolute % error on predicted closing price.
        </p>
      </footer>
    </section>
  );
}
