package ie.michaelferry.tradingapi.trading;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PortfolioSnapshotRepository extends JpaRepository<PortfolioSnapshotEntity, Long> {
    List<PortfolioSnapshotEntity> findByUserIdOrderBySnapshotAtAsc(Long userId);
}
