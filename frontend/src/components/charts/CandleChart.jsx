import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

const buildSma = (candles, period) => {
  const result = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i += 1) {
    const close = candles[i].close;
    sum += close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      result.push({ time: candles[i].time, value: sum / period });
    }
  }
  return result;
};

const normalizeCandles = (raw) =>
  raw
    .map((c) => {
      const timeValue = Number(c.t);
      const time = timeValue > 1e12 ? Math.floor(timeValue / 1000) : timeValue;
      return {
        time,
        open: Number(c.o),
        high: Number(c.h),
        low: Number(c.l),
        close: Number(c.c),
        volume: Number(c.v ?? 0)
      };
    })
    .filter((c) => Number.isFinite(c.time))
    .sort((a, b) => a.time - b.time);

export default function CandleChart({
  candles,
  interval = "1h",
  theme = "dark",
  showVolume = true,
  showSMA = true,
  fitKey,
  resetToken
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const smaSeriesRef = useRef(null);
  const hasFitRef = useRef(false);

  const isLight = theme === "light";
  const colors = {
    background: isLight ? "#ffffff" : "#0b0f16",
    text: isLight ? "#0f172a" : "#c9d1d9",
    grid: isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(48, 54, 61, 0.4)",
    up: "#3fb950",
    down: "#ff7b72",
    line: "#58a6ff"
  };

  const formatTick = (time) => {
    let date;
    if (typeof time === "object" && time !== null) {
      const { year, month, day } = time;
      date = new Date(Date.UTC(year, month - 1, day));
    } else {
      date = new Date(Number(time) * 1000);
    }
    if (interval === "1day") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (interval === "30min" || interval === "1h") {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 420,
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
        fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid }
      },
      rightPriceScale: {
        visible: true,
        borderVisible: true,
        borderColor: colors.grid,
        ticksVisible: true,
        scaleMargins: { top: 0.08, bottom: showVolume ? 0.2 : 0.08 }
      },
      timeScale: {
        visible: true,
        borderVisible: true,
        borderColor: colors.grid,
        timeVisible: true,
        secondsVisible: interval === "1min" || interval === "5min",
        rightOffset: 2,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: (time) => formatTick(time)
      },
      localization: {
        timeFormatter: (time) => formatTick(time)
      },
      crosshair: {
        mode: 1
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false
    });

    if (showVolume) {
      volumeSeriesRef.current = chart.addHistogramSeries({
        priceScaleId: "",
        priceFormat: { type: "volume" },
        color: colors.line,
        scaleMargins: { top: 0.8, bottom: 0 }
      });
    }

    if (showSMA) {
      smaSeriesRef.current = chart.addLineSeries({
        color: colors.line,
        lineWidth: 2,
        priceLineVisible: false
      });
    }

    const resize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { color: colors.background },
        textColor: colors.text
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid }
      },
      rightPriceScale: {
        visible: true,
        borderVisible: true,
        borderColor: colors.grid,
        ticksVisible: true,
        scaleMargins: { top: 0.08, bottom: showVolume ? 0.2 : 0.08 }
      },
      timeScale: {
        visible: true,
        borderVisible: true,
        borderColor: colors.grid,
        timeVisible: true,
        secondsVisible: interval === "1min" || interval === "5min",
        rightOffset: 2,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: (time) => formatTick(time)
      },
      localization: {
        timeFormatter: (time) => formatTick(time)
      }
    });
  }, [theme, interval, showVolume]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (showVolume && !volumeSeriesRef.current) {
      volumeSeriesRef.current = chartRef.current.addHistogramSeries({
        priceScaleId: "",
        priceFormat: { type: "volume" },
        color: colors.line,
        scaleMargins: { top: 0.8, bottom: 0 }
      });
    }
    if (!showVolume && volumeSeriesRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }
    if (showSMA && !smaSeriesRef.current) {
      smaSeriesRef.current = chartRef.current.addLineSeries({
        color: colors.line,
        lineWidth: 2,
        priceLineVisible: false
      });
    }
    if (!showSMA && smaSeriesRef.current) {
      chartRef.current.removeSeries(smaSeriesRef.current);
      smaSeriesRef.current = null;
    }
  }, [showVolume, showSMA, theme]);

  useEffect(() => {
    if (!candles || candles.length === 0 || !candleSeriesRef.current) {
      if (candleSeriesRef.current) candleSeriesRef.current.setData([]);
      if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]);
      if (smaSeriesRef.current) smaSeriesRef.current.setData([]);
      return;
    }

    const normalized = normalizeCandles(candles);
    candleSeriesRef.current.setData(normalized);

    if (volumeSeriesRef.current) {
      const volumeData = normalized.map((point) => ({
        time: point.time,
        value: point.volume,
        color: point.close >= point.open ? "rgba(63, 185, 80, 0.6)" : "rgba(255, 123, 114, 0.6)"
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    if (smaSeriesRef.current) {
      smaSeriesRef.current.setData(buildSma(normalized, 20));
    }

    if (!hasFitRef.current) {
      chartRef.current.timeScale().fitContent();
      hasFitRef.current = true;
    }

    if (interval === "1min" || interval === "5min") {
      chartRef.current.timeScale().scrollToRealTime();
    }
  }, [candles, showVolume, showSMA]);

  useEffect(() => {
    hasFitRef.current = false;
  }, [fitKey]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().fitContent();
  }, [resetToken]);

  return <div className="candle-chart" ref={containerRef} />;
}
