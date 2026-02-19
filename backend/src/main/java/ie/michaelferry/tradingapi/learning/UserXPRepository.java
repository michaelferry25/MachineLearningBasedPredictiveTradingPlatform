package ie.michaelferry.tradingapi.learning;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserXPRepository extends JpaRepository<UserXP, Long> {
    Optional<UserXP> findByUserId(Long userId);
}
