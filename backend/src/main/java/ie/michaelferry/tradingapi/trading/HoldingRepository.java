package ie.michaelferry.tradingapi.trading;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<HoldingEntity, Long> {
    List<HoldingEntity> findByUserId(Long userId);
    Optional<HoldingEntity> findByUserIdAndSymbol(Long userId, String symbol);
}
