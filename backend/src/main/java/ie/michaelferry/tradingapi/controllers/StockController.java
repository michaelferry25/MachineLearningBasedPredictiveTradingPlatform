package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.models.StockResponse;

import ie.michaelferry.tradingapi.services.StockService;
import ie.michaelferry.tradingapi.services.NewsService;
import ie.michaelferry.tradingapi.services.HistoricalPriceService;
import ie.michaelferry.tradingapi.services.CandleService;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class StockController {

    private final StockService stockService;
    private final NewsService newsService;
    private final HistoricalPriceService historicalPriceService;
    private final CandleService candleService;

    public StockController(
            StockService stockService,
            NewsService newsService,
            HistoricalPriceService historicalPriceService,
            CandleService candleService
    ) {
        this.stockService = stockService;
        this.newsService = newsService;
        this.historicalPriceService = historicalPriceService;
        this.candleService = candleService;
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
    public Map<String, Object> getHistorical(
            @PathVariable String symbol,
            @RequestParam(required = false) String range) {
        return historicalPriceService.getHistoricalPrices(symbol, range);
    }

    // Candlestick data for advanced charts
    @GetMapping("/api/candles/{symbol}")
    public Map<String, Object> getCandles(
            @PathVariable String symbol,
            @RequestParam(required = false) String interval,
            @RequestParam(required = false) Integer outputsize
    ) {
        return candleService.getCandles(symbol, interval, outputsize);
    }

}
