package ie.michaelferry.tradingapi.learning;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LearningProgressRepository extends JpaRepository<LearningProgress, Long> {
    List<LearningProgress> findByUserId(Long userId);
    Optional<LearningProgress> findByUserIdAndLessonId(Long userId, String lessonId);
    long countByUserIdAndCompletedTrue(Long userId);
}
