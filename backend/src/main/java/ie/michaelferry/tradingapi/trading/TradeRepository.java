package ie.michaelferry.tradingapi.trading;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TradeRepository extends JpaRepository<TradeEntity, Long> {
    List<TradeEntity> findByUserIdOrderByTimestampDesc(Long userId);
    long countByUserId(Long userId);
}
