package ie.michaelferry.tradingapi.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;

@Service
public class HistoricalPriceService {

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> getHistoricalPrices(String symbol, String range) {
        try {
            String validRange = range != null && List.of("5d", "1mo", "3mo", "6mo", "1y").contains(range) ? range : "1mo";
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/"
                    + symbol.toUpperCase()
                    + "?interval=1d&range=" + validRange;

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
            JsonNode root = objectMapper.readTree(json);
            JsonNode result = root.path("chart").path("result");

            if (!result.isArray() || result.isEmpty()) {
                return empty(symbol);
            }

            JsonNode first = result.get(0);
            JsonNode timestampNode = first.path("timestamp");
            JsonNode closeNode = first.path("indicators").path("quote").get(0).path("close");

            if (timestampNode.isMissingNode() || closeNode.isMissingNode()) {
                return empty(symbol);
            }

            List<Long> timestamps = new ArrayList<>();
            for (JsonNode ts : timestampNode) {
                timestamps.add(ts.asLong());
            }

            List<Double> closes = new ArrayList<>();
            for (JsonNode c : closeNode) {
                if (!c.isNull()) {
                    closes.add(c.asDouble());
                }
            }

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

    private Map<String, Object> empty(String symbol) {
        return Map.of(
                "symbol", symbol.toUpperCase(),
                "timestamps", List.of(),
                "prices", List.of()
        );
    }
}
