export default function CandleChart({ candles }) {
  if (!candles || candles.length === 0) {
    return (
      <div className="chart-empty">
        <p>No candle data yet. Search a symbol to load the chart.</p>
      </div>
    );
  }

  const width = 1000;
  const height = 320;
  const padding = 24;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const range = maxPrice - minPrice || 1;

  const step = chartWidth / candles.length;
  const candleWidth = Math.max(4, step * 0.6);

  const yForPrice = (value) => padding + ((maxPrice - value) / range) * chartHeight;

  const movingAverage = (period = 10) => {
    const result = [];
    for (let i = 0; i < candles.length; i += 1) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      const slice = candles.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, c) => sum + c.c, 0) / period;
      result.push(avg);
    }
    return result;
  };

  const ma = movingAverage(10);
  const maPath = ma
    .map((value, index) => {
      if (value === null) return null;
      const x = padding + index * step + step / 2;
      const y = yForPrice(value);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  const gridLines = 5;
  const grid = Array.from({ length: gridLines }, (_, i) => {
    const y = padding + (chartHeight / (gridLines - 1)) * i;
    const price = maxPrice - (range / (gridLines - 1)) * i;
    return { y, price };
  });

  return (
    <div className="candle-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {grid.map((line) => (
          <g key={line.y}>
            <line
              x1={padding}
              y1={line.y}
              x2={width - padding}
              y2={line.y}
              stroke="rgba(48, 54, 61, 0.4)"
              strokeDasharray="4 6"
            />
            <text x={padding} y={line.y - 6} fill="#8b949e" fontSize="10">
              {line.price.toFixed(2)}
            </text>
          </g>
        ))}

        {candles.map((candle, index) => {
          const x = padding + index * step + step / 2;
          const openY = yForPrice(candle.o);
          const closeY = yForPrice(candle.c);
          const highY = yForPrice(candle.h);
          const lowY = yForPrice(candle.l);
          const isUp = candle.c >= candle.o;
          const bodyTop = isUp ? closeY : openY;
          const bodyHeight = Math.max(2, Math.abs(openY - closeY));

          return (
            <g key={candle.t}>
              <line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={isUp ? "#3fb950" : "#ff7b72"}
                strokeWidth="2"
              />
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isUp ? "rgba(63, 185, 80, 0.8)" : "rgba(255, 123, 114, 0.8)"}
                rx="2"
              />
            </g>
          );
        })}

        {maPath && (
          <polyline
            points={maPath}
            fill="none"
            stroke="#58a6ff"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}
