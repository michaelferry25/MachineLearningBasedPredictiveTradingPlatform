package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Component
public class FinnhubClient {

    private final String apiKey = System.getenv("FINNHUB_API_KEY");
    private final RestTemplate restTemplate = new RestTemplate();

    public double fetchLivePrice(String symbol) {

        if (apiKey == null || apiKey.isEmpty()) {
            System.out.println(" FINNHUB_API_KEY not found");
            return -1;
        }

        try {
            String url = "https://finnhub.io/api/v1/quote?symbol="
                    + symbol + "&token=" + apiKey;

            Map<String, Object> json = restTemplate.getForObject(url, Map.class);

            if (json == null || json.get("c") == null) {
                return -1;
            }

            return Double.parseDouble(json.get("c").toString());

        } catch (Exception e) {
            System.out.println("Error calling Finnhub: " + e.getMessage());
            return -1;
        }
    }
}
