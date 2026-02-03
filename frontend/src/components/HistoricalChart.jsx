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

export default function HistoricalChart({ timestamps, prices, symbol, prediction }) {
  const labels = timestamps.map(t => {
    const date = new Date(t * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const datasets = [
    {
      label: 'Historical Price',
      data: prices,
      borderColor: '#58a6ff',
      backgroundColor: 'rgba(88, 166, 255, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 6,
      borderWidth: 3,
    }
  ];

  if (prediction && prediction.prediction) {
    const lastPrice = prices[prices.length - 1];
    const predictionPrice = prediction.prediction;
    
    datasets.push({
      label: 'Forecast',
      data: [...Array(prices.length - 1).fill(null), lastPrice, predictionPrice],
      borderColor: prediction.direction === 'UP' ? '#3fb950' : '#ff7b72',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      tension: 0,
      pointRadius: [0, 0, 0, 0, 8],
      pointHoverRadius: 8,
      borderWidth: 3,
      pointBackgroundColor: prediction.direction === 'UP' ? '#3fb950' : '#ff7b72',
    });
  }

  const data = {
    labels: [...labels, 'Forecast'],
    datasets: datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e6edf3',
          font: { size: 12 },
          usePointStyle: true,
          padding: 15,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(22, 27, 34, 0.95)',
        titleColor: '#e6edf3',
        bodyColor: '#e6edf3',
        borderColor: '#30363d',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
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
          maxRotation: 0,
          autoSkipPadding: 20,
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
            return '$' + value.toFixed(0);
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>{symbol} Price Chart</h3>
        <span className="chart-period">30 Days</span>
      </div>
      <div className="chart-canvas">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
