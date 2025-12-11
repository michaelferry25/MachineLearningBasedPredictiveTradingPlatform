package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.models.HistoricalPriceResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class HistoricalPriceService {

    @Value("${FINNHUB_API_KEY}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public HistoricalPriceResponse getHistoricalPrices(String symbol) {

        long now = System.currentTimeMillis() / 1000;
        long from = now - (7 * 24 * 60 * 60); // 7-day history

        String url = "https://finnhub.io/api/v1/stock/candle?symbol=" + symbol +
                "&resolution=60&from=" + from +
                "&to=" + now +
                "&token=" + apiKey;

        Map<String, Object> response = restTemplate.getForObject(url, Map.class);

        if (response == null || !"ok".equals(response.get("s"))) {
            return new HistoricalPriceResponse(symbol, List.of(), List.of());
        }

        List<Long> timestamps = (List<Long>) response.get("t");
        List<Double> prices = (List<Double>) response.get("c");

        return new HistoricalPriceResponse(symbol, timestamps, prices);
    }
}
