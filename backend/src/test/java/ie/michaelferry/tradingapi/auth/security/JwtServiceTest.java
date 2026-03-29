package ie.michaelferry.tradingapi.auth.security;

import ie.michaelferry.tradingapi.auth.UserAccount;
import ie.michaelferry.tradingapi.auth.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for JwtService — token generation, validation,
 * username extraction, and expiry behaviour.
 */
class JwtServiceTest {

    private JwtService jwtService;
    private UserAccount testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        // Inject a long-enough Base64-safe secret for HS256
        ReflectionTestUtils.setField(jwtService, "jwtSecret",
                "dGhpc0lzQVN1cGVyU2VjdXJlU2lnbmluZ0tleUZvclRlc3Rpbmc=");
        ReflectionTestUtils.setField(jwtService, "expirationMinutes", 60L);
        ReflectionTestUtils.setField(jwtService, "issuer", "marketmind-test");

        testUser = new UserAccount();
        testUser.setEmail("jwt@test.com");
        testUser.setDisplayName("JWT Tester");
        testUser.setRole(UserRole.USER);
        testUser.setPasswordHash("irrelevant");
    }

    @Test
    void generateToken_shouldReturnNonNullJwt() {
        String token = jwtService.generateToken(testUser);
        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals(3, token.split("\\.").length, "JWT should have 3 parts");
    }

    @Test
    void extractUsername_shouldReturnEmail() {
        String token = jwtService.generateToken(testUser);
        String extracted = jwtService.extractUsername(token);
        assertEquals("jwt@test.com", extracted);
    }

    @Test
    void isTokenValid_shouldReturnTrue_forMatchingUser() {
        String token = jwtService.generateToken(testUser);
        UserDetails details = User.withUsername("jwt@test.com")
                .password("x")
                .roles("USER")
                .build();
        assertTrue(jwtService.isTokenValid(token, details));
    }

    @Test
    void isTokenValid_shouldReturnFalse_forDifferentEmail() {
        String token = jwtService.generateToken(testUser);
        UserDetails wrongUser = User.withUsername("other@test.com")
                .password("x")
                .roles("USER")
                .build();
        assertFalse(jwtService.isTokenValid(token, wrongUser));
    }

    @Test
    void isTokenExpired_shouldReturnFalse_forFreshToken() {
        String token = jwtService.generateToken(testUser);
        UserDetails details = User.withUsername("jwt@test.com")
                .password("x")
                .roles("USER")
                .build();

        // A freshly minted 60-minute token should be valid
        assertTrue(jwtService.isTokenValid(token, details));
    }

    @Test
    void getExpirationSeconds_shouldReturn3600() {
        assertEquals(3600L, jwtService.getExpirationSeconds());
    }

    @Test
    void generateToken_shouldHandleAdminRole() {
        testUser.setRole(UserRole.ADMIN);
        String token = jwtService.generateToken(testUser);
        assertNotNull(token);
        assertEquals("jwt@test.com", jwtService.extractUsername(token));
    }
}
