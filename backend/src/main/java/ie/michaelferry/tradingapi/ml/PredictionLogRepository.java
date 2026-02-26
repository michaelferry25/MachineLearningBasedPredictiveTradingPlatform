package ie.michaelferry.tradingapi.ml;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PredictionLogRepository extends JpaRepository<PredictionLog, Long> {
    List<PredictionLog> findByEvaluatedAtIsNullAndCreatedAtBefore(Instant cutoff);
    List<PredictionLog> findByEvaluatedAtIsNotNull();
    List<PredictionLog> findByEvaluatedAtIsNull();
    PredictionLog findTopBySymbolOrderByCreatedAtDesc(String symbol);
    PredictionLog findTopBySymbolAndPredictionSourceOrderByCreatedAtDesc(String symbol, String predictionSource);
    List<PredictionLog> findBySymbolOrderByCreatedAtDesc(String symbol);
    List<PredictionLog> findBySymbolAndCreatedAtAfterOrderByCreatedAtAsc(String symbol, Instant after);
    List<PredictionLog> findBySymbolAndEvaluatedAtIsNotNullOrderByCreatedAtDesc(String symbol);
    List<PredictionLog> findBySymbolAndEvaluatedAtIsNotNullAndCreatedAtAfterOrderByCreatedAtAsc(String symbol, Instant after);
}
