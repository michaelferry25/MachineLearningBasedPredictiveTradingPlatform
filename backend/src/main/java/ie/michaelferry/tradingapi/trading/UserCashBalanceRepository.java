package ie.michaelferry.tradingapi.trading;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserCashBalanceRepository extends JpaRepository<UserCashBalance, Long> {
}
