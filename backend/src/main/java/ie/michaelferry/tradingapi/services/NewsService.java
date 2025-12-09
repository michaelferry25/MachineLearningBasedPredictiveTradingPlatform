package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class NewsService {

    private final NewsClient newsClient;
    private final SentimentService sentimentService;

    public NewsService(NewsClient newsClient, SentimentService sentimentService) {
        this.newsClient = newsClient;
        this.sentimentService = sentimentService;
    }

    public List<Map<String, Object>> getNewsWithSentiment(String symbol) {

        Map<String, Object> response = newsClient.fetchNews(symbol);

        List<Map<String, Object>> articles = (List<Map<String, Object>>) response.get("articles");
        List<Map<String, Object>> result = new ArrayList<>();

        if (articles == null) return result;

        for (Map<String, Object> article : articles) {

            String title = (String) article.get("title");
            String desc = (String) article.get("description");

            String text = (title != null ? title : "") + " " + (desc != null ? desc : "");
            String sentiment = sentimentService.analyzeText(text);

            Map<String, Object> entry = new HashMap<>();
            entry.put("title", title);
            entry.put("description", desc);
            entry.put("sentiment", sentiment);

            result.add(entry);
        }

        return result;
    }
}
