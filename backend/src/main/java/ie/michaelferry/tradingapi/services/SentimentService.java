package ie.michaelferry.tradingapi.services;

import org.springframework.stereotype.Service;

@Service
public class SentimentService {

    public String analyzeText(String text) {

        text = text.toLowerCase();

        int score = 0;

        if (text.contains("profit") || text.contains("growth") || text.contains("beat estimates"))
            score++;

        if (text.contains("loss") || text.contains("fall") || text.contains("missed estimates"))
            score--;

        if (score > 0) return "positive";
        if (score < 0) return "negative";
        return "neutral";
    }
}
