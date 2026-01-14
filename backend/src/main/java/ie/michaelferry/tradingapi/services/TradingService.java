package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.models.Trade;
import ie.michaelferry.tradingapi.models.Portfolio;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class TradingService {
    
    private final Portfolio portfolio = new Portfolio(100000.0);
    private final List<Trade> tradeHistory = new ArrayList<>();
    private final FinnhubClient finnhubClient;

    public TradingService(FinnhubClient finnhubClient) {
        this.finnhubClient = finnhubClient;
    }

    public Map<String, Object> executeBuy(String symbol, int quantity) {
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
        tradeHistory.add(trade);
        
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
            "portfolio", getPortfolioSummary()
        );
    }

    public Map<String, Object> executeSell(String symbol, int quantity) {
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
        tradeHistory.add(trade);
        
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
            "portfolio", getPortfolioSummary()
        );
    }

    public Map<String, Object> getPortfolioSummary() {
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
            "tradeCount", tradeHistory.size()
        );
    }

    public List<Trade> getTradeHistory() {
        return new ArrayList<>(tradeHistory);
    }
}