package ie.michaelferry.tradingapi.ml;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Scheduled poller that periodically asks the Python ML service for fresh
 * predictions and records them via {@link PredictionLogService}. Runs on
 * two cadences (hourly + daily close) and also triggers evaluation of
 * predictions whose horizon has elapsed.
 */
@Component
public class PredictionScheduler {

    private static final Logger log = LoggerFactory.getLogger(PredictionScheduler.class);

    private final PredictionLogService predictionLogService;
    private final RestTemplate restTemplate;

    @Value("${app.ml.service-url:http://localhost:5001}")
    private String mlServiceUrl;

    @Value("${app.ml.symbols:AAPL,MSFT,TSLA,AMZN,NVDA,META,NFLX,GOOGL}")
    private String symbols;

    @Value("${app.ml.horizon-hours:24}")
    private int horizonHours;

    public PredictionScheduler(PredictionLogService predictionLogService, RestTemplate restTemplate) {
        this.predictionLogService = predictionLogService;
        this.restTemplate = restTemplate;
    }

    @Scheduled(fixedRateString = "${app.ml.schedule-ms:3600000}")
    public void logHourlyPredictions() {
        for (String symbol : getSymbols()) {
            try {
                String url = mlServiceUrl + "/predict/" + symbol;
                Map<String, Object> response = restTemplate.getForObject(url, Map.class);
                predictionLogService.logPrediction(symbol, response, horizonHours, "scheduler_hourly");
            } catch (Exception e) {
                log.warn("Hourly prediction for {} failed: {}", symbol, e.getMessage());
            }
        }
    }

    @Scheduled(cron = "${app.ml.daily-close-cron:0 0 16 * * MON-FRI}", zone = "America/New_York")
    public void logDailyClosePredictions() {
        for (String symbol : getSymbols()) {
            try {
                String url = mlServiceUrl + "/predict/" + symbol;
                Map<String, Object> response = restTemplate.getForObject(url, Map.class);
                predictionLogService.logPrediction(symbol, response, horizonHours, "scheduler_daily_close");
            } catch (Exception e) {
                log.warn("Daily-close prediction for {} failed: {}", symbol, e.getMessage());
            }
        }
    }

    @Scheduled(fixedRateString = "${app.ml.evaluate-ms:3600000}")
    public void evaluatePredictions() {
        predictionLogService.evaluatePending(horizonHours);
    }

    private List<String> getSymbols() {
        String[] parts = symbols.split(",");
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed.toUpperCase());
            }
        }
        return result;
    }
}
