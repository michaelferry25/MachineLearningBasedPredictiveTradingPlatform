package ie.michaelferry.tradingapi.ml;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import ie.michaelferry.tradingapi.models.StockResponse;
import ie.michaelferry.tradingapi.services.StockService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

@Service
public class PredictionLogService {

    private static final ZoneId MARKET_ZONE = ZoneId.of("America/New_York");
    private static final LocalTime MARKET_OPEN = LocalTime.of(9, 30);
    private static final LocalTime MARKET_CLOSE = LocalTime.of(16, 0);

    private final PredictionLogRepository repository;
    private final StockService stockService;
    private final ObjectMapper objectMapper;

    public PredictionLogService(
            PredictionLogRepository repository,
            StockService stockService,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.stockService = stockService;
        this.objectMapper = objectMapper;
    }

    public PredictionLog logPrediction(String symbol, Map<String, Object> payload, int horizonHours) {
        return logPrediction(symbol, payload, horizonHours, "unknown");
    }

    public PredictionLog logPrediction(String symbol, Map<String, Object> payload, int horizonHours, String source) {
        if (payload == null || payload.containsKey("error")) {
            return null;
        }

        Instant createdAt = Instant.now();
        Instant targetAt = computeTargetMarketClose(createdAt);

        PredictionLog log = new PredictionLog();
        log.setSymbol(symbol.toUpperCase());
        log.setModel(getString(payload, "model", "Ensemble"));
        log.setModelVersion(getString(payload, "model_version", null));
        log.setPredictedPrice(getDouble(payload, "prediction", 0));
        log.setCurrentPrice(getDouble(payload, "current_price", 0));
        log.setPredictedReturnPercent(getDoubleOrNull(
                payload.containsKey("expected_return_percent")
                        ? payload.get("expected_return_percent")
                        : payload.get("price_change_percent")
        ));
        log.setConfidence(getDoubleOrNull(payload.get("confidence")));
        log.setDirection(getString(payload, "direction", null));
        log.setRegime(getString(payload, "regime", null));
        log.setSentimentScore(extractNestedDouble(payload, "sentiment_context", "score"));
        log.setPredictionSource(source);

        Object intervalObj = payload.get("prediction_interval");
        if (intervalObj instanceof Map<?, ?> intervalMap) {
            log.setLowerBoundPrice(getDoubleOrNull(intervalMap.get("low")));
            log.setUpperBoundPrice(getDoubleOrNull(intervalMap.get("high")));
        }

        log.setPayloadJson(safeJson(payload));
        log.setHorizonHours(horizonHours);
        log.setCreatedAt(createdAt);
        log.setTargetAt(targetAt);
        return repository.save(log);
    }

    public Map<String, Object> getLatestPredictionPayload(String symbol, int staleAfterMinutes) {
        PredictionLog latest = repository.findTopBySymbolOrderByCreatedAtDesc(symbol.toUpperCase());
        if (latest == null) {
            return null;
        }

        Map<String, Object> payload = payloadFromLog(latest);
        return enrichLatestPredictionPayload(latest, payload, staleAfterMinutes);
    }

    public Map<String, Object> getLatestPredictionPayload(String symbol, int staleAfterMinutes, String source) {
        String sym = symbol.toUpperCase();
        if (source == null || source.isBlank()) {
            return getLatestPredictionPayload(sym, staleAfterMinutes);
        }

        PredictionLog latest = repository.findTopBySymbolAndPredictionSourceOrderByCreatedAtDesc(sym, source.trim());

        // Backward compatibility with existing scheduler source names in older rows.
        if (latest == null && "scheduler_hourly".equalsIgnoreCase(source)) {
            latest = repository.findTopBySymbolAndPredictionSourceOrderByCreatedAtDesc(sym, "scheduler");
        } else if (latest == null && "scheduler_daily_close".equalsIgnoreCase(source)) {
            latest = repository.findTopBySymbolAndPredictionSourceOrderByCreatedAtDesc(sym, "daily_close");
        }

        if (latest == null) {
            return null;
        }

        Map<String, Object> payload = payloadFromLog(latest);
        return enrichLatestPredictionPayload(latest, payload, staleAfterMinutes);
    }

