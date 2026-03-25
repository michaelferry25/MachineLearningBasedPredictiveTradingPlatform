package ie.michaelferry.tradingapi.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByRole(UserRole role);

    List<UserAccount> findByEmailContainingIgnoreCase(String email);

    long countByCreatedAtAfter(Instant after);

    List<UserAccount> findAllByOrderByCreatedAtDesc();
}
