package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.ml.PredictionLog;
import ie.michaelferry.tradingapi.ml.PredictionLogService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@RestController
public class MLController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final PredictionLogService predictionLogService;

    @Value("${app.ml.service-url}")
    private String mlServiceUrl;

    @Value("${app.ml.symbols}")
    private String mlSymbolsConfig;

    public MLController(PredictionLogService predictionLogService) {
        this.predictionLogService = predictionLogService;
    }

    @GetMapping("/api/ml/predict/{symbol}")
    public Map<String, Object> getPrediction(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "24") int horizonHours
    ) {
        try {
            String url = mlServiceUrl + "/predict/" + symbol;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            predictionLogService.logPrediction(symbol, response, horizonHours);
            return response;
        } catch (Exception e) {
            return errorResponse("ML service unavailable", e);
        }
    }

    @GetMapping("/api/ml/predict/{symbol}/detailed")
    public Map<String, Object> getDetailedPrediction(@PathVariable String symbol) {
        try {
            String url = mlServiceUrl + "/predict/" + symbol + "/detailed";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return errorResponse("ML service unavailable", e);
        }
    }

    @GetMapping("/api/ml/scan")
    public Map<String, Object> scanMarket() {
        try {
            List<String> symbols = Arrays.stream(mlSymbolsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

            Map<String, Object> requestBody = Map.of("symbols", symbols);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            String url = mlServiceUrl + "/batch-predict";
            ResponseEntity<Map> responseEntity = restTemplate.exchange(
                url, HttpMethod.POST, entity, Map.class
            );

            Map<String, Object> body = responseEntity.getBody();
            if (body != null && body.containsKey("predictions")) {
                return body;
            }

            return Map.of("predictions", List.of(), "count", 0);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "ML scan failed — is the ML service running on " + mlServiceUrl + "?");
            error.put("message", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            error.put("predictions", List.of());
            error.put("count", 0);
            return error;
        }
    }

    @GetMapping("/api/ml/sentiment/{symbol}")
    public Map<String, Object> getSentiment(@PathVariable String symbol) {
        try {
            String url = mlServiceUrl + "/sentiment/" + symbol.toUpperCase();
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return errorResponse("Sentiment service unavailable", e);
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
            String url = mlServiceUrl + "/health";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return errorResponse("unavailable", e);
        }
    }

    private Map<String, Object> errorResponse(String label, Exception e) {
        Map<String, Object> result = new HashMap<>();
        result.put("error", label);
        result.put("message", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        return result;
    }
}
