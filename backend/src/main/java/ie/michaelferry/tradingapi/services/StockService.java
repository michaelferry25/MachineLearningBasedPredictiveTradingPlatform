package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.models.StockResponse;
import org.springframework.stereotype.Service;

@Service
public class StockService {

    private final FinnhubClient finnhub;

    public StockService(FinnhubClient finnhub) {
        this.finnhub = finnhub;
    }

    public StockResponse getStockPrice(String symbol) {

        double price = finnhub.fetchLivePrice(symbol);

        if (price == -1) {
            return new StockResponse(
                    symbol.toUpperCase(),
                    -1,
                    "Error fetching live data"
            );
        }

        return new StockResponse(
                symbol.toUpperCase(),
                price,
                "source: finnhub_live"
        );
    }
}
