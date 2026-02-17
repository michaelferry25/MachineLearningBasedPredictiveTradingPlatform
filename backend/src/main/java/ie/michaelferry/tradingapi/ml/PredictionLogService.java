package ie.michaelferry.tradingapi.ml;

import ie.michaelferry.tradingapi.models.StockResponse;
import ie.michaelferry.tradingapi.services.StockService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class PredictionLogService {

    private final PredictionLogRepository repository;
    private final StockService stockService;

    public PredictionLogService(PredictionLogRepository repository, StockService stockService) {
        this.repository = repository;
        this.stockService = stockService;
    }

    public PredictionLog logPrediction(String symbol, Map<String, Object> payload, int horizonHours) {
        if (payload == null || payload.containsKey("error")) {
            return null;
        }

        PredictionLog log = new PredictionLog();
        log.setSymbol(symbol.toUpperCase());
        log.setModel(getString(payload, "model", "Weighted Moving Average + Trend"));
        log.setPredictedPrice(getDouble(payload, "prediction", 0));
        log.setCurrentPrice(getDouble(payload, "current_price", 0));
        log.setConfidence(getDoubleOrNull(payload.get("confidence")));
        log.setDirection(getString(payload, "direction", null));
        log.setHorizonHours(horizonHours);
        log.setCreatedAt(Instant.now());
        return repository.save(log);
    }

    public int evaluatePending(int horizonHours) {
        Instant cutoff = Instant.now().minus(Duration.ofHours(horizonHours));
        List<PredictionLog> pending = repository.findByEvaluatedAtIsNullAndCreatedAtBefore(cutoff);
        int evaluated = 0;

        for (PredictionLog log : pending) {
            StockResponse response = stockService.getStockPrice(log.getSymbol());
            double actual = response.getPrice();
            if (actual <= 0) {
                continue;
            }

            double absoluteError = Math.abs(actual - log.getPredictedPrice());
            Double percentError = log.getCurrentPrice() > 0
                    ? (absoluteError / log.getCurrentPrice()) * 100
                    : null;

            log.setActualPrice(actual);
            log.setAbsoluteError(roundTwo(absoluteError));
            log.setPercentError(percentError == null ? null : roundTwo(percentError));
            log.setHit(directionHit(log.getDirection(), log.getCurrentPrice(), actual));
            log.setEvaluatedAt(Instant.now());
            repository.save(log);
            evaluated += 1;
        }

        return evaluated;
    }

    public Map<String, Object> getMetrics() {
        long total = repository.count();
        List<PredictionLog> evaluated = repository.findByEvaluatedAtIsNotNull();

        double mae = evaluated.stream()
                .map(PredictionLog::getAbsoluteError)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        double mape = evaluated.stream()
                .map(PredictionLog::getPercentError)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        long hitCount = evaluated.stream()
                .map(PredictionLog::getHit)
                .filter(Boolean.TRUE::equals)
                .count();

        double hitRate = evaluated.isEmpty() ? 0 : (hitCount * 100.0) / evaluated.size();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalPredictions", total);
        metrics.put("evaluatedPredictions", evaluated.size());
        metrics.put("mae", roundTwo(mae));
        metrics.put("mape", roundTwo(mape));
        metrics.put("hitRate", roundTwo(hitRate));
        return metrics;
    }

    public List<PredictionLog> getEvaluatedBySymbol(String symbol, int limit) {
        int capped = Math.min(Math.max(limit, 1), 200);
        List<PredictionLog> logs = repository.findBySymbolAndEvaluatedAtIsNotNullOrderByCreatedAtDesc(symbol);
        return logs.size() <= capped ? logs : logs.subList(0, capped);
    }

    public List<PredictionLog> getRecentLogs(int limit, Boolean evaluated) {
        int capped = Math.min(Math.max(limit, 1), 200);
        List<PredictionLog> logs = repository
                .findAll(PageRequest.of(0, capped, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();

        if (evaluated == null) {
            return logs;
        }

        List<PredictionLog> filtered = new ArrayList<>();
        for (PredictionLog log : logs) {
            if (evaluated && log.getEvaluatedAt() != null) {
                filtered.add(log);
            } else if (!evaluated && log.getEvaluatedAt() == null) {
                filtered.add(log);
            }
        }
        return filtered;
    }

    private Boolean directionHit(String direction, double currentPrice, double actualPrice) {
        if (direction == null || currentPrice <= 0) {
            return null;
        }
        double movement = actualPrice - currentPrice;
        if (movement == 0) {
            return "NEUTRAL".equalsIgnoreCase(direction);
        }
        if (movement > 0) {
            return "UP".equalsIgnoreCase(direction);
        }
        return "DOWN".equalsIgnoreCase(direction);
    }

    private String getString(Map<String, Object> payload, String key, String fallback) {
        Object value = payload.get(key);
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    private double getDouble(Map<String, Object> payload, String key, double fallback) {
        Object value = payload.get(key);
        if (value == null) {
            return fallback;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private Double getDoubleOrNull(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
