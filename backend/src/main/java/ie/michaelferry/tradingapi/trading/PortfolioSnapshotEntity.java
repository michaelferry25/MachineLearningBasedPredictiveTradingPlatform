package ie.michaelferry.tradingapi.trading;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "portfolio_snapshots")
public class PortfolioSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private double totalValue;

    @Column(nullable = false)
    private Instant snapshotAt;

    @PrePersist
    protected void onCreate() {
        if (this.snapshotAt == null) this.snapshotAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public double getTotalValue() { return totalValue; }
    public void setTotalValue(double totalValue) { this.totalValue = totalValue; }
    public Instant getSnapshotAt() { return snapshotAt; }
    public void setSnapshotAt(Instant snapshotAt) { this.snapshotAt = snapshotAt; }
}
