package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.ml.PredictionLog;
import ie.michaelferry.tradingapi.ml.PredictionLogService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
public class MLController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String ML_SERVICE_URL = "http://localhost:5001";
    private final PredictionLogService predictionLogService;

    public MLController(PredictionLogService predictionLogService) {
        this.predictionLogService = predictionLogService;
    }

    @GetMapping("/api/ml/predict/{symbol}")
    public Map<String, Object> getPrediction(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "24") int horizonHours
    ) {
        try {
            String url = ML_SERVICE_URL + "/predict/" + symbol;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            predictionLogService.logPrediction(symbol, response, horizonHours);
            return response;
        } catch (Exception e) {
            return Map.of(
                "error", "ML service unavailable",
                "message", e.getMessage()
            );
        }
    }

    @GetMapping("/api/ml/predict/{symbol}/detailed")
    public Map<String, Object> getDetailedPrediction(@PathVariable String symbol) {
        try {
            String url = ML_SERVICE_URL + "/predict/" + symbol + "/detailed";
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            return response;
        } catch (Exception e) {
            return Map.of(
                "error", "ML service unavailable",
                "message", e.getMessage()
            );
        }
    }

    @GetMapping("/api/ml/predictions/{symbol}")
    public List<PredictionLog> getPredictionsBySymbol(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return predictionLogService.getEvaluatedBySymbol(symbol.toUpperCase(), limit);
    }

    @GetMapping("/api/ml/predictions")
    public List<PredictionLog> getPredictions(
            @RequestParam(defaultValue = "25") int limit,
            @RequestParam(required = false) Boolean evaluated
    ) {
        return predictionLogService.getRecentLogs(limit, evaluated);
    }

    @PostMapping("/api/ml/evaluate")
    public Map<String, Object> evaluatePredictions(
            @RequestParam(defaultValue = "24") int horizonHours
    ) {
        int evaluated = predictionLogService.evaluatePending(horizonHours);
        return Map.of("evaluated", evaluated);
    }

    @GetMapping("/api/ml/metrics")
    public Map<String, Object> getMetrics() {
        return predictionLogService.getMetrics();
    }

    @GetMapping("/api/ml/health")
    public Map<String, Object> checkMLService() {
        try {
            String url = ML_SERVICE_URL + "/health";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return Map.of(
                "status", "unavailable",
                "error", e.getMessage()
            );
        }
    }
}
