package ie.michaelferry.tradingapi.models;

public class StockResponse {
    private String symbol;
    private double price;
    private String source;

    public StockResponse(String symbol, double price, String source) {
        this.symbol = symbol;
        this.price = price;
        this.source = source;
    }

    public String getSymbol() {
        return symbol;
    }

    public double getPrice() {
        return price;
    }

    public String getSource() {
        return source;
    }
}
