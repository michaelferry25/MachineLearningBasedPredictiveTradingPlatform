export default function StockInfo({ symbol, result }) {
  if (!result || result.error) return null;

  const stockNames = {
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corporation',
    'TSLA': 'Tesla, Inc.',
    'AMZN': 'Amazon.com, Inc.',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms, Inc.',
    'NFLX': 'Netflix, Inc.',
  };

  const companyName = stockNames[symbol] || symbol;

  return (
    <div className="stock-info-card">
      <div className="stock-header">
        <div className="stock-logo-placeholder">
          {symbol.charAt(0)}
        </div>
        <div className="stock-title">
          <h2>{symbol}</h2>
          <p className="company-name">{companyName}</p>
        </div>
      </div>
      
      <div className="stock-price-display">
        <span className="current-price">${result.price}</span>
        <span className="price-source">{result.source}</span>
      </div>

      <div className="stock-stats">
        <div className="stat-item">
          <span className="stat-label">Live Price</span>
          <span className="stat-value">${result.price}</span>
        </div>
      </div>
    </div>
  );
}