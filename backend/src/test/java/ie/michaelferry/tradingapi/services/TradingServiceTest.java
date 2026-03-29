package ie.michaelferry.tradingapi.services;

import ie.michaelferry.tradingapi.auth.UserAccount;
import ie.michaelferry.tradingapi.auth.UserRepository;
import ie.michaelferry.tradingapi.auth.UserRole;
import ie.michaelferry.tradingapi.trading.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TradingService — buy/sell execution, portfolio calculation,
 * edge cases (insufficient funds, invalid quantity, missing price data).
 */
@ExtendWith(MockitoExtension.class)
class TradingServiceTest {

    @Mock private FinnhubClient finnhubClient;
    @Mock private UserRepository userRepository;
    @Mock private TradeRepository tradeRepository;
    @Mock private HoldingRepository holdingRepository;
    @Mock private PortfolioSnapshotRepository snapshotRepository;
    @Mock private UserCashBalanceRepository cashBalanceRepository;
    @InjectMocks private TradingService tradingService;

    private UserAccount testUser;

    @BeforeEach
    void setUp() {
        testUser = new UserAccount();
        testUser.setEmail("trader@test.com");
        testUser.setRole(UserRole.USER);

        // Ensure user resolves
        lenient().when(userRepository.findByEmail("trader@test.com"))
                .thenReturn(Optional.of(testUser));
    }

    // ─── Buy Execution ───

    @Test
    void executeBuy_shouldSucceed_withSufficientFunds() {
        when(finnhubClient.fetchLivePrice("AAPL")).thenReturn(150.0);
        when(cashBalanceRepository.findById(any())).thenReturn(Optional.empty()); // defaults to 100k
        when(holdingRepository.findByUserIdAndSymbol(any(), eq("AAPL"))).thenReturn(Optional.empty());
        when(holdingRepository.findByUserId(any())).thenReturn(List.of());
        when(tradeRepository.countByUserId(any())).thenReturn(1L);

        Map<String, Object> result = tradingService.executeBuy("trader@test.com", "AAPL", 10);

        assertEquals(true, result.get("success"));
        verify(tradeRepository).save(any(TradeEntity.class));
        verify(holdingRepository).save(any(HoldingEntity.class));
    }

    @Test
    void executeBuy_shouldFail_withInsufficientFunds() {
        when(finnhubClient.fetchLivePrice("AAPL")).thenReturn(150.0);
        UserCashBalance low = new UserCashBalance();
        low.setBalance(100.0); // Only $100 — can't buy 10 shares at $150
        when(cashBalanceRepository.findById(any())).thenReturn(Optional.of(low));

        Map<String, Object> result = tradingService.executeBuy("trader@test.com", "AAPL", 10);

        assertEquals("Insufficient funds", result.get("error"));
        verify(tradeRepository, never()).save(any());
    }

    @Test
    void executeBuy_shouldFail_withZeroQuantity() {
        Map<String, Object> result = tradingService.executeBuy("trader@test.com", "AAPL", 0);

        assertEquals("Quantity must be greater than 0", result.get("error"));
    }

    @Test
    void executeBuy_shouldFail_whenPriceUnavailable() {
        when(finnhubClient.fetchLivePrice("FAKE")).thenReturn(-1.0);

        Map<String, Object> result = tradingService.executeBuy("trader@test.com", "FAKE", 5);

        assertTrue(result.containsKey("error"));
    }

    @Test
    void executeBuy_shouldUpdateExistingHolding_notCreateNew() {
        when(finnhubClient.fetchLivePrice("AAPL")).thenReturn(150.0);
        when(cashBalanceRepository.findById(any())).thenReturn(Optional.empty());
        when(holdingRepository.findByUserId(any())).thenReturn(List.of());
        when(tradeRepository.countByUserId(any())).thenReturn(1L);

        HoldingEntity existing = new HoldingEntity();
        existing.setQuantity(10);
        existing.setAvgPrice(140.0);
        existing.setSymbol("AAPL");
        when(holdingRepository.findByUserIdAndSymbol(any(), eq("AAPL")))
                .thenReturn(Optional.of(existing));

        tradingService.executeBuy("trader@test.com", "AAPL", 5);

        // Verify avg price was recalculated: (140*10 + 150*5) / 15 = ~143.33
        assertEquals(15.0, existing.getQuantity());
        assertTrue(existing.getAvgPrice() > 140 && existing.getAvgPrice() < 150);
    }

    // ─── Sell Execution ───

    @Test
    void executeSell_shouldSucceed_withSufficientShares() {
        HoldingEntity holding = new HoldingEntity();
        holding.setQuantity(20);
        holding.setAvgPrice(100.0);
        holding.setSymbol("AAPL");

        when(holdingRepository.findByUserIdAndSymbol(any(), eq("AAPL")))
                .thenReturn(Optional.of(holding));
        when(finnhubClient.fetchLivePrice("AAPL")).thenReturn(120.0);
        when(cashBalanceRepository.findById(any())).thenReturn(Optional.empty());
        when(holdingRepository.findByUserId(any())).thenReturn(List.of());
        when(tradeRepository.countByUserId(any())).thenReturn(1L);

        Map<String, Object> result = tradingService.executeSell("trader@test.com", "AAPL", 5);

        assertEquals(true, result.get("success"));
        assertEquals(15.0, holding.getQuantity());
    }

    @Test
    void executeSell_shouldFail_withInsufficientShares() {
        HoldingEntity holding = new HoldingEntity();
        holding.setQuantity(3);
        holding.setSymbol("AAPL");
        when(holdingRepository.findByUserIdAndSymbol(any(), eq("AAPL")))
                .thenReturn(Optional.of(holding));

        Map<String, Object> result = tradingService.executeSell("trader@test.com", "AAPL", 10);

        assertEquals("Insufficient shares", result.get("error"));
    }

    @Test
    void executeSell_shouldDeleteHolding_whenSellingAll() {
        HoldingEntity holding = new HoldingEntity();
        holding.setQuantity(5);
        holding.setAvgPrice(100.0);
        holding.setSymbol("AAPL");

        when(holdingRepository.findByUserIdAndSymbol(any(), eq("AAPL")))
                .thenReturn(Optional.of(holding));
        when(finnhubClient.fetchLivePrice("AAPL")).thenReturn(110.0);
        when(cashBalanceRepository.findById(any())).thenReturn(Optional.empty());
        when(holdingRepository.findByUserId(any())).thenReturn(List.of());
        when(tradeRepository.countByUserId(any())).thenReturn(1L);

        tradingService.executeSell("trader@test.com", "AAPL", 5);

        verify(holdingRepository).delete(holding);
    }

    // ─── Portfolio ───

    @Test
    void getPortfolioSummary_shouldReturn100k_forNewUser() {
        when(cashBalanceRepository.findById(any())).thenReturn(Optional.empty());
        when(holdingRepository.findByUserId(any())).thenReturn(List.of());
        when(tradeRepository.countByUserId(any())).thenReturn(0L);

        Map<String, Object> summary = tradingService.getPortfolioSummary("trader@test.com");

        assertEquals(100_000.0, summary.get("cashBalance"));
        assertEquals(100_000.0, summary.get("totalValue"));
    }
}
