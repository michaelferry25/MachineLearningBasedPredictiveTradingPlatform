export default function PopularStocks({ onSelectStock }) {
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple', color: '#000000' },
    { symbol: 'GOOGL', name: 'Google', color: '#4285F4' },
    { symbol: 'MSFT', name: 'Microsoft', color: '#00A4EF' },
    { symbol: 'TSLA', name: 'Tesla', color: '#E82127' },
    { symbol: 'AMZN', name: 'Amazon', color: '#FF9900' },
    { symbol: 'NVDA', name: 'NVIDIA', color: '#76B900' },
    { symbol: 'META', name: 'Meta', color: '#0668E1' },
    { symbol: 'NFLX', name: 'Netflix', color: '#E50914' },
  ];

  return (
    <div className="popular-stocks">
      <h3>Popular Stocks</h3>
      <div className="stock-grid">
        {popularStocks.map((stock) => (
          <button
            key={stock.symbol}
            className="stock-chip"
            onClick={() => onSelectStock(stock.symbol)}
            style={{ borderColor: stock.color }}
          >
            <div className="stock-chip-content">
              <span className="stock-symbol">{stock.symbol}</span>
              <span className="stock-name">{stock.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}