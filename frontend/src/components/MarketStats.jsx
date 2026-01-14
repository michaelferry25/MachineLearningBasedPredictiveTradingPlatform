export default function MarketStats() {
  const stats = [
    { 
      label: 'Portfolio Value', 
      value: '$100K', 
      change: '+2.4%',
      isPositive: true,
      icon: '💰'
    },
    { 
      label: 'Total Trades', 
      value: '0', 
      change: 'Today',
      icon: '📊'
    },
    { 
      label: 'ML Predictions', 
      value: '76%', 
      change: 'Accuracy',
      icon: '🎯'
    },
    { 
      label: 'Live Data', 
      value: 'Active', 
      change: '<100ms',
      isPositive: true,
      icon: '⚡'
    },
  ];

  return (
    <div className="market-stats-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-icon-circle">{stat.icon}</div>
          <div className="stat-info">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-change ${stat.isPositive ? 'positive' : ''}`}>
              {stat.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}