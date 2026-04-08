import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import results from "../../data/liveModelResults.json";
import "./ResultsHub.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const TEXT = "#c9d1d9";
const GRID = "rgba(48, 54, 61, 0.5)";

function fmtPct(v, d = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Number(v).toFixed(d)}%`;
}

function fmtSigned(v, d = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${Number(v).toFixed(d)}%`;
}

function fmtUsd(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function prettyRegime(r) {
  if (!r) return "—";
  return r.replace(/_/g, " ");
}

export default function ResultsHub() {
  const summary = results.summary;
  const symbols = Object.keys(results.per_stock_results);
  const rows = useMemo(
    () => symbols.map((s) => ({ symbol: s, ...results.per_stock_results[s] })),
    [symbols]
  );

  const daChart = useMemo(() => ({
    labels: symbols,
    datasets: [
      {
        label: "Directional Accuracy (%)",
        data: rows.map((r) => r.direction_accuracy_pct),
        backgroundColor: rows.map((r) =>
          r.direction_accuracy_pct >= 50
            ? "rgba(63, 185, 80, 0.85)"
            : "rgba(248, 81, 73, 0.85)"
        ),
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  }), [rows, symbols]);

  const mapeChart = useMemo(() => ({
    labels: symbols,
    datasets: [
      {
        label: "Ensemble MAPE (%)",
        data: rows.map((r) => r.ensemble_mape_pct),
        backgroundColor: "rgba(88, 166, 255, 0.85)",
        borderRadius: 6,
        borderSkipped: false
      },
      {
        label: "Persistence Baseline MAPE (%)",
        data: rows.map((r) => r.baseline_mape_pct),
        backgroundColor: "rgba(139, 148, 158, 0.55)",
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  }), [rows, symbols]);

  const aboveFifty = summary.stocks_above_50pct_direction.length;
  const total = symbols.length;

  return (
    <section className="section-wrapper results-hub" aria-labelledby="results-title">
      <header className="results-hub-header">
        <div>
          <h1 id="results-title" className="results-title">Model Performance</h1>
          <p className="results-subtitle">
            {results.model}. {results.test_period}. Every metric is reported
            alongside a one-step persistence baseline for honest comparison.
          </p>
        </div>
      </header>

      <div className="kpi-band">
        <div className="kpi-card kpi-hero">
          <div className="kpi-label">Avg Directional Accuracy</div>
          <div className="kpi-value kpi-value-lg">{fmtPct(summary.avg_direction_accuracy_pct)}</div>
          <div className="kpi-sub">Coin-flip is 50% · {total}-symbol average</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Ensemble MAPE</div>
          <div className="kpi-value">{fmtPct(summary.avg_ensemble_mape_pct)}</div>
          <div className="kpi-sub">Lower is better</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Baseline MAPE</div>
          <div className="kpi-value">{fmtPct(summary.avg_baseline_mape_pct)}</div>
          <div className="kpi-sub">One-step persistence</div>
        </div>
        <div className={`kpi-card ${summary.avg_mape_vs_baseline_pct > 0 ? "kpi-good" : "kpi-warn"}`}>
          <div className="kpi-label">Δ vs Baseline</div>
          <div className="kpi-value">{fmtSigned(summary.avg_mape_vs_baseline_pct)}</div>
          <div className="kpi-sub">Negative = worse than baseline on MAPE</div>
        </div>
      </div>

      <div className="talking-points">
        <h2 className="results-section-title">What These Numbers Mean</h2>
        <ul className="talking-list">
          <li>
            Average directional accuracy of <strong>{fmtPct(summary.avg_direction_accuracy_pct)}</strong> across {total} large-cap US stocks,
            with only <strong>{aboveFifty} of {total}</strong> symbols finishing above the 50% coin-flip line.
          </li>
          <li>
            Ensemble MAPE of <strong>{fmtPct(summary.avg_ensemble_mape_pct)}</strong> is{" "}
            <strong className={summary.avg_mape_vs_baseline_pct > 0 ? "tp-pos" : "tp-neg"}>
              {Math.abs(summary.avg_mape_vs_baseline_pct).toFixed(2)}%{" "}
              {summary.avg_mape_vs_baseline_pct > 0 ? "better" : "worse"}
            </strong>{" "}
            than a one-step persistence baseline that predicts price stays flat.
          </li>
          <li>
            Best symbol: <strong>{summary.best_direction_accuracy.symbol}</strong> at {fmtPct(summary.best_direction_accuracy.accuracy)} directional accuracy.
            Worst: <strong>{summary.worst_direction_accuracy.symbol}</strong> at {fmtPct(summary.worst_direction_accuracy.accuracy)}.
            Best magnitude: <strong>{summary.best_mape.symbol}</strong> ({fmtPct(summary.best_mape.mape)} MAPE).
            Worst: <strong>{summary.worst_mape.symbol}</strong> ({fmtPct(summary.worst_mape.mape)} MAPE).
          </li>
          <li>
            This is exactly why confidence scores are bounded between 35% and 94% — the model never claims
            certainty the evaluation data doesn't support, and the interface down-weights signals with low confidence.
          </li>
        </ul>
      </div>

      <div className="results-panel">
        <h2 className="results-panel-title">Directional Accuracy per Symbol</h2>
        <p className="results-panel-desc">
          Green bars finish above the 50% coin-flip line; red bars fall below it. Out of {total} symbols, only {aboveFifty} clear 50%.
        </p>
        <div className="chart-host chart-host-tall">
          <Bar
            data={daChart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: "y",
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x.toFixed(2)}%` } }
              },
              scales: {
                x: {
                  min: 0, max: 100,
                  ticks: { color: TEXT, callback: (v) => `${v}%` },
                  grid: { color: GRID }
                },
                y: { ticks: { color: TEXT, font: { weight: 600 } }, grid: { display: false } }
              }
            }}
          />
        </div>
      </div>

      <div className="results-panel">
        <h2 className="results-panel-title">Ensemble MAPE vs Persistence Baseline</h2>
        <p className="results-panel-desc">
          Mean absolute percentage error for the ensemble (blue) next to the persistence baseline (grey).
          Lower is better. The baseline wins on every symbol over this 150-day backtest — an honest result that the project reports rather than hides.
        </p>
        <div className="chart-host chart-host-tall">
          <Bar
            data={mapeChart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: "y",
              plugins: {
                legend: {
                  position: "top",
                  align: "end",
                  labels: { color: TEXT, font: { size: 12, weight: 600 }, usePointStyle: true }
                },
                tooltip: {
                  callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(2)}%` }
                }
              },
              scales: {
                x: { min: 0, ticks: { color: TEXT, callback: (v) => `${v}%` }, grid: { color: GRID } },
                y: { ticks: { color: TEXT, font: { weight: 600 } }, grid: { display: false } }
              }
            }}
          />
        </div>
      </div>

      <div className="results-panel">
        <h2 className="results-panel-title">Per-Symbol Results</h2>
        <p className="results-panel-desc">
          Full per-symbol breakdown from the {results.test_period.toLowerCase()}.
        </p>
        <div className="table-scroll">
          <table className="results-table">
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th scope="col" className="tbl-num">Current</th>
                <th scope="col" className="tbl-num">Predicted</th>
                <th scope="col">Signal</th>
                <th scope="col" className="tbl-num">Confidence</th>
                <th scope="col">Regime</th>
                <th scope="col" className="tbl-num">Dir. Acc.</th>
                <th scope="col" className="tbl-num">Ensemble MAPE</th>
                <th scope="col" className="tbl-num">Baseline MAPE</th>
                <th scope="col" className="tbl-num">Δ vs Baseline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol}>
                  <td><strong>{r.symbol}</strong></td>
                  <td className="tbl-num">{fmtUsd(r.current_price)}</td>
                  <td className="tbl-num">{fmtUsd(r.predicted_price)}</td>
                  <td>
                    <span className={`result-pill result-${r.signal.toLowerCase()}`}>{r.signal}</span>
                  </td>
                  <td className="tbl-num">{fmtPct(r.confidence, 1)}</td>
                  <td>{prettyRegime(r.regime)}</td>
                  <td className={`tbl-num ${r.direction_accuracy_pct >= 50 ? "tp-pos" : "tp-neg"}`}>
                    {fmtPct(r.direction_accuracy_pct)}
                  </td>
                  <td className="tbl-num">{fmtPct(r.ensemble_mape_pct)}</td>
                  <td className="tbl-num">{fmtPct(r.baseline_mape_pct)}</td>
                  <td className={`tbl-num ${r.mape_vs_baseline_pct > 0 ? "tp-pos" : "tp-neg"}`}>
                    {fmtSigned(r.mape_vs_baseline_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="results-footnote">
        <p>
          All figures sourced from the backtest snapshot at <code>ml-service/live_model_results.json</code>,
          generated by the Azure-hosted ML service over {results.test_period.toLowerCase()}. The persistence
          baseline predicts the next close equals the current close — a standard naive benchmark for short-horizon
          financial forecasting (Hyndman &amp; Athanasopoulos, 2021).
        </p>
      </footer>
    </section>
  );
}
