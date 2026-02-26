package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.models.StockResponse;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class StockService {

    private final FinnhubClient finnhub;

    public StockService(FinnhubClient finnhub) {
        this.finnhub = finnhub;
    }

    public StockResponse getStockPrice(String symbol) {

        Map<String, Object> quote = finnhub.fetchFullQuote(symbol);

        if (quote == null) {
            return new StockResponse(
                    symbol.toUpperCase(),
                    -1,
                    0,
                    0,
                    "Error fetching live data"
            );
        }

        return new StockResponse(
                symbol.toUpperCase(),
                (double) quote.get("price"),
                (double) quote.get("change"),
                (double) quote.get("changePercent"),
                "source: finnhub_live"
        );
    }
}
