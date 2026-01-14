package ie.michaelferry.tradingapi.models;

import java.util.HashMap;
import java.util.Map;

public class Portfolio {
    private double cashBalance;
    private Map<String, Integer> holdings;
    private double totalValue;

    public Portfolio(double initialCash) {
        this.cashBalance = initialCash;
        this.holdings = new HashMap<>();
        this.totalValue = initialCash;
    }

    public double getCashBalance() { return cashBalance; }
    public void setCashBalance(double cashBalance) { this.cashBalance = cashBalance; }
    
    public Map<String, Integer> getHoldings() { return holdings; }
    
    public void addHolding(String symbol, int quantity) {
        holdings.put(symbol, holdings.getOrDefault(symbol, 0) + quantity);
    }
    
    public void removeHolding(String symbol, int quantity) {
        int current = holdings.getOrDefault(symbol, 0);
        if (current >= quantity) {
            holdings.put(symbol, current - quantity);
        }
    }
    
    public double getTotalValue() { return totalValue; }
    public void setTotalValue(double totalValue) { this.totalValue = totalValue; }
}