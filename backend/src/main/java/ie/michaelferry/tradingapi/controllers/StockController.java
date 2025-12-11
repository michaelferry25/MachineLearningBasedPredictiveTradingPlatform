package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.models.StockResponse;
import ie.michaelferry.tradingapi.models.HistoricalPriceResponse;
import ie.michaelferry.tradingapi.services.StockService;
import ie.michaelferry.tradingapi.services.NewsService;
import ie.michaelferry.tradingapi.services.HistoricalPriceService;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class StockController {

    private final StockService stockService;
    private final NewsService newsService;
    private final HistoricalPriceService historicalPriceService;

    public StockController(
            StockService stockService,
            NewsService newsService,
            HistoricalPriceService historicalPriceService
    ) {
        this.stockService = stockService;
        this.newsService = newsService;
        this.historicalPriceService = historicalPriceService;
    }

    // Live stock price from Finnhub
    @GetMapping("/api/price/{symbol}")
    public StockResponse getStockPrice(@PathVariable String symbol) {
        return stockService.getStockPrice(symbol);
    }

    // News and sentiment
    @GetMapping("/api/news/{symbol}")
    public List<Map<String, Object>> getNews(@PathVariable String symbol) {
        return newsService.getNewsWithSentiment(symbol);
    }

    // Historical stock prices
    @GetMapping("/api/historical/{symbol}")
    public Map<String, Object> getHistorical(@PathVariable String symbol) {
        return historicalPriceService.getHistoricalPrices(symbol);
    }

}
