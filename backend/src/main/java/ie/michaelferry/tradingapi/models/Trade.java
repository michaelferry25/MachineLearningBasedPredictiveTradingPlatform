package ie.michaelferry.tradingapi.models;

import java.time.LocalDateTime;

public class Trade {
    private String symbol;
    private String type;
    private double price;
    private int quantity;
    private LocalDateTime timestamp;
    private double totalValue;

    public Trade(String symbol, String type, double price, int quantity) {
        this.symbol = symbol;
        this.type = type;
        this.price = price;
        this.quantity = quantity;
        this.timestamp = LocalDateTime.now();
        this.totalValue = price * quantity;
    }

    public String getSymbol() { return symbol; }
    public String getType() { return type; }
    public double getPrice() { return price; }
    public int getQuantity() { return quantity; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public double getTotalValue() { return totalValue; }
}