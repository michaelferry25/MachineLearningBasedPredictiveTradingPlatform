package ie.michaelferry.tradingapi.controllers;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class MLController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String ML_SERVICE_URL = "http://localhost:5001";

    @GetMapping("/api/ml/predict/{symbol}")
    public Map<String, Object> getPrediction(@PathVariable String symbol) {
        try {
            String url = ML_SERVICE_URL + "/predict/" + symbol;
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return Map.of(
                "error", "ML service unavailable",
                "message", e.getMessage()
            );
        }
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