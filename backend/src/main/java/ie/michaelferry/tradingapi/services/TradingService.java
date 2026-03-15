package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.auth.UserAccount;
import ie.michaelferry.tradingapi.auth.UserRepository;
import ie.michaelferry.tradingapi.trading.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.LinkedHashMap;

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
    public Map<String, Object> executeBuy(String email, String symbol, double quantity) {
        if (quantity <= 0) {
            return Map.of("error", "Quantity must be greater than 0");
        }

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
            double newQty = h.getQuantity() + quantity;
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
            "message", "Bought " + formatQty(quantity) + " shares of " + symbol,
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
    public Map<String, Object> executeSell(String email, String symbol, double quantity) {
        if (quantity <= 0) {
            return Map.of("error", "Quantity must be greater than 0");
        }

        Long userId = resolveUserId(email);

        HoldingEntity h = holdingRepository.findByUserIdAndSymbol(userId, symbol).orElse(null);
        double currentQty = h != null ? h.getQuantity() : 0;

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

        double realizedPnl = (currentPrice - h.getAvgPrice()) * quantity;

        double newQty = h.getQuantity() - quantity;
        if (newQty <= 0.000001) {
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
        trade.setPnl(realizedPnl);
        tradeRepository.save(trade);

        recordSnapshot(userId);

        return Map.of(
            "success", true,
            "message", "Sold " + formatQty(quantity) + " shares of " + symbol,
            "trade", Map.of(
                "symbol", symbol,
                "type", "SELL",
                "price", currentPrice,
                "quantity", quantity,
                "total", totalValue,
                "pnl", realizedPnl
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
            if (h.getQuantity() > 0.000001) {
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
            Map<String, Object> tradeMap = new LinkedHashMap<>();
            tradeMap.put("symbol", t.getSymbol());
            tradeMap.put("type", t.getType());
            tradeMap.put("price", t.getPrice());
            tradeMap.put("quantity", t.getQuantity());
            tradeMap.put("totalValue", t.getTotalValue());
            tradeMap.put("pnl", t.getPnl());
            tradeMap.put("timestamp", t.getTimestamp().toString());
            result.add(tradeMap);
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
        boolean hasSells = false;
        List<TradeEntity> trades = tradeRepository.findByUserIdOrderByTimestampDesc(userId);
        for (TradeEntity t : trades) {
            if ("SELL".equals(t.getType())) {
                double tradePnl = t.getPnl();
                if (!hasSells) {
                    bestTrade = tradePnl;
                    worstTrade = tradePnl;
                    hasSells = true;
                } else {
                    if (tradePnl > bestTrade) bestTrade = tradePnl;
                    if (tradePnl < worstTrade) worstTrade = tradePnl;
                }
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

    private String formatQty(double qty) {
        if (qty == Math.floor(qty)) return String.valueOf((long) qty);
        return String.format("%.6f", qty).replaceAll("0+$", "").replaceAll("\\.$", "");
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
