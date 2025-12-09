package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.models.StockResponse;
import ie.michaelferry.tradingapi.services.StockService;
import ie.michaelferry.tradingapi.services.NewsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
public class StockController {

    private final StockService stockService;
    private final NewsService newsService;

    public StockController(StockService stockService, NewsService newsService) {
        this.stockService = stockService;
        this.newsService = newsService;
    }

    //Live stock price from finnhub
    @GetMapping("/api/price/{symbol}")
    public StockResponse getStockPrice(@PathVariable String symbol) {
        return stockService.getStockPrice(symbol);
    }

    // News and sentiment
    @GetMapping("/api/news/{symbol}")
    public List<Map<String, Object>> getNews(@PathVariable String symbol) {
        return newsService.getNewsWithSentiment(symbol);
    }
}
