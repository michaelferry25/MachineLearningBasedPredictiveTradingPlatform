package ie.michaelferry.tradingapi.admin;

import ie.michaelferry.tradingapi.auth.UserAccount;
import ie.michaelferry.tradingapi.auth.UserRepository;
import ie.michaelferry.tradingapi.auth.UserRole;
import ie.michaelferry.tradingapi.learning.UserXP;
import ie.michaelferry.tradingapi.learning.UserXPRepository;
import ie.michaelferry.tradingapi.ml.PredictionLog;
import ie.michaelferry.tradingapi.ml.PredictionLogRepository;
import ie.michaelferry.tradingapi.trading.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final double INITIAL_CASH = 100_000.0;

    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final HoldingRepository holdingRepository;
    private final PredictionLogRepository predictionLogRepository;
    private final UserCashBalanceRepository cashBalanceRepository;
    private final UserXPRepository userXPRepository;

    public AdminService(UserRepository userRepository,
                        TradeRepository tradeRepository,
                        HoldingRepository holdingRepository,
                        PredictionLogRepository predictionLogRepository,
                        UserCashBalanceRepository cashBalanceRepository,
                        UserXPRepository userXPRepository) {
        this.userRepository = userRepository;
        this.tradeRepository = tradeRepository;
        this.holdingRepository = holdingRepository;
        this.predictionLogRepository = predictionLogRepository;
        this.cashBalanceRepository = cashBalanceRepository;
        this.userXPRepository = userXPRepository;
    }

    // ─── Platform Stats ───

    public Map<String, Object> getPlatformStats() {
        Instant now = Instant.now();
        Instant todayStart = now.truncatedTo(ChronoUnit.DAYS);
        Instant weekAgo = now.minus(7, ChronoUnit.DAYS);

        long totalUsers = userRepository.count();
        long adminCount = userRepository.countByRole(UserRole.ADMIN);
        long newUsersToday = userRepository.countByCreatedAtAfter(todayStart);
        long newUsersThisWeek = userRepository.countByCreatedAtAfter(weekAgo);

        long totalTrades = tradeRepository.count();
        long tradesToday = tradeRepository.countByTimestampAfter(todayStart);
        long tradesThisWeek = tradeRepository.countByTimestampAfter(weekAgo);

        long totalPredictions = predictionLogRepository.count();
        long evaluatedPredictions = predictionLogRepository.countByEvaluatedAtIsNotNull();
        long hitCount = predictionLogRepository.countByHitTrue();
        long missCount = predictionLogRepository.countByHitFalse();
        double hitRate = evaluatedPredictions > 0 ? (double) hitCount / evaluatedPredictions * 100 : 0;
        long predictionsToday = predictionLogRepository.countByCreatedAtAfter(todayStart);

        // Total AUM (assets under management) across all users
        double totalAUM = 0;
        List<UserAccount> allUsers = userRepository.findAll();
        for (UserAccount user : allUsers) {
            double cash = cashBalanceRepository.findById(user.getId())
                    .map(UserCashBalance::getBalance)
                    .orElse(INITIAL_CASH);
            totalAUM += cash;
            List<HoldingEntity> holdings = holdingRepository.findByUserId(user.getId());
            for (HoldingEntity h : holdings) {
                totalAUM += h.getQuantity() * h.getAvgPrice(); // Use avg price to avoid API calls
            }
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("adminCount", adminCount);
        stats.put("newUsersToday", newUsersToday);
        stats.put("newUsersThisWeek", newUsersThisWeek);
        stats.put("totalTrades", totalTrades);
        stats.put("tradesToday", tradesToday);
        stats.put("tradesThisWeek", tradesThisWeek);
        stats.put("totalPredictions", totalPredictions);
        stats.put("evaluatedPredictions", evaluatedPredictions);
        stats.put("hitCount", hitCount);
        stats.put("missCount", missCount);
        stats.put("hitRate", Math.round(hitRate * 100.0) / 100.0);
        stats.put("predictionsToday", predictionsToday);
        stats.put("totalAUM", Math.round(totalAUM * 100.0) / 100.0);
        return stats;
    }

    // ─── User Management ───

    public List<Map<String, Object>> getAllUsers(String search) {
        List<UserAccount> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCase(search.trim());
        } else {
            users = userRepository.findAllByOrderByCreatedAtDesc();
        }

        return users.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("displayName", u.getDisplayName());
            m.put("role", u.getRole().name());
            m.put("createdAt", u.getCreatedAt().toString());
            m.put("updatedAt", u.getUpdatedAt().toString());
            m.put("tradeCount", tradeRepository.countByUserId(u.getId()));
            double cash = cashBalanceRepository.findById(u.getId())
                    .map(UserCashBalance::getBalance)
                    .orElse(INITIAL_CASH);
            m.put("cashBalance", Math.round(cash * 100.0) / 100.0);
            List<HoldingEntity> holdings = holdingRepository.findByUserId(u.getId());
            m.put("holdingCount", holdings.size());
            return m;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> getUserDetail(Long userId) {
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("id", user.getId());
        detail.put("email", user.getEmail());
        detail.put("displayName", user.getDisplayName());
        detail.put("role", user.getRole().name());
        detail.put("createdAt", user.getCreatedAt().toString());
        detail.put("updatedAt", user.getUpdatedAt().toString());

        // Cash & holdings
        double cash = cashBalanceRepository.findById(user.getId())
                .map(UserCashBalance::getBalance)
                .orElse(INITIAL_CASH);
        detail.put("cashBalance", Math.round(cash * 100.0) / 100.0);

        List<HoldingEntity> holdings = holdingRepository.findByUserId(user.getId());
        List<Map<String, Object>> holdingsList = holdings.stream().map(h -> {
            Map<String, Object> hm = new LinkedHashMap<>();
            hm.put("symbol", h.getSymbol());
            hm.put("quantity", h.getQuantity());
            hm.put("avgPrice", h.getAvgPrice());
            return hm;
        }).collect(Collectors.toList());
        detail.put("holdings", holdingsList);

        // Recent trades
        List<TradeEntity> trades = tradeRepository.findByUserIdOrderByTimestampDesc(user.getId());
        List<Map<String, Object>> tradesList = trades.stream().limit(50).map(t -> {
            Map<String, Object> tm = new LinkedHashMap<>();
            tm.put("id", t.getId());
            tm.put("symbol", t.getSymbol());
            tm.put("type", t.getType());
            tm.put("price", t.getPrice());
            tm.put("quantity", t.getQuantity());
            tm.put("totalValue", t.getTotalValue());
            tm.put("pnl", t.getPnl());
            tm.put("timestamp", t.getTimestamp().toString());
            return tm;
        }).collect(Collectors.toList());
        detail.put("trades", tradesList);
        detail.put("tradeCount", trades.size());

        // Learning progress
        try {
            Optional<UserXP> xp = userXPRepository.findByUserId(user.getId());
            detail.put("xp", xp.map(UserXP::getTotalXp).orElse(0));
        } catch (Exception e) {
            detail.put("xp", 0);
        }

        return detail;
    }

    @Transactional
    public Map<String, Object> changeUserRole(Long userId, String newRole) {
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserRole role = UserRole.valueOf(newRole.toUpperCase());
        user.setRole(role);
        userRepository.save(user);

        return Map.of(
            "success", true,
            "message", "Role changed to " + role.name(),
            "userId", userId,
            "newRole", role.name()
        );
    }

    @Transactional
    public Map<String, Object> resetUserPortfolio(Long userId) {
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Reset cash to initial amount
        UserCashBalance cash = cashBalanceRepository.findById(userId).orElseGet(() -> {
            UserCashBalance c = new UserCashBalance();
            c.setUserId(userId);
            return c;
        });
        cash.setBalance(INITIAL_CASH);
        cashBalanceRepository.save(cash);

        // Clear all holdings
        List<HoldingEntity> holdings = holdingRepository.findByUserId(userId);
        holdingRepository.deleteAll(holdings);

        return Map.of(
            "success", true,
            "message", "Portfolio reset for " + user.getDisplayName(),
            "userId", userId,
            "newBalance", INITIAL_CASH
        );
    }

    // ─── Trade Monitor ───

    public Map<String, Object> getAllTrades(String symbol, Integer limit) {
        List<TradeEntity> trades;
        if (symbol != null && !symbol.isBlank()) {
            trades = tradeRepository.findBySymbolOrderByTimestampDesc(symbol.toUpperCase().trim());
        } else {
            trades = tradeRepository.findAllByOrderByTimestampDesc();
        }

        int maxResults = (limit != null && limit > 0) ? Math.min(limit, 500) : 200;
        List<Map<String, Object>> tradesList = trades.stream().limit(maxResults).map(t -> {
            Map<String, Object> tm = new LinkedHashMap<>();
            tm.put("id", t.getId());
            tm.put("userId", t.getUserId());
            tm.put("symbol", t.getSymbol());
            tm.put("type", t.getType());
            tm.put("price", t.getPrice());
            tm.put("quantity", t.getQuantity());
            tm.put("totalValue", t.getTotalValue());
            tm.put("pnl", t.getPnl());
            tm.put("timestamp", t.getTimestamp().toString());

            // Try to resolve username
            userRepository.findById(t.getUserId()).ifPresent(u ->
                tm.put("userEmail", u.getEmail())
            );

            return tm;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trades", tradesList);
        result.put("totalCount", trades.size());
        return result;
    }

    public List<Map<String, Object>> getTradeVolume() {
        List<Object[]> rows = tradeRepository.findTradeVolumeBySymbol();
        return rows.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("symbol", row[0]);
            m.put("tradeCount", row[1]);
            m.put("totalVolume", row[2]);
            return m;
        }).collect(Collectors.toList());
    }

    // ─── Prediction Stats ───

    public Map<String, Object> getPredictionStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        long total = predictionLogRepository.count();
        long evaluated = predictionLogRepository.countByEvaluatedAtIsNotNull();
        long hits = predictionLogRepository.countByHitTrue();
        long misses = predictionLogRepository.countByHitFalse();
        double hitRate = evaluated > 0 ? (double) hits / evaluated * 100 : 0;

        stats.put("totalPredictions", total);
        stats.put("evaluatedPredictions", evaluated);
        stats.put("pendingPredictions", total - evaluated);
        stats.put("hits", hits);
        stats.put("misses", misses);
        stats.put("hitRate", Math.round(hitRate * 100.0) / 100.0);

        // By model
        List<Object[]> byModel = predictionLogRepository.findAccuracyByModel();
        List<Map<String, Object>> modelStats = byModel.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("model", row[0]);
            m.put("count", row[1]);
            long modelHits = ((Number) row[2]).longValue();
            long modelCount = ((Number) row[1]).longValue();
            m.put("hits", modelHits);
            m.put("hitRate", modelCount > 0 ? Math.round((double) modelHits / modelCount * 10000.0) / 100.0 : 0);
            m.put("avgError", row[3] != null ? Math.round(((Number) row[3]).doubleValue() * 100.0) / 100.0 : null);
            return m;
        }).collect(Collectors.toList());
        stats.put("byModel", modelStats);

        // By symbol
        List<Object[]> bySymbol = predictionLogRepository.findAccuracyBySymbol();
        List<Map<String, Object>> symbolStats = bySymbol.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("symbol", row[0]);
            m.put("count", row[1]);
            long symHits = ((Number) row[2]).longValue();
            long symCount = ((Number) row[1]).longValue();
            m.put("hits", symHits);
            m.put("hitRate", symCount > 0 ? Math.round((double) symHits / symCount * 10000.0) / 100.0 : 0);
            m.put("avgError", row[3] != null ? Math.round(((Number) row[3]).doubleValue() * 100.0) / 100.0 : null);
            return m;
        }).collect(Collectors.toList());
        stats.put("bySymbol", symbolStats);

        return stats;
    }

    public List<Map<String, Object>> getRecentPredictions() {
        List<PredictionLog> recent = predictionLogRepository.findTop50ByOrderByCreatedAtDesc();
        return recent.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("symbol", p.getSymbol());
            m.put("model", p.getModel());
            m.put("predictedPrice", p.getPredictedPrice());
            m.put("currentPrice", p.getCurrentPrice());
            m.put("confidence", p.getConfidence());
            m.put("direction", p.getDirection());
            m.put("hit", p.getHit());
            m.put("actualPrice", p.getActualPrice());
            m.put("percentError", p.getPercentError());
            m.put("predictionSource", p.getPredictionSource());
            m.put("createdAt", p.getCreatedAt().toString());
            m.put("evaluatedAt", p.getEvaluatedAt() != null ? p.getEvaluatedAt().toString() : null);
            return m;
        }).collect(Collectors.toList());
    }

    // ─── System Health ───

    public Map<String, Object> getSystemHealth() {
        Map<String, Object> health = new LinkedHashMap<>();

        // DB stats
        health.put("dbUsers", userRepository.count());
        health.put("dbTrades", tradeRepository.count());
        health.put("dbPredictions", predictionLogRepository.count());
        health.put("dbHoldings", holdingRepository.count());

        // JVM stats
        Runtime rt = Runtime.getRuntime();
        health.put("jvmMaxMemoryMB", rt.maxMemory() / (1024 * 1024));
        health.put("jvmTotalMemoryMB", rt.totalMemory() / (1024 * 1024));
        health.put("jvmFreeMemoryMB", rt.freeMemory() / (1024 * 1024));
        health.put("jvmUsedMemoryMB", (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024));
        health.put("availableProcessors", rt.availableProcessors());

        // Uptime
        long uptimeMs = java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime();
        health.put("uptimeSeconds", uptimeMs / 1000);
        health.put("uptimeFormatted", formatUptime(uptimeMs));

        health.put("javaVersion", System.getProperty("java.version"));
        health.put("osName", System.getProperty("os.name"));
        health.put("timestamp", Instant.now().toString());

        return health;
    }

    private String formatUptime(long ms) {
        long seconds = ms / 1000;
        long days = seconds / 86400;
        long hours = (seconds % 86400) / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;
        if (days > 0) return String.format("%dd %dh %dm", days, hours, minutes);
        if (hours > 0) return String.format("%dh %dm %ds", hours, minutes, secs);
        return String.format("%dm %ds", minutes, secs);
    }
}
