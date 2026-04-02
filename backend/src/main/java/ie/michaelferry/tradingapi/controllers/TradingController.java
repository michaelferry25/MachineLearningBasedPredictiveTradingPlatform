package ie.michaelferry.tradingapi.controllers;

import ie.michaelferry.tradingapi.services.TradingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Paper-trading endpoints — buy, sell, portfolio, cash balance, trade history,
 * and watchlist management. All endpoints require an authenticated user.
 */
@RestController
@Tag(name = "Trading", description = "Paper-trade buy/sell orders, portfolio, and watchlist")
public class TradingController {

    private final TradingService tradingService;

    public TradingController(TradingService tradingService) {
        this.tradingService = tradingService;
    }

    @PostMapping("/api/trading/buy")
    public ResponseEntity<Map<String, Object>> buy(@RequestBody Map<String, Object> request, Authentication auth) {
        String symbol = request.get("symbol") instanceof String s ? s : null;
        Number qtyNum = request.get("quantity") instanceof Number n ? n : null;

        if (symbol == null || symbol.isBlank() || qtyNum == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "symbol and quantity are required"));
        }

        double quantity = qtyNum.doubleValue();
        if (quantity <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Quantity must be greater than 0"));
        }

        return ResponseEntity.ok(tradingService.executeBuy(auth.getName(), symbol.toUpperCase(), quantity));
    }

    @PostMapping("/api/trading/sell")
    public ResponseEntity<Map<String, Object>> sell(@RequestBody Map<String, Object> request, Authentication auth) {
        String symbol = request.get("symbol") instanceof String s ? s : null;
        Number qtyNum = request.get("quantity") instanceof Number n ? n : null;

        if (symbol == null || symbol.isBlank() || qtyNum == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "symbol and quantity are required"));
        }

        double quantity = qtyNum.doubleValue();
        if (quantity <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Quantity must be greater than 0"));
        }

        return ResponseEntity.ok(tradingService.executeSell(auth.getName(), symbol.toUpperCase(), quantity));
    }

    @GetMapping("/api/trading/portfolio")
    public Map<String, Object> getPortfolio(Authentication auth) {
        return tradingService.getPortfolioSummary(auth.getName());
    }

    @GetMapping("/api/trading/history")
    public Map<String, Object> getHistory(Authentication auth) {
        return Map.of("trades", tradingService.getTradeHistory(auth.getName()));
    }

    @GetMapping("/api/trading/performance")
    public Map<String, Object> getPerformance(Authentication auth) {
        return tradingService.getPerformanceMetrics(auth.getName());
    }
}
