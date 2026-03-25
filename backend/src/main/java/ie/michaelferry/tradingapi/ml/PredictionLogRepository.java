package ie.michaelferry.tradingapi.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

    // Admin queries
    long countByHitTrue();
    long countByHitFalse();
    long countByEvaluatedAtIsNotNull();
    long countByCreatedAtAfter(Instant after);
    List<PredictionLog> findTop50ByOrderByCreatedAtDesc();

    @Query("SELECT p.model, COUNT(p), SUM(CASE WHEN p.hit = true THEN 1 ELSE 0 END), AVG(p.percentError) FROM PredictionLog p WHERE p.evaluatedAt IS NOT NULL GROUP BY p.model")
    List<Object[]> findAccuracyByModel();

    @Query("SELECT p.symbol, COUNT(p), SUM(CASE WHEN p.hit = true THEN 1 ELSE 0 END), AVG(p.percentError) FROM PredictionLog p WHERE p.evaluatedAt IS NOT NULL GROUP BY p.symbol ORDER BY COUNT(p) DESC")
    List<Object[]> findAccuracyBySymbol();
}
