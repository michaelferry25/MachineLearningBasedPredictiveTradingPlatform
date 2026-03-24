import { useMemo, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, zoomPlugin);

const RANGES = ["1D", "1W", "1M", "ALL"];
const INITIAL_CASH = 100000;

/* Crosshair plugin — draws vertical + horizontal line on hover */
const crosshairPlugin = {
  id: "crosshair",
  afterDraw(chart) {
    const { ctx, tooltip, chartArea } = chart;
    if (!tooltip || !tooltip.getActiveElements().length) return;
    const { x } = tooltip.getActiveElements()[0].element;
    const y = tooltip.getActiveElements()[0].element.y;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(139,148,158,0.4)";
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    ctx.restore();
  },
};
ChartJS.register(crosshairPlugin);

export default function EquityCurve({ equityCurve, totalValue, totalReturn, isLive }) {
  const [range, setRange] = useState("ALL");
  const chartRef = useRef(null);
  const isPositive = (totalReturn || 0) >= 0;
  const color = isPositive ? "#3fb950" : "#ff7b72";
  const pnl = (totalValue || 0) - INITIAL_CASH;
  const sign = pnl >= 0 ? "+" : "";

  const { chartData, options, highWatermark, lowWatermark, rangeReturn } = useMemo(() => {
    const curve = equityCurve || [];
    const now = new Date();

    const cutoff = {
      "1D": new Date(now.getTime() - 86400000),
      "1W": new Date(now.getTime() - 7 * 86400000),
      "1M": new Date(now.getTime() - 30 * 86400000),
      "ALL": new Date(0),
    }[range];

    const filtered = curve.filter((pt) => new Date(pt.timestamp) >= cutoff);

    const points = [];
    if (filtered.length === 0) {
      points.push({ time: cutoff > new Date(0) ? cutoff : new Date(now.getTime() - 86400000), value: INITIAL_CASH });
      points.push({ time: now, value: INITIAL_CASH });
    } else {
      points.push({ time: new Date(new Date(filtered[0].timestamp).getTime() - 60000), value: INITIAL_CASH });
      filtered.forEach((pt) => points.push({ time: new Date(pt.timestamp), value: pt.value }));
    }

    const formatLabel = (d) => {
      if (range === "1D") return d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
      if (range === "1W") return d.toLocaleDateString("en-IE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString("en-IE", { month: "short", day: "numeric" });
    };

    const values = points.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const maxDev = Math.max(Math.abs(maxVal - INITIAL_CASH), Math.abs(INITIAL_CASH - minVal));

    // Compute range-specific return
    const startVal = values[0] || INITIAL_CASH;
    const endVal = values[values.length - 1] || INITIAL_CASH;
    const rr = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;

    let step, padding;
    if (maxDev < 100) {
      step = 50; padding = 200;
    } else if (maxDev < 500) {
      step = 200; padding = 500;
    } else if (maxDev < 2000) {
      step = 500; padding = 1500;
    } else if (maxDev < 5000) {
      step = 1000; padding = 3000;
    } else if (maxDev < 20000) {
      step = 5000; padding = 10000;
    } else {
      step = 10000; padding = Math.ceil(maxDev / 10000) * 10000;
    }

    const yMin = INITIAL_CASH - Math.max(padding, Math.ceil(maxDev / step + 1) * step);
    const yMax = INITIAL_CASH + Math.max(padding, Math.ceil(maxDev / step + 1) * step);

    // Gradient fill — green above $100k, red below
    const gradientFill = (ctx) => {
      const chart = ctx.chart;
      const { top, bottom } = chart.chartArea || {};
      if (!top) return color;
      const yScale = chart.scales.y;
      const baselinePixel = yScale.getPixelForValue(INITIAL_CASH);
      const grad = chart.ctx.createLinearGradient(0, top, 0, bottom);
      const baseRatio = Math.max(0, Math.min(1, (baselinePixel - top) / (bottom - top)));
      grad.addColorStop(0, "rgba(63,185,80,0.25)");
      grad.addColorStop(Math.max(0, baseRatio - 0.01), "rgba(63,185,80,0.05)");
      grad.addColorStop(baseRatio, "rgba(0,0,0,0)");
      grad.addColorStop(Math.min(1, baseRatio + 0.01), "rgba(255,123,114,0.05)");
      grad.addColorStop(1, "rgba(255,123,114,0.25)");
      return grad;
    };

    // Baseline dataset — dashed $100k line
    const baselineData = new Array(values.length).fill(INITIAL_CASH);

    const data = {
      labels: points.map((p) => formatLabel(p.time)),
      datasets: [
        {
          label: "Portfolio",
          data: values,
          borderColor: color,
          backgroundColor: gradientFill,
          fill: true,
          tension: 0.3,
          pointRadius: points.length > 40 ? 0 : points.length > 20 ? 1.5 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointHoverBackgroundColor: "#e6edf3",
          pointHoverBorderColor: color,
          pointHoverBorderWidth: 2,
          borderWidth: 2.5,
        },
        {
          label: "Baseline",
          data: baselineData,
          borderColor: "rgba(139,148,158,0.3)",
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
        },
      ],
    };

    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(22,27,34,0.95)",
          titleColor: "#e6edf3",
          bodyColor: "#e6edf3",
          borderColor: "#30363d",
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            title: (items) => items[0]?.label || "",
            label: (ctx) => {
              const val = ctx.parsed.y;
              const diff = val - INITIAL_CASH;
              const ds = diff >= 0 ? "+" : "";
              const pct = ((diff / INITIAL_CASH) * 100).toFixed(2);
              return [
                `Value: $${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `P&L: ${ds}$${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${ds}${pct}%)`,
              ];
            },
          },
        },
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 10 }, maxTicksLimit: 8 },
          grid: { color: "rgba(48,54,61,0.08)" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#8b949e",
            font: { size: 11 },
            stepSize: step,
            callback: (v) => {
              if (step < 1000) return `$${v.toLocaleString()}`;
              return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
            },
          },
          grid: {
            color: (ctx) => ctx.tick.value === INITIAL_CASH ? "rgba(139,148,158,0.35)" : "rgba(48,54,61,0.08)",
            lineWidth: (ctx) => ctx.tick.value === INITIAL_CASH ? 1.5 : 1,
          },
        },
      },
    };

    return {
      chartData: data,
      options: opts,
      highWatermark: maxVal,
      lowWatermark: minVal,
      rangeReturn: rr,
    };
  }, [equityCurve, color, range]);

  const resetZoom = () => {
    if (chartRef.current) chartRef.current.resetZoom();
  };

  const rangeColor = rangeReturn >= 0 ? "#3fb950" : "#ff7b72";
  const rangeSign = rangeReturn >= 0 ? "+" : "";

  return (
    <div className="equity-curve-card">
      <div className="equity-curve-header">
        <div className="equity-curve-title-row">
          <h3>Equity Curve {isLive && <span className="equity-live-badge"><span className="equity-live-dot" />Live</span>}</h3>
          <button className="equity-reset-zoom" onClick={resetZoom} type="button" title="Reset zoom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
        <div className="equity-range-bar">
          {RANGES.map((r) => (
            <button key={r} className={`equity-range-btn ${range === r ? "active" : ""}`} onClick={() => setRange(r)} type="button">{r}</button>
          ))}
        </div>
        <div className="equity-curve-stats">
          <span className="equity-current">
            ${(totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ color, fontSize: "0.85rem", fontWeight: 700 }}>
            {sign}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({sign}{(totalReturn || 0).toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="equity-watermarks">
        <span className="equity-wm equity-wm-high">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          High: ${highWatermark.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="equity-wm equity-wm-low">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff7b72" strokeWidth="2.5"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          Low: ${lowWatermark.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="equity-wm" style={{ color: rangeColor }}>
          {range} Return: {rangeSign}{rangeReturn.toFixed(2)}%
        </span>
      </div>

      <div style={{ height: 320 }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
