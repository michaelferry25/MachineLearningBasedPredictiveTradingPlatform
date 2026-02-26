package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class FinnhubClient {

    private final RestTemplate rest = new RestTemplate();
    private final String apiKey;

    public FinnhubClient() {
        this.apiKey = System.getenv("FINNHUB_API_KEY");
    }

    public double fetchLivePrice(String symbol) {
        try {
            String url = "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + apiKey;

            Map<String, Object> response = rest.getForObject(url, Map.class);
            if (response == null || response.get("c") == null) return -1;

            return ((Number) response.get("c")).doubleValue();
        } catch (Exception e) {
            return -1;
        }
    }

    public Map<String, Object> fetchFullQuote(String symbol) {
        try {
            String url = "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + apiKey;

            Map<String, Object> response = rest.getForObject(url, Map.class);
            if (response == null || response.get("c") == null) return null;

            double price = ((Number) response.get("c")).doubleValue();
            double change = response.get("d") != null ? ((Number) response.get("d")).doubleValue() : 0;
            double changePercent = response.get("dp") != null ? ((Number) response.get("dp")).doubleValue() : 0;

            return Map.of("price", price, "change", change, "changePercent", changePercent);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<String, Object> fetchHistoricalPrices(String symbol) {
        try {
            long now = System.currentTimeMillis() / 1000;
            long from = now - (7 * 24 * 60 * 60); // 7 days

            String url = "https://finnhub.io/api/v1/stock/candle?symbol=" + symbol +
                    "&resolution=60&from=" + from +
                    "&to=" + now +
                    "&token=" + apiKey;

            return rest.getForObject(url, Map.class);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<String, Object> fetchHistoricalPrices(String symbol, String resolution, long from, long to) {
        try {
            String url = "https://finnhub.io/api/v1/stock/candle?symbol=" + symbol +
                    "&resolution=" + resolution +
                    "&from=" + from +
                    "&to=" + to +
                    "&token=" + apiKey;

            return rest.getForObject(url, Map.class);
        } catch (Exception e) {
            return null;
        }
    }
}
