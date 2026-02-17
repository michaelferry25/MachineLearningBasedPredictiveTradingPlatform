package ie.michaelferry.tradingapi.trading;

import jakarta.persistence.*;

@Entity
@Table(name = "user_cash_balances")
public class UserCashBalance {

    @Id
    private Long userId;

    @Column(nullable = false)
    private double balance;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public double getBalance() { return balance; }
    public void setBalance(double balance) { this.balance = balance; }
}
