package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.services.TradingService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class TradingController {

    private final TradingService tradingService;

    public TradingController(TradingService tradingService) {
        this.tradingService = tradingService;
    }

    @PostMapping("/api/trading/buy")
    public Map<String, Object> buy(@RequestBody Map<String, Object> request, Authentication auth) {
        String symbol = (String) request.get("symbol");
        int quantity = ((Number) request.get("quantity")).intValue();
        return tradingService.executeBuy(auth.getName(), symbol.toUpperCase(), quantity);
    }

    @PostMapping("/api/trading/sell")
    public Map<String, Object> sell(@RequestBody Map<String, Object> request, Authentication auth) {
        String symbol = (String) request.get("symbol");
        int quantity = ((Number) request.get("quantity")).intValue();
        return tradingService.executeSell(auth.getName(), symbol.toUpperCase(), quantity);
    }

    @GetMapping("/api/trading/portfolio")
    public Map<String, Object> getPortfolio(Authentication auth) {
        return tradingService.getPortfolioSummary(auth.getName());
    }

    @GetMapping("/api/trading/history")
    public Map<String, Object> getHistory(Authentication auth) {
        return Map.of("trades", tradingService.getTradeHistory(auth.getName()));
    }
}
