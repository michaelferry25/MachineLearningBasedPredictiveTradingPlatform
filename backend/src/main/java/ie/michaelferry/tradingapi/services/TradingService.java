package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.auth.UserAccount;
import ie.michaelferry.tradingapi.auth.UserRepository;
import ie.michaelferry.tradingapi.trading.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class TradingService {

    private static final double INITIAL_CASH = 100_000.0;

    private final FinnhubClient finnhubClient;
    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final HoldingRepository holdingRepository;
    private final PortfolioSnapshotRepository snapshotRepository;
    private final UserCashBalanceRepository cashBalanceRepository;

    public TradingService(FinnhubClient finnhubClient,
                          UserRepository userRepository,
                          TradeRepository tradeRepository,
                          HoldingRepository holdingRepository,
                          PortfolioSnapshotRepository snapshotRepository,
                          UserCashBalanceRepository cashBalanceRepository) {
        this.finnhubClient = finnhubClient;
        this.userRepository = userRepository;
        this.tradeRepository = tradeRepository;
        this.holdingRepository = holdingRepository;
        this.snapshotRepository = snapshotRepository;
        this.cashBalanceRepository = cashBalanceRepository;
    }

    private Long resolveUserId(String email) {
        UserAccount user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return user.getId();
    }

    private double getCashBalance(Long userId) {
        return cashBalanceRepository.findById(userId)
                .map(UserCashBalance::getBalance)
                .orElse(INITIAL_CASH);
    }

    private void setCashBalance(Long userId, double balance) {
        UserCashBalance cash = cashBalanceRepository.findById(userId).orElseGet(() -> {
            UserCashBalance c = new UserCashBalance();
            c.setUserId(userId);
            return c;
        });
        cash.setBalance(balance);
        cashBalanceRepository.save(cash);
    }

    @Transactional
    public Map<String, Object> executeBuy(String email, String symbol, int quantity) {
        Long userId = resolveUserId(email);
        double currentPrice = finnhubClient.fetchLivePrice(symbol);

        if (currentPrice <= 0) {
            return Map.of("error", "Unable to fetch price for " + symbol);
        }

        double totalCost = currentPrice * quantity;
        double cash = getCashBalance(userId);

        if (totalCost > cash) {
            return Map.of("error", "Insufficient funds", "required", totalCost, "available", cash);
        }

        setCashBalance(userId, cash - totalCost);

        Optional<HoldingEntity> existingHolding = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        if (existingHolding.isPresent()) {
            HoldingEntity h = existingHolding.get();
            double oldTotal = h.getAvgPrice() * h.getQuantity();
            int newQty = h.getQuantity() + quantity;
            h.setAvgPrice((oldTotal + totalCost) / newQty);
            h.setQuantity(newQty);
            holdingRepository.save(h);
        } else {
            HoldingEntity h = new HoldingEntity();
            h.setUserId(userId);
            h.setSymbol(symbol);
            h.setQuantity(quantity);
            h.setAvgPrice(currentPrice);
            holdingRepository.save(h);
        }

        TradeEntity trade = new TradeEntity();
        trade.setUserId(userId);
        trade.setSymbol(symbol);
        trade.setType("BUY");
        trade.setPrice(currentPrice);
        trade.setQuantity(quantity);
        trade.setTotalValue(totalCost);
        tradeRepository.save(trade);

        recordSnapshot(userId);

        return Map.of(
            "success", true,
            "message", "Bought " + quantity + " shares of " + symbol,
            "trade", Map.of(
                "symbol", symbol,
                "type", "BUY",
                "price", currentPrice,
                "quantity", quantity,
                "total", totalCost
            ),
            "portfolio", getPortfolioSummary(email)
        );
    }

    @Transactional
    public Map<String, Object> executeSell(String email, String symbol, int quantity) {
        Long userId = resolveUserId(email);

        Optional<HoldingEntity> existingHolding = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        int currentQty = existingHolding.map(HoldingEntity::getQuantity).orElse(0);

        if (currentQty < quantity) {
            return Map.of("error", "Insufficient shares", "available", currentQty, "requested", quantity);
        }

        double currentPrice = finnhubClient.fetchLivePrice(symbol);

        if (currentPrice <= 0) {
            return Map.of("error", "Unable to fetch price for " + symbol);
        }

        double totalValue = currentPrice * quantity;
        double cash = getCashBalance(userId);
        setCashBalance(userId, cash + totalValue);

        HoldingEntity h = existingHolding.get();
        int newQty = h.getQuantity() - quantity;
        if (newQty == 0) {
            holdingRepository.delete(h);
        } else {
            h.setQuantity(newQty);
            holdingRepository.save(h);
        }

        TradeEntity trade = new TradeEntity();
        trade.setUserId(userId);
        trade.setSymbol(symbol);
        trade.setType("SELL");
        trade.setPrice(currentPrice);
        trade.setQuantity(quantity);
        trade.setTotalValue(totalValue);
        tradeRepository.save(trade);

        recordSnapshot(userId);

        return Map.of(
            "success", true,
            "message", "Sold " + quantity + " shares of " + symbol,
            "trade", Map.of(
                "symbol", symbol,
                "type", "SELL",
                "price", currentPrice,
                "quantity", quantity,
                "total", totalValue
            ),
            "portfolio", getPortfolioSummary(email)
        );
    }

    public Map<String, Object> getPortfolioSummary(String email) {
        Long userId = resolveUserId(email);
        double cash = getCashBalance(userId);
        double holdingsValue = 0;
        List<Map<String, Object>> positions = new ArrayList<>();

        List<HoldingEntity> holdings = holdingRepository.findByUserId(userId);
        for (HoldingEntity h : holdings) {
            if (h.getQuantity() > 0) {
                double currentPrice = finnhubClient.fetchLivePrice(h.getSymbol());
                double value = currentPrice * h.getQuantity();
                holdingsValue += value;

                positions.add(Map.of(
                    "symbol", h.getSymbol(),
                    "quantity", h.getQuantity(),
                    "avgPrice", h.getAvgPrice(),
                    "currentPrice", currentPrice,
                    "value", value,
                    "pnl", (currentPrice - h.getAvgPrice()) * h.getQuantity()
                ));
            }
        }

        double totalValue = cash + holdingsValue;
        long tradeCount = tradeRepository.countByUserId(userId);

        return Map.of(
            "cashBalance", cash,
            "holdingsValue", holdingsValue,
            "totalValue", totalValue,
            "positions", positions,
            "tradeCount", tradeCount
        );
    }

    public List<Map<String, Object>> getTradeHistory(String email) {
        Long userId = resolveUserId(email);
        List<TradeEntity> trades = tradeRepository.findByUserIdOrderByTimestampDesc(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (TradeEntity t : trades) {
            result.add(Map.of(
                "symbol", t.getSymbol(),
                "type", t.getType(),
                "price", t.getPrice(),
                "quantity", t.getQuantity(),
                "totalValue", t.getTotalValue(),
                "timestamp", t.getTimestamp().toString()
            ));
        }
        return result;
    }

    public Map<String, Object> getPerformanceMetrics(String email) {
        Long userId = resolveUserId(email);
        double cash = getCashBalance(userId);

        List<HoldingEntity> holdings = holdingRepository.findByUserId(userId);
        double holdingsValue = 0;
        for (HoldingEntity h : holdings) {
            holdingsValue += finnhubClient.fetchLivePrice(h.getSymbol()) * h.getQuantity();
        }
        double totalValue = cash + holdingsValue;
        double totalReturn = ((totalValue - INITIAL_CASH) / INITIAL_CASH) * 100;

        long tradeCount = tradeRepository.countByUserId(userId);

        List<PortfolioSnapshotEntity> snapshots = snapshotRepository.findByUserIdOrderBySnapshotAtAsc(userId);
        List<Map<String, Object>> equityCurve = new ArrayList<>();
        for (PortfolioSnapshotEntity s : snapshots) {
            equityCurve.add(Map.of(
                "timestamp", s.getSnapshotAt().toString(),
                "value", s.getTotalValue()
            ));
        }

        double bestTrade = 0, worstTrade = 0;
        List<TradeEntity> trades = tradeRepository.findByUserIdOrderByTimestampDesc(userId);
        for (TradeEntity t : trades) {
            // Only SELL trades have realized P&L
            if ("SELL".equals(t.getType())) {
                double sellValue = t.getTotalValue();
                if (sellValue > bestTrade) bestTrade = sellValue;
                if (worstTrade == 0 || sellValue < worstTrade) worstTrade = sellValue;
            }
        }

        return Map.of(
            "totalValue", totalValue,
            "totalReturn", totalReturn,
            "tradeCount", tradeCount,
            "bestTrade", bestTrade,
            "worstTrade", worstTrade,
            "equityCurve", equityCurve
        );
    }

    private void recordSnapshot(Long userId) {
        double cash = getCashBalance(userId);
        double holdingsValue = 0;
        for (HoldingEntity h : holdingRepository.findByUserId(userId)) {
            holdingsValue += finnhubClient.fetchLivePrice(h.getSymbol()) * h.getQuantity();
        }

        PortfolioSnapshotEntity snapshot = new PortfolioSnapshotEntity();
        snapshot.setUserId(userId);
        snapshot.setTotalValue(cash + holdingsValue);
        snapshotRepository.save(snapshot);
    }
}