    public Map<String, Object> getPredictionComparison(String symbol, int hourlyStaleMinutes) {
        String sym = symbol.toUpperCase();
        int dailyStaleMinutes = Math.max(hourlyStaleMinutes, 26 * 60);

        Map<String, Object> hourly = getLatestPredictionPayload(sym, hourlyStaleMinutes, "scheduler_hourly");
        Map<String, Object> dailyClose = getLatestPredictionPayload(sym, dailyStaleMinutes, "scheduler_daily_close");

        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("symbol", sym);
        comparison.put("hourlyPrediction", hourly);
        comparison.put("dailyClosePrediction", dailyClose);
        comparison.put("generatedAt", Instant.now().toString());

        Double hourlyPrice = extractPredictionPrice(hourly);
        Double dailyPrice = extractPredictionPrice(dailyClose);
        if (hourlyPrice != null && dailyPrice != null && dailyPrice != 0) {
            double spread = hourlyPrice - dailyPrice;
            double spreadAbs = Math.abs(spread);
            double spreadPercent = (spread / dailyPrice) * 100.0;

            Map<String, Object> spreadMeta = new LinkedHashMap<>();
            spreadMeta.put("hourlyMinusDaily", roundTwo(spread));
            spreadMeta.put("absoluteSpread", roundTwo(spreadAbs));
            spreadMeta.put("spreadPercentOfDaily", roundTwo(spreadPercent));
            spreadMeta.put("volatilitySignal", spreadAbs >= 1.0 ? "elevated" : "normal");
            comparison.put("spread", spreadMeta);
        } else {
            comparison.put("spread", null);
        }

        return comparison;
    }

