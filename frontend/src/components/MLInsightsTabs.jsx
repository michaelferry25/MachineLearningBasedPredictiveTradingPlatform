import { useState } from "react";
import ModelPerformanceChart from "./ModelPerformanceChart";
import FeatureImportanceChart from "./FeatureImportanceChart";
import TechnicalIndicatorCharts from "./TechnicalIndicatorCharts";
import PredictedVsActualChart from "./PredictedVsActualChart";

const TABS = [
  { key: "indicators", label: "Technical Indicators" },
  { key: "model", label: "Model Performance" },
  { key: "features", label: "Feature Importance" },
  { key: "backtest", label: "Predicted vs Actual" },
];

export default function MLInsightsTabs({ detailedPrediction }) {
  const [activeTab, setActiveTab] = useState("indicators");

  if (!detailedPrediction) return null;

  return (
    <div className="ml-insights-card">
      <div className="insights-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`insights-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="insights-content">
        {activeTab === "indicators" && (
          <TechnicalIndicatorCharts timeseries={detailedPrediction.indicator_timeseries} />
        )}
        {activeTab === "model" && (
          <ModelPerformanceChart detailedPrediction={detailedPrediction} />
        )}
        {activeTab === "features" && (
          <FeatureImportanceChart featureImportance={detailedPrediction.feature_importance} />
        )}
        {activeTab === "backtest" && (
          <PredictedVsActualChart backtest={detailedPrediction.backtest} />
        )}
      </div>
    </div>
  );
}
