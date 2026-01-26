export default function Portfolio({ portfolio }) {
  if (!portfolio) return null;

  return (
    <div className="portfolio-card" id="portfolio">
      <h3>Portfolio Summary</h3>
      
      <div className="portfolio-overview">
        <div className="overview-item">
          <span className="label">Total Value</span>
          <span className="value large">${portfolio.totalValue?.toFixed(2)}</span>
        </div>
        
        <div className="overview-grid">
          <div className="overview-item">
            <span className="label">Cash Balance</span>
            <span className="value">${portfolio.cashBalance?.toFixed(2)}</span>
          </div>
          <div className="overview-item">
            <span className="label">Holdings Value</span>
            <span className="value">${portfolio.holdingsValue?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {portfolio.positions && portfolio.positions.length > 0 && (
        <div className="positions-list">
          <h4>Positions</h4>
          {portfolio.positions.map((pos, idx) => (
            <div key={idx} className="position-item">
              <div className="position-header">
                <span className="symbol">{pos.symbol}</span>
                <span className="quantity">{pos.quantity} shares</span>
              </div>
              <div className="position-details">
                <span className="price">${pos.currentPrice?.toFixed(2)}</span>
                <span className="value">${pos.value?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="trade-count">
        <span>{portfolio.tradeCount} trades executed</span>
      </div>
    </div>
  );
}
