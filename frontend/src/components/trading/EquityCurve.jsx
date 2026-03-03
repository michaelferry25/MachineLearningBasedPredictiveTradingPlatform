import { useMemo, useState } from "react";
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

export default function EquityCurve({ equityCurve, totalValue, totalReturn }) {
  const [range, setRange] = useState("1D");
  const isPositive = (totalReturn || 0) >= 0;
  const color = isPositive ? "#3fb950" : "#ff7b72";
  const pnl = (totalValue || 0) - 100000;
  const sign = pnl >= 0 ? "+" : "";

  const { chartData, options } = useMemo(() => {
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
      points.push({ time: cutoff > new Date(0) ? cutoff : new Date(now.getTime() - 86400000), value: 100000 });
      points.push({ time: now, value: 100000 });
    } else {
      points.push({ time: new Date(new Date(filtered[0].timestamp).getTime() - 60000), value: 100000 });
      filtered.forEach((pt) => points.push({ time: new Date(pt.timestamp), value: pt.value }));
    }

    const formatLabel = (d) => {
      if (range === "1D") return d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
      if (range === "1W") return d.toLocaleDateString("en-IE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString("en-IE", { month: "short", day: "numeric" });
    };

    // Adaptive Y scale — zoom to actual data range
    const values = points.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const maxDev = Math.max(Math.abs(maxVal - 100000), Math.abs(100000 - minVal));

    // Pick step size based on actual deviation
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

    const yMin = 100000 - Math.max(padding, Math.ceil(maxDev / step + 1) * step);
    const yMax = 100000 + Math.max(padding, Math.ceil(maxDev / step + 1) * step);

    const data = {
      labels: points.map((p) => formatLabel(p.time)),
      datasets: [{
        data: values,
        borderColor: color,
        backgroundColor: "transparent",
        fill: false,
        tension: 0.3,
        pointRadius: points.length > 30 ? 0 : 2,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        borderWidth: 2.5,
      }],
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
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y;
              const diff = val - 100000;
              const ds = diff >= 0 ? "+" : "";
              return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${ds}$${diff.toLocaleString(undefined, { minimumFractionDigits: 2 })})`;
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
          grid: { color: "rgba(48,54,61,0.12)" },
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
            color: (ctx) => ctx.tick.value === 100000 ? "rgba(139,148,158,0.4)" : "rgba(48,54,61,0.12)",
            lineWidth: (ctx) => ctx.tick.value === 100000 ? 2 : 1,
          },
        },
      },
    };

    return { chartData: data, options: opts };
  }, [equityCurve, color, range]);

  return (
    <div className="equity-curve-card">
      <div className="equity-curve-header">
        <h3>Equity Curve</h3>
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
      <div style={{ height: 300 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
