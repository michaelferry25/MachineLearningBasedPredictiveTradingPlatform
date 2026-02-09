package ie.michaelferry.tradingapi.ml;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class PredictionScheduler {

    private final PredictionLogService predictionLogService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ml.service-url:http://localhost:5001}")
    private String mlServiceUrl;

    @Value("${app.ml.symbols:AAPL,MSFT,TSLA,AMZN,NVDA,META,NFLX,GOOGL}")
    private String symbols;

    @Value("${app.ml.horizon-hours:24}")
    private int horizonHours;

    public PredictionScheduler(PredictionLogService predictionLogService) {
        this.predictionLogService = predictionLogService;
    }

    @Scheduled(fixedRateString = "${app.ml.schedule-ms:3600000}")
    public void logPredictions() {
        for (String symbol : getSymbols()) {
            try {
                String url = mlServiceUrl + "/predict/" + symbol;
                Map<String, Object> response = restTemplate.getForObject(url, Map.class);
                predictionLogService.logPrediction(symbol, response, horizonHours);
            } catch (Exception ignored) {
                // ignore transient failures
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
