package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.services.StockService;
import ie.michaelferry.tradingapi.models.StockResponse;
import org.springframework.web.bind.annotation.*;

@RestController
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping("/api/price/{symbol}")
    public StockResponse getStockPrice(@PathVariable String symbol) {
        return stockService.getStockPrice(symbol);
    }
}
