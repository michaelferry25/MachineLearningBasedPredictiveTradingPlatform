import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const ET_ZONE = "America/New_York";

const firstIndexAtOrAfter = (timestamps, targetSeconds) => {
  if (!Array.isArray(timestamps) || !timestamps.length || !Number.isFinite(targetSeconds)) return -1;

  let lo = 0;
  let hi = timestamps.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (timestamps[mid] < targetSeconds) lo = mid + 1;
    else hi = mid;
  }

  return timestamps[lo] >= targetSeconds ? lo : -1;
};

const formatTooltipDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "--";

  return d.toLocaleString("en-US", {
    timeZone: ET_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short"
  });
};

const formatEtAxisLabel = (value) => {
  if (!value) return "Next Day";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "Next Day";

  const short = d.toLocaleDateString("en-US", {
    timeZone: ET_ZONE,
    month: "short",
    day: "numeric"
  });
  return `${short} Close`;
};

const trackRecordDatasets = (trackRecord, timestamps, labelsLength, excludedLogIds = []) => {
  if (
    !trackRecord ||
    !Array.isArray(trackRecord.points) ||
    !trackRecord.points.length ||
    !Array.isArray(timestamps) ||
    !timestamps.length
  ) {
    return [];
  }

  const firstTimestamp = timestamps[0];
  const excludedSet = new Set(
    (Array.isArray(excludedLogIds) ? excludedLogIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  );

  const hits = Array(labelsLength).fill(null);
  const misses = Array(labelsLength).fill(null);
  const pending = Array(labelsLength).fill(null);
  const targets = Array(labelsLength).fill(null);

  const hitMeta = Array(labelsLength).fill(null);
  const missMeta = Array(labelsLength).fill(null);
  const pendingMeta = Array(labelsLength).fill(null);
  const targetMeta = Array(labelsLength).fill(null);

  for (const point of trackRecord.points) {
    const pointId = Number(point?.id ?? NaN);
    if (Number.isFinite(pointId) && excludedSet.has(pointId)) continue;

    if (!point?.createdAt) continue;
    const createdMs = new Date(point.createdAt).getTime();
    if (!Number.isFinite(createdMs)) continue;

    const createdSeconds = Math.floor(createdMs / 1000);
    const rawHorizon = Number(point.horizonHours);
    const horizonHours = Number.isFinite(rawHorizon) && rawHorizon > 0 ? rawHorizon : 24;

    const targetMsFromPoint = point.targetAt ? new Date(point.targetAt).getTime() : NaN;
    const targetSeconds = Number.isFinite(targetMsFromPoint)
      ? Math.floor(targetMsFromPoint / 1000)
      : createdSeconds + Math.round(horizonHours * 3600);

    if (targetSeconds < firstTimestamp) continue;

    let idx = firstIndexAtOrAfter(timestamps, targetSeconds);
    if (idx < 0) {
      idx = labelsLength - 1;
    }
    if (idx < 0 || idx >= labelsLength) continue;

    const currentPrice = Number(point.currentPrice ?? NaN);
    const targetPrice = Number(point.predictedPrice ?? NaN);
    const actualPrice = Number(point.actualPrice ?? NaN);

    const hasTargetPrice = Number.isFinite(targetPrice) && targetPrice > 0;
    const statusPrice = Number.isFinite(actualPrice) && actualPrice > 0
      ? actualPrice
      : hasTargetPrice
      ? targetPrice
      : currentPrice;

    if (!Number.isFinite(statusPrice) || statusPrice <= 0) continue;

    const enrichedMeta = {
      ...point,
      issuedAt: point.createdAt,
      targetAt: new Date(targetSeconds * 1000).toISOString(),
      horizonHours,
    };

    const status = String(point.status || "pending").toLowerCase();
    if (status === "evaluated") {
      if (point.hit === true) {
        hits[idx] = statusPrice;
        hitMeta[idx] = enrichedMeta;
      } else if (point.hit === false) {
        misses[idx] = statusPrice;
        missMeta[idx] = enrichedMeta;
      }
    } else {
      pending[idx] = hasTargetPrice ? targetPrice : statusPrice;
      pendingMeta[idx] = enrichedMeta;
    }

    if (hasTargetPrice) {
      targets[idx] = targetPrice;
      targetMeta[idx] = enrichedMeta;
    }
  }

  const dedupeEpsilon = 0.02;
  for (let i = 0; i < labelsLength; i += 1) {
    if (
      pending[i] != null &&
      targets[i] != null &&
      Math.abs(Number(pending[i]) - Number(targets[i])) <= dedupeEpsilon
    ) {
      pending[i] = null;
      pendingMeta[i] = null;
    }
  }

  const datasets = [];

  if (hits.some((v) => v != null)) {
    datasets.push({
      label: "Prediction Hit (T+1)",
      data: hits,
      borderColor: "transparent",
      backgroundColor: "#22c55e",
      pointBackgroundColor: "#22c55e",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1.8,
      pointRadius: 5.5,
      pointHoverRadius: 7.5,
      pointStyle: "circle",
      showLine: false,
      order: 4,
      predictionMeta: hitMeta,
    });
  }

  if (misses.some((v) => v != null)) {
    datasets.push({
      label: "Prediction Miss (T+1)",
      data: misses,
      borderColor: "transparent",
      backgroundColor: "#ef4444",
      pointBackgroundColor: "#ef4444",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1.8,
      pointRadius: 5.5,
      pointHoverRadius: 7.5,
      pointStyle: "crossRot",
      showLine: false,
      order: 4,
      predictionMeta: missMeta,
    });
  }

  if (pending.some((v) => v != null)) {
    datasets.push({
      label: "Pending Prediction (T+1)",
      data: pending,
      borderColor: "transparent",
      backgroundColor: "#f59e0b",
      pointBackgroundColor: "#f59e0b",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1.8,
      pointRadius: 5.5,
      pointHoverRadius: 7.5,
      pointStyle: "triangle",
      showLine: false,
      order: 4,
      predictionMeta: pendingMeta,
    });
  }

  if (targets.some((v) => v != null)) {
    datasets.push({
      label: "Forecast Target (T+1)",
      data: targets,
      borderColor: "rgba(103, 232, 249, 0.65)",
      backgroundColor: "#67e8f9",
      pointBackgroundColor: "#67e8f9",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1.5,
      pointStyle: "rectRot",
      pointRadius: 4.5,
      pointHoverRadius: 6.5,
      showLine: false,
      order: 3,
      predictionMeta: targetMeta,
    });
  }

  return datasets;
};

export default function HistoricalChart({
  timestamps,
  prices,
  symbol,
  prediction,
  predictionComparison,
  indicatorData,
  chartRange,
  trackRecord
}) {
  const hourlyPrediction = predictionComparison?.hourlyPrediction || prediction || null;
  const dailyClosePrediction = predictionComparison?.dailyClosePrediction || null;

  const predictionTargetAt =
    hourlyPrediction?.prediction_target_at ||
    hourlyPrediction?.prediction_meta?.targetAt ||
    dailyClosePrediction?.prediction_target_at ||
    dailyClosePrediction?.prediction_meta?.targetAt ||
    null;

  const currentPredictionLogIds = [
    Number(hourlyPrediction?.prediction_log_id ?? hourlyPrediction?.prediction_meta?.logId ?? NaN),
    Number(dailyClosePrediction?.prediction_log_id ?? dailyClosePrediction?.prediction_meta?.logId ?? NaN),
  ].filter((id) => Number.isFinite(id));

  const syntheticNextLabel = formatEtAxisLabel(predictionTargetAt);

  const labels = timestamps.map((t) => {
    const date = new Date(t * 1000);
    if (chartRange === "5d") {
      return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const labelCount = labels.length + 1;

  const datasets = [
    {
      label: "Price",
      data: [...prices, null],
      borderColor: "#6cb6ff",
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return "rgba(108, 182, 255, 0.13)";
        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, "rgba(108, 182, 255, 0.2)");
        gradient.addColorStop(1, "rgba(108, 182, 255, 0.02)");
        return gradient;
      },
      tension: 0.3,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: "#58a6ff",
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 2,
      borderWidth: 2.5,
      order: 1,
    },
  ];

  if (indicatorData && indicatorData.sma_20) {
    const len = prices.length;
    const pad = (arr) => [...arr.slice(-len), null];

    datasets.push({
      label: "SMA 20",
      data: pad(indicatorData.sma_20),
      borderColor: "rgba(240, 136, 62, 0.7)",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      order: 2,
    });

    if (indicatorData.bb_upper && indicatorData.bb_lower) {
      datasets.push({
        label: "BB Upper",
        data: pad(indicatorData.bb_upper),
        borderColor: "rgba(188, 140, 255, 0.4)",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        order: 3,
      });
      datasets.push({
        label: "BB Lower",
        data: pad(indicatorData.bb_lower),
        borderColor: "rgba(188, 140, 255, 0.4)",
        backgroundColor: "rgba(188, 140, 255, 0.04)",
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: "-1",
        order: 3,
      });
    }

    if (indicatorData.sma_50) {
      datasets.push({
        label: "SMA 50",
        data: pad(indicatorData.sma_50),
        borderColor: "rgba(63, 185, 80, 0.5)",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [6, 3],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        order: 2,
      });
    }
  }

  if (prices.length > 0 && hourlyPrediction && Number.isFinite(Number(hourlyPrediction.prediction))) {
    const lastPrice = prices[prices.length - 1];
    const predictionPrice = Number(hourlyPrediction.prediction);
    const ti = hourlyPrediction.technical_indicators;
    const atr = ti ? ti.atr_ratio * lastPrice : lastPrice * 0.015;
    const rangeHigh = predictionPrice + atr * 1.2;
    const rangeLow = predictionPrice - atr * 1.2;

    datasets.push({
      label: "Forecast Range High",
      data: [...Array(prices.length - 1).fill(null), lastPrice, rangeHigh],
      borderColor: "transparent",
      backgroundColor: "transparent",
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 0,
      fill: false,
      order: 0,
    });

    datasets.push({
      label: "Forecast Range Low",
      data: [...Array(prices.length - 1).fill(null), lastPrice, rangeLow],
      borderColor: "transparent",
      backgroundColor: "rgba(217, 70, 239, 0.15)",
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 0,
      fill: "-1",
      order: 0,
    });

    datasets.push({
      label: "Hourly AI Path",
      data: [...Array(prices.length - 1).fill(null), lastPrice, predictionPrice],
      borderColor: "#d946ef",
      backgroundColor: "transparent",
      borderDash: [7, 4],
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 2.4,
      order: 0,
    });

    datasets.push({
      label: "Hourly Forecast",
      data: [...Array(prices.length).fill(null), predictionPrice],
      borderColor: "transparent",
      backgroundColor: "#f472b6",
      pointBackgroundColor: "#f472b6",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2.2,
      pointRadius: [...Array(prices.length).fill(0), 8],
      pointHoverRadius: 10,
      showLine: false,
      order: 5,
    });
  }

  if (prices.length > 0 && dailyClosePrediction && Number.isFinite(Number(dailyClosePrediction.prediction))) {
    const lastPrice = prices[prices.length - 1];
    const dailyPrice = Number(dailyClosePrediction.prediction);
    const hourlyPrice = Number(hourlyPrediction?.prediction ?? NaN);
    const drawDistinctDaily = !Number.isFinite(hourlyPrice) || Math.abs(dailyPrice - hourlyPrice) > 0.02;

    if (drawDistinctDaily) {
      datasets.push({
        label: "Daily Close Path",
        data: [...Array(prices.length - 1).fill(null), lastPrice, dailyPrice],
        borderColor: "#22d3ee",
        backgroundColor: "transparent",
        borderDash: [4, 3],
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2.2,
        order: 1,
      });

      datasets.push({
        label: "Daily Close Forecast",
        data: [...Array(prices.length).fill(null), dailyPrice],
        borderColor: "transparent",
        backgroundColor: "#22d3ee",
        pointBackgroundColor: "#22d3ee",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: [...Array(prices.length).fill(0), 7],
        pointHoverRadius: 9,
        showLine: false,
        order: 5,
      });
    }
  }

  datasets.push(
    ...trackRecordDatasets(trackRecord, timestamps, labelCount, currentPredictionLogIds)
  );

  const data = {
    labels: [...labels, syntheticNextLabel],
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.3,
      },
      point: {
        radius: 0,
        hoverRadius: 5,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#c9d1d9",
          font: { size: 11, family: "'Inter', sans-serif" },
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          filter: (item) => {
            const text = item.text || "";
            return !text.startsWith("BB ") && !text.startsWith("Forecast Range") && !text.includes("Path");
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(13, 17, 23, 0.95)",
        titleColor: "#e6edf3",
        bodyColor: "#c9d1d9",
        borderColor: "rgba(48, 54, 61, 0.8)",
        borderWidth: 1,
        padding: 14,
        cornerRadius: 8,
        displayColors: true,
        titleFont: { size: 12, weight: "600" },
        bodyFont: { size: 12 },
        boxPadding: 4,
        filter: (item) => {
          const label = item.dataset.label || "";
          return !label.startsWith("Forecast Range") && !label.includes("Path");
        },
        callbacks: {
          title: (context) => {
            if (!context || !context.length) return "";
            const idx = context[0].dataIndex;
            if (idx >= 0 && idx < timestamps.length) {
              return `Session Time (ET): ${formatTooltipDate(timestamps[idx] * 1000)}`;
            }

            let targetAt = predictionTargetAt;
            for (const item of context) {
              const meta = item.dataset.predictionMeta?.[idx];
              if (meta?.targetAt) {
                targetAt = meta.targetAt;
                break;
              }
            }
            return `Target Close (ET): ${formatTooltipDate(targetAt)}`;
          },
          label: (context) => {
            if (context.parsed.y == null) return null;
            return ` ${context.dataset.label}:  $${context.parsed.y.toFixed(2)}`;
          },
          afterBody: (context) => {
            const lines = [];
            for (const item of context) {
              const meta = item.dataset.predictionMeta?.[item.dataIndex];
              if (!meta) continue;
              lines.push(`Model: ${meta.modelVersion || meta.model || "--"}`);
              lines.push(`Issued (ET): ${formatTooltipDate(meta.createdAt || meta.issuedAt)}`);
              lines.push(`Target (ET): ${formatTooltipDate(meta.targetAt)}`);
              if (meta.predictionSource) {
                lines.push(`Source: ${String(meta.predictionSource).replaceAll("_", " ")}`);
              }
              if (meta.horizonHours != null) {
                lines.push(`Horizon: ${meta.horizonHours}h`);
              }
              if (meta.confidence != null) lines.push(`Confidence: ${Number(meta.confidence).toFixed(1)}%`);
              if (meta.percentError != null) lines.push(`Error: ${Number(meta.percentError).toFixed(2)}%`);
              if (meta.hit === true) lines.push("Result: HIT");
              else if (meta.hit === false) lines.push("Result: MISS");
              else lines.push("Result: PENDING");
              break;
            }
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(112, 128, 144, 0.22)",
          drawBorder: false,
        },
        ticks: {
          color: "#b8c4d1",
          maxRotation: 0,
          autoSkipPadding: 30,
          font: { size: 11 },
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: "rgba(112, 128, 144, 0.28)",
          drawBorder: false,
        },
        ticks: {
          color: "#c9d1d9",
          font: { size: 11 },
          padding: 8,
          callback: (value) => "$" + value.toFixed(0),
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  };

  const rangeLabels = {
    "5d": "1 Week",
    "1mo": "1 Month",
    "3mo": "3 Months",
    "6mo": "6 Months",
    "1y": "1 Year",
  };

  const parts = [rangeLabels[chartRange] || "1 Month"];
  if (indicatorData) parts.push("SMA", "BB");
  if (hourlyPrediction?.prediction) parts.push("Hourly Forecast");
  if (dailyClosePrediction?.prediction) parts.push("Daily Close Forecast");
  if (predictionComparison?.spread?.absoluteSpread != null) {
    parts.push(`Hourly vs Daily Δ $${Number(predictionComparison.spread.absoluteSpread).toFixed(2)}`);
  }
  if (trackRecord?.stats) {
    const sourceTag = trackRecord?.filter?.source === "scheduler_daily_close"
      ? "Official Daily Track Record"
      : trackRecord?.filter?.source === "scheduler_hourly"
      ? "Hourly Track Record"
      : "Track Record";
    parts.push(
      sourceTag,
      `Track Record ${Number(trackRecord.stats.hitRate || 0).toFixed(0)}%`,
      `Grade ${trackRecord.stats.reliabilityGrade || "--"}`
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>{symbol} Price Chart</h3>
        <span className="chart-period">{parts.join(" · ")}</span>
      </div>
      <div className="chart-canvas">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
