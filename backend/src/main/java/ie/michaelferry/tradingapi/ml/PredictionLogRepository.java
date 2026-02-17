package ie.michaelferry.tradingapi.ml;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PredictionLogRepository extends JpaRepository<PredictionLog, Long> {
    List<PredictionLog> findByEvaluatedAtIsNullAndCreatedAtBefore(Instant cutoff);
    List<PredictionLog> findByEvaluatedAtIsNotNull();
    List<PredictionLog> findByEvaluatedAtIsNull();
    List<PredictionLog> findBySymbolAndEvaluatedAtIsNotNullOrderByCreatedAtDesc(String symbol);
}
