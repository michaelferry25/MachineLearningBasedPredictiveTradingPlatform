import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

export default function HistoricalChart({ timestamps, prices }) {
  const data = {
    labels: timestamps.map(t => new Date(t * 1000).toLocaleTimeString()),
    datasets: [
      {
        label: "Price",
        data: prices,
        borderColor: "#238636",
        tension: 0.3,
      },
    ],
  };

  return (
    <div style={{ width: "600px", marginTop: "40px" }}>
      <Line data={data} />
    </div>
  );
}