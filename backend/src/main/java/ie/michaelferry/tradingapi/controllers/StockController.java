package ie.michaelferry.tradingapi.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StockController {

    @GetMapping("/api/price/{symbol}")
    public String getStockPrice(@PathVariable String symbol) {
        // Temporary placeholder until we connect Finnhub
        return "Price lookup placeholder for: " + symbol;
    }
}
