import { useEffect, useRef } from "react";

const intervalMap = {
  "1min": "1",
  "5min": "5",
  "30min": "30",
  "1h": "60",
  "1day": "D"
};

export default function TradingViewWidget({ symbol = "AAPL", interval = "30min", theme = "dark" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;

    const exchangeSymbol =
      symbol && symbol.includes(":")
        ? symbol
        : symbol
          ? `NASDAQ:${symbol}`
          : "NASDAQ:AAPL";
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: exchangeSymbol,
      interval: intervalMap[interval] || "30",
      timezone: "Etc/UTC",
      theme: theme === "light" ? "light" : "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      withdateranges: true,
      enable_publishing: false,
      hide_legend: false,
      hide_top_toolbar: false,
      support_host: "https://www.tradingview.com"
    });

    containerRef.current.appendChild(script);
  }, [symbol, interval, theme]);

  return <div className="tv-widget" ref={containerRef} />;
}
