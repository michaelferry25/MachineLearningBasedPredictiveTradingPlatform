package ie.michaelferry.tradingapi.models;

public class StockResponse {
    private String symbol;
    private double price;
    private double change;
    private double changePercent;
    private String source;

    public StockResponse(String symbol, double price, double change, double changePercent, String source) {
        this.symbol = symbol;
        this.price = price;
        this.change = change;
        this.changePercent = changePercent;
        this.source = source;
    }

    public String getSymbol() {
        return symbol;
    }

    public double getPrice() {
        return price;
    }

    public double getChange() {
        return change;
    }

    public double getChangePercent() {
        return changePercent;
    }

    public String getSource() {
        return source;
    }
}
