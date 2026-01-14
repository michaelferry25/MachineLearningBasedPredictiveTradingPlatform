import { Line } from "react-chartjs-2";

export default function PerformanceChart({ portfolio }) {
  if (!portfolio) return null;

  const initialBalance = 100000;
  const currentValue = portfolio.totalValue || initialBalance;
  const profit = currentValue - initialBalance;
  const profitPercent = ((profit / initialBalance) * 100).toFixed(2);
  const isProfit = profit >= 0;

  const mockPerformanceData = [
    100000, 100500, 99800, 101200, 100900, 102300, currentValue
  ];

  const data = {
    labels: ['Start', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Today'],
    datasets: [
      {
        label: 'Portfolio Value',
        data: mockPerformanceData,
        borderColor: isProfit ? '#3fb950' : '#ff7b72',
        backgroundColor: isProfit 
          ? 'rgba(63, 185, 80, 0.1)' 
          : 'rgba(255, 123, 114, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(22, 27, 34, 0.95)',
        titleColor: '#e6edf3',
        bodyColor: '#e6edf3',
        borderColor: '#30363d',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context) {
            return 'Value: $' + context.parsed.y.toLocaleString();
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(48, 54, 61, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: '#8b949e',
          font: { size: 11 }
        }
      },
      y: {
        grid: {
          color: 'rgba(48, 54, 61, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: '#8b949e',
          callback: function(value) {
            return '$' + (value/1000).toFixed(0) + 'K';
          }
        }
      }
    }
  };

  return (
    <div className="performance-chart-card">
      <div className="performance-header">
        <h3>📈 Portfolio Performance</h3>
        <div className={`performance-stats ${isProfit ? 'profit' : 'loss'}`}>
          <span className="perf-value">{isProfit ? '+' : ''}{profitPercent}%</span>
          <span className="perf-amount">{isProfit ? '+' : ''}${profit.toFixed(2)}</span>
        </div>
      </div>
      <div className="chart-canvas-small">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}