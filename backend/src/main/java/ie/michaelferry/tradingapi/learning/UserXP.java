package ie.michaelferry.tradingapi.learning;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "user_xp")
public class UserXP {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    private int totalXp;

    @Column(nullable = false)
    private int currentStreak;

    private LocalDate lastActivityDate;

    @Column(nullable = false, length = 20)
    private String skillLevel;

    @PrePersist
    protected void onCreate() {
        if (this.skillLevel == null) this.skillLevel = "Beginner";
        if (this.totalXp == 0) this.currentStreak = 0;
    }

    public void recalculateSkillLevel() {
        if (totalXp >= 1000) {
            skillLevel = "Expert";
        } else if (totalXp >= 300) {
            skillLevel = "Intermediate";
        } else {
            skillLevel = "Beginner";
        }
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public int getTotalXp() { return totalXp; }
    public void setTotalXp(int totalXp) { this.totalXp = totalXp; }
    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }
    public LocalDate getLastActivityDate() { return lastActivityDate; }
    public void setLastActivityDate(LocalDate lastActivityDate) { this.lastActivityDate = lastActivityDate; }
    public String getSkillLevel() { return skillLevel; }
    public void setSkillLevel(String skillLevel) { this.skillLevel = skillLevel; }
}
