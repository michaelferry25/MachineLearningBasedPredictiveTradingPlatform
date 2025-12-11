package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;

@Service
public class HistoricalPriceService {

    private final HttpClient client = HttpClient.newHttpClient();

    public Map<String, Object> getHistoricalPrices(String symbol) {
        try {
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/"
                    + symbol.toUpperCase()
                    + "?interval=1d&range=1mo";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/5.0")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return parseYahooJson(response.body(), symbol);

        } catch (Exception e) {
            return Map.of("error", "Failed to fetch Yahoo data: " + e.getMessage());
        }
    }

    private Map<String, Object> parseYahooJson(String json, String symbol) {
        try {
            // Extract timestamps
            List<Long> timestamps = extractLongList(json, "\"timestamp\":[");
            // Extract closing prices
            List<Double> closes = extractDoubleList(json, "\"close\":[");
            
            if (timestamps.isEmpty() || closes.isEmpty()) {
                return empty(symbol);
            }

            return Map.of(
                    "symbol", symbol.toUpperCase(),
                    "timestamps", timestamps,
                    "prices", closes
            );

        } catch (Exception e) {
            return empty(symbol);
        }
    }

    private List<Long> extractLongList(String json, String key) {
        int start = json.indexOf(key);
        if (start == -1) return List.of();
        start += key.length();
        int end = json.indexOf("]", start);

        String[] parts = json.substring(start, end).split(",");
        List<Long> list = new ArrayList<>();
        for (String p : parts) {
            if (!p.isBlank()) list.add(Long.parseLong(p.trim()));
        }
        return list;
    }

    private List<Double> extractDoubleList(String json, String key) {
        int start = json.indexOf(key);
        if (start == -1) return List.of();
        start += key.length();
        int end = json.indexOf("]", start);

        String[] parts = json.substring(start, end).split(",");
        List<Double> list = new ArrayList<>();
        for (String p : parts) {
            if (!p.isBlank() && !p.trim().equals("null"))
                list.add(Double.parseDouble(p.trim()));
        }
        return list;
    }

    private Map<String, Object> empty(String symbol) {
        return Map.of(
                "symbol", symbol.toUpperCase(),
                "timestamps", List.of(),
                "prices", List.of()
        );
    }
}
