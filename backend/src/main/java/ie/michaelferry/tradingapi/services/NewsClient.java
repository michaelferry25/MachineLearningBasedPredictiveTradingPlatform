package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class NewsClient {

    private final String apiKey = System.getenv("NEWS_API_KEY");
    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> fetchNews(String query) {

        if (apiKey == null || apiKey.isEmpty()) {
            throw new RuntimeException("NEWS_API_KEY not found in environment");
        }

        String url = "https://newsapi.org/v2/everything?q=" + query +
                "&sortBy=publishedAt&language=en&apiKey=" + apiKey;

        return restTemplate.getForObject(url, Map.class);
    }
}
