package ie.michaelferry.tradingapi.learning;

import ie.michaelferry.tradingapi.auth.UserAccount;
import ie.michaelferry.tradingapi.auth.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
public class LearningController {

    private final LearningProgressRepository progressRepo;
    private final UserXPRepository xpRepo;
    private final UserRepository userRepository;

    private static final List<String> MODULE_1 = List.of(
            "what-is-a-stock", "how-the-market-works", "buying-and-selling",
            "reading-a-stock-quote", "bull-vs-bear", "what-is-a-portfolio");
    private static final List<String> MODULE_2 = List.of(
            "ai-predictions", "sentiment-analysis", "technical-indicators", "risk-and-reward");
    private static final List<String> MODULE_3 = List.of(
            "how-ai-works", "backtesting", "market-psychology", "building-strategy");
    private static final int TOTAL_LESSONS = MODULE_1.size() + MODULE_2.size() + MODULE_3.size() + 3; // +3 for exams

    public LearningController(LearningProgressRepository progressRepo,
                              UserXPRepository xpRepo,
                              UserRepository userRepository) {
        this.progressRepo = progressRepo;
        this.xpRepo = xpRepo;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/learning/progress")
    public Map<String, Object> getProgress(Authentication auth) {
        Long userId = resolveUserId(auth);
        UserXP xp = xpRepo.findByUserId(userId).orElse(null);
        List<LearningProgress> lessons = progressRepo.findByUserId(userId);

        Set<String> completedIds = lessons.stream()
                .filter(LearningProgress::isCompleted)
                .map(LearningProgress::getLessonId)
                .collect(Collectors.toSet());

        int totalXp = xp != null ? xp.getTotalXp() : 0;
        int streak = xp != null ? xp.getCurrentStreak() : 0;
        String skillLevel = xp != null ? xp.getSkillLevel() : "Beginner";

        List<String> badges = computeBadges(completedIds, streak);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalXp", totalXp);
        result.put("currentStreak", streak);
        result.put("skillLevel", skillLevel);
        result.put("completedLessons", completedIds);
        result.put("completedCount", completedIds.size());
        result.put("totalLessons", TOTAL_LESSONS);
        result.put("badges", badges);
        return result;
    }

    @PostMapping("/api/learning/complete")
    public Map<String, Object> completeLesson(@RequestBody Map<String, Object> request,
                                              Authentication auth) {
        Long userId = resolveUserId(auth);
        String lessonId = (String) request.get("lessonId");
        int xpAmount = ((Number) request.get("xp")).intValue();

        if (lessonId == null || lessonId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lessonId is required");
        }

        Optional<LearningProgress> existing = progressRepo.findByUserIdAndLessonId(userId, lessonId);
        if (existing.isPresent() && existing.get().isCompleted()) {
            return Map.of("message", "Already completed", "xpAwarded", 0);
        }

        LearningProgress progress = existing.orElseGet(() -> {
            LearningProgress lp = new LearningProgress();
            lp.setUserId(userId);
            lp.setLessonId(lessonId);
            return lp;
        });
        progress.setCompleted(true);
        progress.setXpEarned(xpAmount);
        progressRepo.save(progress);

        UserXP xp = xpRepo.findByUserId(userId).orElseGet(() -> {
            UserXP newXp = new UserXP();
            newXp.setUserId(userId);
            newXp.setTotalXp(0);
            newXp.setCurrentStreak(0);
            newXp.setSkillLevel("Beginner");
            return newXp;
        });

        xp.setTotalXp(xp.getTotalXp() + xpAmount);

        LocalDate today = LocalDate.now();
        LocalDate lastActivity = xp.getLastActivityDate();
        if (lastActivity == null) {
            xp.setCurrentStreak(1);
        } else if (lastActivity.equals(today.minusDays(1))) {
            xp.setCurrentStreak(xp.getCurrentStreak() + 1);
        } else if (!lastActivity.equals(today)) {
            xp.setCurrentStreak(1);
        }
        xp.setLastActivityDate(today);
        xp.recalculateSkillLevel();
        xpRepo.save(xp);

        Set<String> completedIds = progressRepo.findByUserId(userId).stream()
                .filter(LearningProgress::isCompleted)
                .map(LearningProgress::getLessonId)
                .collect(Collectors.toSet());

        List<String> badges = computeBadges(completedIds, xp.getCurrentStreak());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Lesson completed!");
        result.put("xpAwarded", xpAmount);
        result.put("totalXp", xp.getTotalXp());
        result.put("currentStreak", xp.getCurrentStreak());
        result.put("skillLevel", xp.getSkillLevel());
        result.put("badges", badges);
        result.put("completedLessons", completedIds);
        return result;
    }

    private Long resolveUserId(Authentication auth) {
        UserAccount user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return user.getId();
    }

    private List<String> computeBadges(Set<String> completedIds, int streak) {
        List<String> badges = new ArrayList<>();
        int count = completedIds.size();

        if (count >= 1) badges.add("First Steps");
        if (count >= 5) badges.add("Getting Started");
        if (count >= TOTAL_LESSONS) badges.add("Scholar");

        if (completedIds.containsAll(MODULE_1)) badges.add("Market Basics");
        if (completedIds.containsAll(MODULE_2)) badges.add("Data Whiz");
        if (completedIds.containsAll(MODULE_3)) badges.add("Market Pro");

        if (streak >= 7) badges.add("On Fire");
        if (streak >= 30) badges.add("Dedicated");

        return badges;
    }
}
