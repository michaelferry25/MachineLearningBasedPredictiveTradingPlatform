package ie.michaelferry.tradingapi.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CandleService {

    private final FinnhubClient finnhubClient;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CandleService(FinnhubClient finnhubClient) {
        this.finnhubClient = finnhubClient;
    }

    public Map<String, Object> getCandles(String symbol, String interval, Integer outputsize) {
        String normalizedInterval = interval == null || interval.isBlank() ? "1h" : interval;
        int size = outputsize == null || outputsize < 10 ? 300 : outputsize;
        size = Math.min(size, 500);

        Map<String, Object> response = fetchFromFinnhub(symbol, normalizedInterval, size);
        if (response == null || response.get("s") == null || !"ok".equals(response.get("s"))) {
            Map<String, Object> yahoo = fetchFromYahoo(symbol, normalizedInterval, size);
            if (yahoo != null && yahoo.get("candles") != null) {
                return yahoo;
            }
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

    private Map<String, Object> fetchFromFinnhub(String symbol, String interval, int outputsize) {
        String resolution = switch (interval) {
            case "1min" -> "1";
            case "5min" -> "5";
            case "30min" -> "30";
            case "1h" -> "60";
            case "1day" -> "D";
            default -> "60";
        };

        long secondsPer = switch (interval) {
            case "1min" -> 60;
            case "5min" -> 300;
            case "30min" -> 1800;
            case "1h" -> 3600;
            case "1day" -> 86400;
            default -> 3600;
        };

        long now = Instant.now().getEpochSecond();
        long from = now - (secondsPer * outputsize);
        return finnhubClient.fetchHistoricalPrices(symbol, resolution, from, now);
    }

    private Map<String, Object> fetchFromYahoo(String symbol, String interval, int outputsize) {
        String intervalParam = switch (interval) {
            case "1min" -> "1m";
            case "5min" -> "5m";
            case "30min" -> "30m";
            case "1h" -> "60m";
            case "1day" -> "1d";
            default -> "1h";
        };

        long secondsPer = switch (interval) {
            case "1min" -> 60;
            case "5min" -> 300;
            case "30min" -> 1800;
            case "1h" -> 3600;
            case "1day" -> 86400;
            default -> 3600;
        };

        long totalDays = Math.max(1, (long) Math.ceil((secondsPer * outputsize) / 86400.0));
        String range = pickRange(totalDays, interval);

        Map<String, Object> candles = requestYahoo(symbol, intervalParam, range);
        if (candles != null) {
            return candles;
        }
        return requestYahoo(symbol, intervalParam, "1mo");
    }

    private String pickRange(long days, String interval) {
        if ("1min".equals(interval)) {
            return "7d";
        }
        if (days <= 7) {
            return "7d";
        }
        if (days <= 30) {
            return "1mo";
        }
        if (days <= 90) {
            return "3mo";
        }
        if (days <= 180) {
            return "6mo";
        }
        return "1y";
    }

    private Map<String, Object> requestYahoo(String symbol, String interval, String range) {
        try {
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
                    symbol.toUpperCase() + "?interval=" + interval + "&range=" + range;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/5.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode result = root.path("chart").path("result");
            if (!result.isArray() || result.isEmpty()) {
                return null;
            }

            JsonNode node = result.get(0);
            JsonNode timestamps = node.path("timestamp");
            JsonNode quote = node.path("indicators").path("quote");
            if (!quote.isArray() || quote.isEmpty()) {
                return null;
            }
            JsonNode quoteNode = quote.get(0);
            JsonNode opens = quoteNode.path("open");
            JsonNode highs = quoteNode.path("high");
            JsonNode lows = quoteNode.path("low");
            JsonNode closes = quoteNode.path("close");
            JsonNode volumes = quoteNode.path("volume");

            if (!timestamps.isArray() || timestamps.isEmpty()) {
                return null;
            }

            List<Map<String, Object>> candles = new ArrayList<>();
            for (int i = 0; i < timestamps.size(); i++) {
                JsonNode open = opens.get(i);
                JsonNode high = highs.get(i);
                JsonNode low = lows.get(i);
                JsonNode close = closes.get(i);
                JsonNode volume = volumes.get(i);
                if (open == null || high == null || low == null || close == null ||
                        open.isNull() || high.isNull() || low.isNull() || close.isNull()) {
                    continue;
                }
                candles.add(Map.of(
                        "t", timestamps.get(i).asLong(),
                        "o", open.asDouble(),
                        "h", high.asDouble(),
                        "l", low.asDouble(),
                        "c", close.asDouble(),
                        "v", volume != null && !volume.isNull() ? volume.asDouble() : 0
                ));
            }

            return Map.of(
                    "symbol", symbol.toUpperCase(),
                    "candles", candles
            );
        } catch (Exception e) {
            return null;
        }
    }
}
