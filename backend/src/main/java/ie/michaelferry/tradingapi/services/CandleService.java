package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CandleService {

    private final FinnhubClient finnhubClient;

    public CandleService(FinnhubClient finnhubClient) {
        this.finnhubClient = finnhubClient;
    }

    public Map<String, Object> getCandles(String symbol) {
        Map<String, Object> response = finnhubClient.fetchHistoricalPrices(symbol);
        if (response == null || response.get("s") == null || !"ok".equals(response.get("s"))) {
            return Map.of(
                    "symbol", symbol.toUpperCase(),
                    "candles", List.of(),
                    "error", "Unable to fetch candle data"
            );
        }

        List<Number> opens = (List<Number>) response.get("o");
        List<Number> highs = (List<Number>) response.get("h");
        List<Number> lows = (List<Number>) response.get("l");
        List<Number> closes = (List<Number>) response.get("c");
        List<Number> volumes = (List<Number>) response.get("v");
        List<Number> timestamps = (List<Number>) response.get("t");

        if (opens == null || highs == null || lows == null || closes == null || timestamps == null) {
            return Map.of(
                    "symbol", symbol.toUpperCase(),
                    "candles", List.of(),
                    "error", "Incomplete candle data"
            );
        }

        List<Map<String, Object>> candles = new ArrayList<>();
        for (int i = 0; i < timestamps.size(); i++) {
            Map<String, Object> candle = Map.of(
                    "t", timestamps.get(i),
                    "o", opens.get(i),
                    "h", highs.get(i),
                    "l", lows.get(i),
                    "c", closes.get(i),
                    "v", volumes != null && volumes.size() > i ? volumes.get(i) : 0
            );
            candles.add(candle);
        }

        return Map.of(
                "symbol", symbol.toUpperCase(),
                "candles", candles
        );
    }
}
