package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.models.Trade;
import ie.michaelferry.tradingapi.models.Portfolio;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TradingService {

    private final ConcurrentHashMap<String, Portfolio> portfolios = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<Trade>> tradeHistories = new ConcurrentHashMap<>();
    private final FinnhubClient finnhubClient;

    public TradingService(FinnhubClient finnhubClient) {
        this.finnhubClient = finnhubClient;
    }

    private Portfolio getPortfolio(String username) {
        return portfolios.computeIfAbsent(username, k -> new Portfolio(100000.0));
    }

    private List<Trade> getTradesForUser(String username) {
        return tradeHistories.computeIfAbsent(username, k -> new ArrayList<>());
    }

    public Map<String, Object> executeBuy(String username, String symbol, int quantity) {
        Portfolio portfolio = getPortfolio(username);
        double currentPrice = finnhubClient.fetchLivePrice(symbol);

        if (currentPrice <= 0) {
            return Map.of("error", "Unable to fetch price for " + symbol);
        }

        double totalCost = currentPrice * quantity;

        if (totalCost > portfolio.getCashBalance()) {
            return Map.of("error", "Insufficient funds", "required", totalCost, "available", portfolio.getCashBalance());
        }

        portfolio.setCashBalance(portfolio.getCashBalance() - totalCost);
        portfolio.addHolding(symbol, quantity);

        Trade trade = new Trade(symbol, "BUY", currentPrice, quantity);
        getTradesForUser(username).add(trade);

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
            "portfolio", getPortfolioSummary(username)
        );
    }

    public Map<String, Object> executeSell(String username, String symbol, int quantity) {
        Portfolio portfolio = getPortfolio(username);
        int currentHolding = portfolio.getHoldings().getOrDefault(symbol, 0);

        if (currentHolding < quantity) {
            return Map.of("error", "Insufficient shares", "available", currentHolding, "requested", quantity);
        }

        double currentPrice = finnhubClient.fetchLivePrice(symbol);

        if (currentPrice <= 0) {
            return Map.of("error", "Unable to fetch price for " + symbol);
        }

        double totalValue = currentPrice * quantity;

        portfolio.setCashBalance(portfolio.getCashBalance() + totalValue);
        portfolio.removeHolding(symbol, quantity);

        Trade trade = new Trade(symbol, "SELL", currentPrice, quantity);
        getTradesForUser(username).add(trade);

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
            "portfolio", getPortfolioSummary(username)
        );
    }

    public Map<String, Object> getPortfolioSummary(String username) {
        Portfolio portfolio = getPortfolio(username);
        double holdingsValue = 0;
        List<Map<String, Object>> positions = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : portfolio.getHoldings().entrySet()) {
            if (entry.getValue() > 0) {
                String symbol = entry.getKey();
                int quantity = entry.getValue();
                double currentPrice = finnhubClient.fetchLivePrice(symbol);
                double value = currentPrice * quantity;
                holdingsValue += value;

                positions.add(Map.of(
                    "symbol", symbol,
                    "quantity", quantity,
                    "currentPrice", currentPrice,
                    "value", value
                ));
            }
        }

        double totalValue = portfolio.getCashBalance() + holdingsValue;
        portfolio.setTotalValue(totalValue);

        return Map.of(
            "cashBalance", portfolio.getCashBalance(),
            "holdingsValue", holdingsValue,
            "totalValue", totalValue,
            "positions", positions,
            "tradeCount", getTradesForUser(username).size()
        );
    }

    public List<Trade> getTradeHistory(String username) {
        return new ArrayList<>(getTradesForUser(username));
    }
}
