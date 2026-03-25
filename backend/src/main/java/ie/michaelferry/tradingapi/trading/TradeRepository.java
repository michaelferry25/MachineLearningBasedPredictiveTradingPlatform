package ie.michaelferry.tradingapi.trading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface TradeRepository extends JpaRepository<TradeEntity, Long> {
    List<TradeEntity> findByUserIdOrderByTimestampDesc(Long userId);
    long countByUserId(Long userId);

    // Admin queries
    List<TradeEntity> findAllByOrderByTimestampDesc();
    long countByTimestampAfter(Instant after);
    List<TradeEntity> findBySymbolOrderByTimestampDesc(String symbol);
    List<TradeEntity> findByTimestampAfterOrderByTimestampDesc(Instant after);

    @Query("SELECT t.symbol, COUNT(t), SUM(t.totalValue) FROM TradeEntity t GROUP BY t.symbol ORDER BY COUNT(t) DESC")
    List<Object[]> findTradeVolumeBySymbol();

    @Query("SELECT t.symbol, COUNT(t), SUM(t.totalValue) FROM TradeEntity t WHERE t.timestamp > ?1 GROUP BY t.symbol ORDER BY COUNT(t) DESC")
    List<Object[]> findTradeVolumeBySymbolAfter(Instant after);
}
