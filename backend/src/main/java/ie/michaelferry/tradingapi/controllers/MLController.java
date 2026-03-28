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

    private final RestTemplate restTemplate;
    private final PredictionLogService predictionLogService;

    @Value("${app.ml.service-url}")
    private String mlServiceUrl;

    @Value("${app.ml.symbols}")
    private String mlSymbolsConfig;

    @Value("${app.ml.horizon-hours:24}")
    private int defaultHorizonHours;

    @Value("${app.ml.schedule-ms:3600000}")
    private long scheduleMs;

    public MLController(RestTemplate restTemplate, PredictionLogService predictionLogService) {
        this.restTemplate = restTemplate;
        this.predictionLogService = predictionLogService;
    }

    @GetMapping("/api/ml/predict/{symbol}")
    public Map<String, Object> getPrediction(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "24") int horizonHours,
            @RequestParam(defaultValue = "false") boolean refresh,
            @RequestParam(required = false) String source
    ) {
        String sym = symbol.toUpperCase();
        int staleAfterMinutes = (int) Math.max(20, (scheduleMs / 60000L) + 15);

        if (!refresh) {
            Map<String, Object> latest = (source == null || source.isBlank())
                    ? predictionLogService.getLatestPredictionPayload(sym, staleAfterMinutes)
                    : predictionLogService.getLatestPredictionPayload(sym, staleAfterMinutes, source);
            if (latest != null) {
                return latest;
            }
        }

        try {
            String url = mlServiceUrl + "/predict/" + sym;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            predictionLogService.logPrediction(
                    sym,
                    response,
                    horizonHours,
                    refresh ? "manual_refresh" : (source == null || source.isBlank() ? "bootstrap" : source.trim())
            );

            Map<String, Object> latest = (source == null || source.isBlank())
                    ? predictionLogService.getLatestPredictionPayload(sym, staleAfterMinutes)
                    : predictionLogService.getLatestPredictionPayload(sym, staleAfterMinutes, source);
            return latest != null ? latest : response;
        } catch (Exception e) {
            return errorResponse("ML service unavailable", e);
        }
    }

    @PostMapping("/api/ml/predict/{symbol}/refresh")
    public Map<String, Object> refreshPrediction(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "24") int horizonHours
    ) {
        return getPrediction(symbol, horizonHours, true, null);
    }

    @GetMapping("/api/ml/predict-comparison/{symbol}")
    public Map<String, Object> getPredictionComparison(@PathVariable String symbol) {
        String sym = symbol.toUpperCase();
        int staleAfterMinutes = (int) Math.max(20, (scheduleMs / 60000L) + 15);
        return predictionLogService.getPredictionComparison(sym, staleAfterMinutes);
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

    @GetMapping("/api/ml/predict/{symbol}/live-confidence")
    public Map<String, Object> getLiveConfidence(@PathVariable String symbol) {
        try {
            String url = mlServiceUrl + "/predict/" + symbol.toUpperCase() + "/live-confidence";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return errorResponse("Live confidence unavailable", e);
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
                Object predictionsObj = body.get("predictions");
                if (predictionsObj instanceof List<?> predictions) {
                    for (Object item : predictions) {
                        if (item instanceof Map<?, ?> mapItem) {
                            Map<String, Object> row = new HashMap<>();
                            for (Map.Entry<?, ?> entry : mapItem.entrySet()) {
                                if (entry.getKey() != null) {
                                    row.put(String.valueOf(entry.getKey()), entry.getValue());
                                }
                            }
                            String sym = String.valueOf(row.getOrDefault("symbol", "")).trim().toUpperCase();
                            if (!sym.isEmpty()) {
                                predictionLogService.logPrediction(sym, row, defaultHorizonHours, "scan");
                            }
                        }
                    }
                }
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
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) Boolean evaluated,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String modelVersion
    ) {
        return predictionLogService.getLogsBySymbol(symbol.toUpperCase(), limit, evaluated, source, modelVersion);
    }

    @GetMapping("/api/ml/predictions")
    public List<PredictionLog> getPredictions(
            @RequestParam(defaultValue = "25") int limit,
            @RequestParam(required = false) Boolean evaluated,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String modelVersion
    ) {
        return predictionLogService.getRecentLogs(limit, evaluated, source, modelVersion);
    }

    @PostMapping("/api/ml/evaluate")
    public Map<String, Object> evaluatePredictions(
            @RequestParam(defaultValue = "24") int horizonHours
    ) {
        int evaluated = predictionLogService.evaluatePending(horizonHours);
        return Map.of("evaluated", evaluated);
    }

    @GetMapping("/api/ml/accuracy/{symbol}")
    public Map<String, Object> getAccuracy(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String modelVersion
    ) {
        return predictionLogService.getAccuracyHistory(symbol.toUpperCase(), days, source, modelVersion);
    }

    @GetMapping("/api/ml/track-record/{symbol}")
    public Map<String, Object> getTrackRecord(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "180") int days,
            @RequestParam(defaultValue = "true") boolean includePending,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String modelVersion
    ) {
        return predictionLogService.getTrackRecord(symbol.toUpperCase(), days, includePending, source, modelVersion);
    }

    @GetMapping("/api/ml/metrics")
    public Map<String, Object> getMetrics() {
        return predictionLogService.getMetrics();
    }

    @PostMapping("/api/ml/optimize-portfolio")
    public ResponseEntity<Map> optimizePortfolio(@RequestBody Map<String, Object> request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            String url = mlServiceUrl + "/optimize-portfolio";
            ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, Map.class
            );
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorResponse("Portfolio optimization unavailable", e));
        }
    }

    @PostMapping("/api/ml/backtest")
    public ResponseEntity<Map> runBacktest(@RequestBody Map<String, Object> request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            String url = mlServiceUrl + "/backtest";
            ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, Map.class
            );
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorResponse("Backtest service unavailable", e));
        }
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
