package ie.michaelferry.tradingapi.models;

import java.util.List;

public class HistoricalPriceResponse {
    private String symbol;
    private List<Long> timestamps;
    private List<Double> prices;

    public HistoricalPriceResponse(String symbol, List<Long> timestamps, List<Double> prices) {
        this.symbol = symbol;
        this.timestamps = timestamps;
        this.prices = prices;
    }

    public String getSymbol() { return symbol; }
    public List<Long> getTimestamps() { return timestamps; }
    public List<Double> getPrices() { return prices; }
}