    public int evaluatePending(int horizonHours) {
        Instant now = Instant.now();
        List<PredictionLog> pending = repository.findByEvaluatedAtIsNull();
        int evaluated = 0;

        for (PredictionLog log : pending) {
            Instant readyAt = resolveEvaluationInstant(log, horizonHours);
            if (readyAt == null || readyAt.isAfter(now)) {
                continue;
            }

            StockResponse response = stockService.getStockPrice(log.getSymbol());
            double actual = response.getPrice();
            if (actual <= 0) {
                continue;
            }

            double absoluteError = Math.abs(actual - log.getPredictedPrice());
            Double percentError = log.getCurrentPrice() > 0
                    ? (absoluteError / log.getCurrentPrice()) * 100
                    : null;

            String realizedDirection = realizedDirection(log.getCurrentPrice(), actual);
            log.setActualPrice(actual);
            log.setAbsoluteError(roundTwo(absoluteError));
            log.setPercentError(percentError == null ? null : roundTwo(percentError));
            log.setHit(directionHit(log.getDirection(), log.getCurrentPrice(), actual));
            log.setRealizedDirection(realizedDirection);
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

        List<PredictionLog> confidenceEvaluated = evaluated.stream()
                .filter(log -> log.getConfidence() != null)
                .toList();

        double avgConfidence = confidenceEvaluated.stream()
                .map(PredictionLog::getConfidence)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        // Calibration gap: positive means over-confident, negative means under-confident
        double calibrationGap = confidenceEvaluated.stream()
                .filter(log -> log.getHit() != null)
                .mapToDouble(log -> (log.getConfidence() / 100.0) - (Boolean.TRUE.equals(log.getHit()) ? 1.0 : 0.0))
                .average()
                .orElse(0);

        double reliabilityScore = computeReliabilityScore(hitRate, mape, calibrationGap);

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("totalPredictions", total);
        metrics.put("evaluatedPredictions", evaluated.size());
        metrics.put("mae", roundTwo(mae));
        metrics.put("mape", roundTwo(mape));
        metrics.put("hitRate", roundTwo(hitRate));
        metrics.put("avgConfidence", roundTwo(avgConfidence));
        metrics.put("calibrationGap", roundTwo(calibrationGap * 100));
        metrics.put("reliabilityScore", roundTwo(reliabilityScore));
        metrics.put("reliabilityGrade", gradeFromScore(reliabilityScore));
        return metrics;
    }

    public List<PredictionLog> getEvaluatedBySymbol(String symbol, int limit) {
        int capped = Math.min(Math.max(limit, 1), 400);
        List<PredictionLog> logs = repository.findBySymbolAndEvaluatedAtIsNotNullOrderByCreatedAtDesc(symbol);
        return logs.size() <= capped ? logs : logs.subList(0, capped);
    }

    public List<PredictionLog> getLogsBySymbol(String symbol, int limit, Boolean evaluated) {
        int capped = Math.min(Math.max(limit, 1), 400);
        List<PredictionLog> logs = repository.findBySymbolOrderByCreatedAtDesc(symbol.toUpperCase());

        if (evaluated != null) {
            logs = logs.stream()
                    .filter(log -> evaluated ? log.getEvaluatedAt() != null : log.getEvaluatedAt() == null)
                    .toList();
        }

        return logs.size() <= capped ? logs : logs.subList(0, capped);
    }

    public List<PredictionLog> getRecentLogs(int limit, Boolean evaluated) {
        int capped = Math.min(Math.max(limit, 1), 400);
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

    public Map<String, Object> getAccuracyHistory(String symbol, int days) {
        Instant after = Instant.now().minus(Duration.ofDays(days));
        List<PredictionLog> logs = repository
                .findBySymbolAndEvaluatedAtIsNotNullAndCreatedAtAfterOrderByCreatedAtAsc(
                        symbol.toUpperCase(), after);

        List<Map<String, Object>> predictions = new ArrayList<>();
        long hitCount = 0;
        double totalError = 0;
        int errorCount = 0;

        for (PredictionLog log : logs) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", log.getCreatedAt().toString());
            entry.put("targetAt", log.getTargetAt() != null ? log.getTargetAt().toString() : null);
            entry.put("predictedPrice", log.getPredictedPrice());
            entry.put("actualPrice", log.getActualPrice());
            entry.put("currentPrice", log.getCurrentPrice());
            entry.put("predictedReturnPercent", log.getPredictedReturnPercent());
            entry.put("percentError", log.getPercentError());
            entry.put("hit", log.getHit());
            entry.put("confidence", log.getConfidence());
            entry.put("direction", log.getDirection());
            entry.put("realizedDirection", log.getRealizedDirection());
            entry.put("predictionSource", log.getPredictionSource());
            predictions.add(entry);

            if (Boolean.TRUE.equals(log.getHit())) hitCount++;
            if (log.getPercentError() != null) {
                totalError += log.getPercentError();
                errorCount++;
            }
        }

        double hitRate = logs.isEmpty() ? 0 : (hitCount * 100.0) / logs.size();
        double avgError = errorCount > 0 ? totalError / errorCount : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("symbol", symbol.toUpperCase());
        result.put("predictions", predictions);
        result.put("stats", Map.of(
                "hitRate", roundTwo(hitRate),
                "avgError", roundTwo(avgError),
                "total", logs.size(),
                "hits", hitCount
        ));
        return result;
    }

    public Map<String, Object> getTrackRecord(String symbol, int days, boolean includePending) {
        Instant after = Instant.now().minus(Duration.ofDays(days));
        List<PredictionLog> allLogs = repository.findBySymbolAndCreatedAtAfterOrderByCreatedAtAsc(
                symbol.toUpperCase(), after
        );

        List<Map<String, Object>> points = new ArrayList<>();
        List<PredictionLog> evaluated = new ArrayList<>();

        for (PredictionLog log : allLogs) {
            boolean isEvaluated = log.getEvaluatedAt() != null;
            if (!includePending && !isEvaluated) {
                continue;
            }
            if (isEvaluated) {
                evaluated.add(log);
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", log.getId());
            row.put("symbol", log.getSymbol());
            row.put("createdAt", log.getCreatedAt());
            row.put("targetAt", log.getTargetAt());
            row.put("evaluatedAt", log.getEvaluatedAt());
            row.put("predictedPrice", log.getPredictedPrice());
            row.put("currentPrice", log.getCurrentPrice());
            row.put("predictedReturnPercent", log.getPredictedReturnPercent());
            row.put("confidence", log.getConfidence());
            row.put("direction", log.getDirection());
            row.put("realizedDirection", log.getRealizedDirection());
            row.put("actualPrice", log.getActualPrice());
            row.put("percentError", log.getPercentError());
            row.put("absoluteError", log.getAbsoluteError());
            row.put("hit", log.getHit());
            row.put("status", isEvaluated ? "evaluated" : "pending");
            row.put("horizonHours", log.getHorizonHours());
            row.put("model", log.getModel());
            row.put("modelVersion", log.getModelVersion());
            row.put("regime", log.getRegime());
            row.put("sentimentScore", log.getSentimentScore());
            row.put("intervalLow", log.getLowerBoundPrice());
            row.put("intervalHigh", log.getUpperBoundPrice());
            row.put("predictionSource", log.getPredictionSource());
            points.add(row);
        }

        double hitRate = evaluated.isEmpty() ? 0 :
                evaluated.stream().filter(log -> Boolean.TRUE.equals(log.getHit())).count() * 100.0 / evaluated.size();

        double mape = evaluated.stream()
                .map(PredictionLog::getPercentError)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        double mae = evaluated.stream()
                .map(PredictionLog::getAbsoluteError)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        double avgConfidence = evaluated.stream()
                .map(PredictionLog::getConfidence)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        double calibrationGap = evaluated.stream()
                .filter(log -> log.getConfidence() != null && log.getHit() != null)
                .mapToDouble(log -> (log.getConfidence() / 100.0) - (Boolean.TRUE.equals(log.getHit()) ? 1.0 : 0.0))
                .average()
                .orElse(0);

        double reliabilityScore = computeReliabilityScore(hitRate, mape, calibrationGap);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("windowDays", days);
        stats.put("total", allLogs.size());
        stats.put("evaluated", evaluated.size());
        stats.put("pending", allLogs.size() - evaluated.size());
        stats.put("hitRate", roundTwo(hitRate));
        stats.put("mape", roundTwo(mape));
        stats.put("mae", roundTwo(mae));
        stats.put("avgConfidence", roundTwo(avgConfidence));
        stats.put("calibrationGap", roundTwo(calibrationGap * 100));
        stats.put("reliabilityScore", roundTwo(reliabilityScore));
        stats.put("reliabilityGrade", gradeFromScore(reliabilityScore));
        stats.put("lastUpdatedAt", Instant.now().toString());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("symbol", symbol.toUpperCase());
        response.put("points", points);
        response.put("stats", stats);
        return response;
    }

    private Map<String, Object> payloadFromLog(PredictionLog log) {
        if (log.getPayloadJson() != null && !log.getPayloadJson().isBlank()) {
            try {
                return objectMapper.readValue(log.getPayloadJson(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {
                // fallback below
            }
        }

        Map<String, Object> fallback = new LinkedHashMap<>();
        fallback.put("symbol", log.getSymbol());
        fallback.put("model", log.getModel());
        fallback.put("model_version", log.getModelVersion());
        fallback.put("prediction", log.getPredictedPrice());
        fallback.put("current_price", log.getCurrentPrice());
        fallback.put("prediction_target_at", log.getTargetAt() != null ? log.getTargetAt().toString() : null);
        fallback.put("expected_return_percent", log.getPredictedReturnPercent());
        fallback.put("price_change_percent", log.getPredictedReturnPercent());
        fallback.put("confidence", log.getConfidence());
        fallback.put("direction", log.getDirection());
        fallback.put("regime", log.getRegime());
        fallback.put("signal", inferSignal(log.getDirection(), log.getPredictedReturnPercent(), log.getConfidence()));

        if (log.getLowerBoundPrice() != null || log.getUpperBoundPrice() != null) {
            Map<String, Object> interval = new LinkedHashMap<>();
            interval.put("low", log.getLowerBoundPrice());
            interval.put("high", log.getUpperBoundPrice());
            fallback.put("prediction_interval", interval);
        }

        if (log.getSentimentScore() != null) {
            fallback.put("sentiment_context", Map.of("score", log.getSentimentScore()));
        }

        return fallback;
    }

    private Map<String, Object> enrichLatestPredictionPayload(
            PredictionLog log,
            Map<String, Object> payload,
            int staleAfterMinutes
    ) {
        Map<String, Object> enriched = new LinkedHashMap<>(payload);

        Instant createdAt = log.getCreatedAt();
        Instant targetAt = log.getTargetAt();
        long ageMinutes = createdAt == null ? 0 : Math.max(0, Duration.between(createdAt, Instant.now()).toMinutes());
        boolean stale = ageMinutes > Math.max(1, staleAfterMinutes);

        Map<String, Object> meta = new LinkedHashMap<>();
        Object metaObj = enriched.get("prediction_meta");
        if (metaObj instanceof Map<?, ?> existingMeta) {
            for (Map.Entry<?, ?> e : existingMeta.entrySet()) {
                if (e.getKey() != null) {
                    meta.put(String.valueOf(e.getKey()), e.getValue());
                }
            }
        }

        meta.put("createdAt", createdAt != null ? createdAt.toString() : null);
        meta.put("targetAt", targetAt != null ? targetAt.toString() : null);
        meta.put("ageMinutes", ageMinutes);
        meta.put("stale", stale);
        meta.put("logId", log.getId());
        meta.put("source", log.getPredictionSource() == null ? "unknown" : log.getPredictionSource());
        meta.put("horizonHours", log.getHorizonHours());
        meta.put("evaluated", log.getEvaluatedAt() != null);
        if (log.getEvaluatedAt() != null) {
            meta.put("evaluatedAt", log.getEvaluatedAt().toString());
            meta.put("hit", log.getHit());
            meta.put("percentError", log.getPercentError());
            meta.put("absoluteError", log.getAbsoluteError());
        }

        enriched.put("prediction_meta", meta);
        enriched.put("symbol", log.getSymbol());
        enriched.put("model", getString(enriched, "model", log.getModel()));
        if (!enriched.containsKey("model_version") && log.getModelVersion() != null) {
            enriched.put("model_version", log.getModelVersion());
        }
        enriched.put("last_prediction_at", createdAt != null ? createdAt.toString() : null);
        enriched.put("prediction_target_at", targetAt != null ? targetAt.toString() : null);
        enriched.put("prediction_log_id", log.getId());
        enriched.put("last_prediction_age_minutes", ageMinutes);
        enriched.put("last_prediction_stale", stale);
        enriched.put("served_from_log", true);

        return enriched;
    }

    private String inferSignal(String direction, Double returnPct, Double confidence) {
        if (direction == null) {
            return "HOLD";
        }
        double change = returnPct == null ? 0 : Math.abs(returnPct);
        double conf = confidence == null ? 0 : confidence;

        if (change < 0.35 || conf < 48) {
            return "HOLD";
        }
        if ("UP".equalsIgnoreCase(direction)) {
            return change >= 1.6 && conf >= 78 ? "STRONG BUY" : "BUY";
        }
        if ("DOWN".equalsIgnoreCase(direction)) {
            return change >= 1.6 && conf >= 78 ? "STRONG SELL" : "SELL";
        }
        return "HOLD";
    }

    private String safeJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return null;
        }
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

    private String realizedDirection(double currentPrice, double actualPrice) {
        if (currentPrice <= 0 || actualPrice <= 0) {
            return null;
        }
        double movement = actualPrice - currentPrice;
        if (movement > 0) {
            return "UP";
        }
        if (movement < 0) {
            return "DOWN";
        }
        return "NEUTRAL";
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

    private Double extractNestedDouble(Map<String, Object> payload, String key, String nestedKey) {
        Object parent = payload.get(key);
        if (!(parent instanceof Map<?, ?> parentMap)) {
            return null;
        }
        return getDoubleOrNull(parentMap.get(nestedKey));
    }

    private Double extractPredictionPrice(Map<String, Object> payload) {
        if (payload == null) {
            return null;
        }
        return getDoubleOrNull(payload.get("prediction"));
    }

    private Instant resolveEvaluationInstant(PredictionLog log, int defaultHorizonHours) {
        if (log.getTargetAt() != null) {
            return log.getTargetAt();
        }
        if (log.getCreatedAt() == null) {
            return null;
        }
        int hours = log.getHorizonHours() > 0 ? log.getHorizonHours() : Math.max(1, defaultHorizonHours);
        return log.getCreatedAt().plus(Duration.ofHours(hours));
    }

    private Instant computeTargetMarketClose(Instant issuedAt) {
        ZonedDateTime issuedEt = issuedAt.atZone(MARKET_ZONE);
        LocalDate issuedDate = issuedEt.toLocalDate();
        LocalTime issuedTime = issuedEt.toLocalTime();

        boolean tradingDay = isTradingDay(issuedDate);
        boolean duringRegularHours = tradingDay
                && !issuedTime.isBefore(MARKET_OPEN)
                && issuedTime.isBefore(MARKET_CLOSE);

        LocalDate targetDate = duringRegularHours
                ? issuedDate
                : nextTradingDay(issuedDate.plusDays(1));

        return ZonedDateTime.of(targetDate, MARKET_CLOSE, MARKET_ZONE).toInstant();
    }

    private LocalDate nextTradingDay(LocalDate date) {
        LocalDate current = date;
        while (!isTradingDay(current)) {
            current = current.plusDays(1);
        }
        return current;
    }

    private boolean isTradingDay(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
    }

    private double computeReliabilityScore(double hitRate, double mape, double calibrationGap) {
        double hitComponent = Math.max(0, Math.min(100, hitRate));
        double errorComponent = Math.max(0, 100 - (mape * 8.5));
        double calibrationPenalty = Math.min(30, Math.abs(calibrationGap * 100));

        double score = (0.5 * hitComponent) + (0.35 * errorComponent) + (0.15 * (100 - calibrationPenalty));
        return Math.max(0, Math.min(100, score));
    }

    private String gradeFromScore(double score) {
        if (score >= 85) return "A";
        if (score >= 75) return "B";
        if (score >= 65) return "C";
        if (score >= 50) return "D";
        return "F";
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
