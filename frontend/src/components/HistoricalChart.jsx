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

export default function HistoricalChart({ timestamps, prices, symbol, prediction, indicatorData, chartRange }) {
  const labels = timestamps.map(t => {
    const date = new Date(t * 1000);
    if (chartRange === '5d') {
      return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const datasets = [
    {
      label: 'Price',
      data: prices,
      borderColor: '#58a6ff',
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return 'rgba(88, 166, 255, 0.1)';
        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(88, 166, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(88, 166, 255, 0.01)');
        return gradient;
      },
      tension: 0.3,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: '#58a6ff',
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
      borderWidth: 2.5,
      order: 1,
    }
  ];

  // SMA and Bollinger Band overlays
  if (indicatorData && indicatorData.sma_20) {
    const len = prices.length;
    const slice = (arr) => arr.slice(-len);

    datasets.push({
      label: 'SMA 20',
      data: slice(indicatorData.sma_20),
      borderColor: 'rgba(240, 136, 62, 0.7)',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      order: 2,
    });

    if (indicatorData.bb_upper && indicatorData.bb_lower) {
      datasets.push({
        label: 'BB Upper',
        data: slice(indicatorData.bb_upper),
        borderColor: 'rgba(188, 140, 255, 0.4)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        order: 3,
      });
      datasets.push({
        label: 'BB Lower',
        data: slice(indicatorData.bb_lower),
        borderColor: 'rgba(188, 140, 255, 0.4)',
        backgroundColor: 'rgba(188, 140, 255, 0.04)',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: '-1',
        order: 3,
      });
    }

    if (indicatorData.sma_50) {
      datasets.push({
        label: 'SMA 50',
        data: slice(indicatorData.sma_50),
        borderColor: 'rgba(63, 185, 80, 0.5)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [6, 3],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        order: 2,
      });
    }
  }

  // Forecast: confidence range band + predicted value point
  if (prediction && prediction.prediction) {
    const lastPrice = prices[prices.length - 1];
    const predictionPrice = prediction.prediction;
    const isUp = prediction.direction === 'UP';
    const color = isUp ? '#3fb950' : '#ff7b72';

    // Compute range from ATR or fallback to % of price
    const ti = prediction.technical_indicators;
    const atr = ti ? ti.atr_ratio * lastPrice : lastPrice * 0.015;
    const rangeHigh = predictionPrice + atr * 1.2;
    const rangeLow = predictionPrice - atr * 1.2;

    // Forecast range upper bound
    datasets.push({
      label: 'Forecast Range High',
      data: [...Array(prices.length - 1).fill(null), lastPrice, rangeHigh],
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 0,
      fill: false,
      order: 0,
    });

    // Forecast range lower bound with fill to upper
    datasets.push({
      label: 'Forecast Range Low',
      data: [...Array(prices.length - 1).fill(null), lastPrice, rangeLow],
      borderColor: 'transparent',
      backgroundColor: isUp ? 'rgba(63, 185, 80, 0.12)' : 'rgba(255, 123, 114, 0.12)',
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 0,
      fill: '-1',
      order: 0,
    });

    // Forecast center line
    datasets.push({
      label: 'Next Day Forecast',
      data: [...Array(prices.length - 1).fill(null), lastPrice, predictionPrice],
      borderColor: color,
      backgroundColor: 'transparent',
      borderDash: [6, 4],
      tension: 0,
      pointRadius: [...Array(prices.length - 1).fill(0), 0, 7],
      pointHoverRadius: 9,
      borderWidth: 2.5,
      pointBackgroundColor: color,
      pointBorderColor: '#0d1117',
      pointBorderWidth: 2,
      order: 0,
    });
  }

  const data = {
    labels: [...labels, 'Next Day'],
    datasets: datasets,
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
        hoverRadius: 5
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#8b949e',
          font: { size: 11, family: "'Inter', sans-serif" },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          filter: (item) => {
            const t = item.text;
            return !t.startsWith('BB ') && !t.startsWith('Forecast Range');
          },
        }
      },
      tooltip: {
        backgroundColor: 'rgba(13, 17, 23, 0.95)',
        titleColor: '#e6edf3',
        bodyColor: '#c9d1d9',
        borderColor: 'rgba(48, 54, 61, 0.8)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 8,
        displayColors: true,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
        boxPadding: 4,
        filter: (item) => !item.dataset.label.startsWith('Forecast Range'),
        callbacks: {
          label: function(context) {
            if (context.parsed.y == null) return null;
            return ' ' + context.dataset.label + ':  $' + context.parsed.y.toFixed(2);
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(48, 54, 61, 0.15)',
          drawBorder: false,
        },
        ticks: {
          color: '#8b949e',
          maxRotation: 0,
          autoSkipPadding: 30,
          font: { size: 11 },
        },
        border: {
          display: false,
        }
      },
      y: {
        grid: {
          color: 'rgba(48, 54, 61, 0.2)',
          drawBorder: false,
        },
        ticks: {
          color: '#8b949e',
          font: { size: 11 },
          padding: 8,
          callback: function(value) {
            return '$' + value.toFixed(0);
          }
        },
        border: {
          display: false,
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    }
  };

  // Build subtitle
  const rangeLabels = { '5d': '1 Week', '1mo': '1 Month', '3mo': '3 Months', '6mo': '6 Months', '1y': '1 Year' };
  const parts = [rangeLabels[chartRange] || '1 Month'];
  if (indicatorData) parts.push('SMA', 'BB');
  if (prediction?.prediction) parts.push('Next Day Forecast');

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>{symbol} Price Chart</h3>
        <span className="chart-period">
          {parts.join(' \u00B7 ')}
        </span>
      </div>
      <div className="chart-canvas">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
