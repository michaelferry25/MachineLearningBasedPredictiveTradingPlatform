package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class FinnhubClient {

    private final RestTemplate rest = new RestTemplate();
    private final String apiKey;

    public FinnhubClient() {
        // Reads from your .env because Mac exports variables into shell env
        this.apiKey = System.getenv("FINNHUB_API_KEY");
        System.out.println("FinnhubClient loaded API key: " + apiKey);
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
}
