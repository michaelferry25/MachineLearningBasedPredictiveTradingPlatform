package ie.michaelferry.tradingapi.auth;

import ie.michaelferry.tradingapi.auth.dto.RegisterRequest;
import ie.michaelferry.tradingapi.auth.dto.LoginRequest;
import ie.michaelferry.tradingapi.auth.dto.AuthResponse;
import ie.michaelferry.tradingapi.auth.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the AuthService — registration flow, login validation,
 * email availability, and Terms of Service enforcement.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtService jwtService;
    @InjectMocks private AuthService authService;

    private UserAccount mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new UserAccount();
        mockUser.setEmail("test@marketmind.cfd");
        mockUser.setDisplayName("Test User");
        mockUser.setPasswordHash("hashed_password");
        mockUser.setRole(UserRole.USER);
        mockUser.setAcceptedTerms(true);
    }

    // ─── Registration ───

    @Test
    void register_shouldSucceed_withValidRequest() {
        RegisterRequest request = new RegisterRequest(
                "newuser@test.com", "SecurePass123", "Test User", true, "1.0"
        );

        when(userRepository.existsByEmail("newuser@test.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123")).thenReturn("hashed");
        when(userRepository.save(any(UserAccount.class))).thenReturn(mockUser);
        when(jwtService.generateToken(any(UserAccount.class))).thenReturn("mock.jwt.token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.accessToken());
        verify(userRepository).save(any(UserAccount.class));
    }

    @Test
    void register_shouldThrow_whenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest(
                "existing@test.com", "Password123", "User", true, "1.0"
        );
        when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> authService.register(request)
        );
        assertTrue(ex.getMessage().contains("Email already registered"));
    }

    @Test
    void register_shouldThrow_whenTermsNotAccepted() {
        RegisterRequest request = new RegisterRequest(
                "user@test.com", "Password123", "User", false, "1.0"
        );
        when(userRepository.existsByEmail("user@test.com")).thenReturn(false);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> authService.register(request)
        );
        assertTrue(ex.getMessage().contains("Terms of Service"));
    }

    @Test
    void register_shouldThrow_whenTermsAcceptedIsNull() {
        RegisterRequest request = new RegisterRequest(
                "user@test.com", "Password123", "User", null, "1.0"
        );
        when(userRepository.existsByEmail("user@test.com")).thenReturn(false);

        assertThrows(ResponseStatusException.class, () -> authService.register(request));
    }

    // ─── Login ───

    @Test
    void login_shouldReturnToken_withValidCredentials() {
        LoginRequest request = new LoginRequest("test@marketmind.cfd", "correct_password");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByEmail("test@marketmind.cfd")).thenReturn(Optional.of(mockUser));
        when(jwtService.generateToken(mockUser)).thenReturn("valid.jwt.token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("valid.jwt.token", response.accessToken());
    }

    @Test
    void login_shouldThrow_withInvalidCredentials() {
        LoginRequest request = new LoginRequest("test@marketmind.cfd", "wrong_password");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new RuntimeException("Bad credentials"));

        assertThrows(ResponseStatusException.class, () -> authService.login(request));
    }

    // ─── Email Availability ───

    @Test
    void isEmailAvailable_shouldReturnTrue_whenNotRegistered() {
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        assertTrue(authService.isEmailAvailable("new@test.com"));
    }

    @Test
    void isEmailAvailable_shouldReturnFalse_whenRegistered() {
        when(userRepository.existsByEmail("taken@test.com")).thenReturn(true);
        assertFalse(authService.isEmailAvailable("taken@test.com"));
    }

    // ─── Email Normalisation ───

    @Test
    void register_shouldNormaliseEmail_caseAndWhitespace() {
        RegisterRequest request = new RegisterRequest(
                "  TEST@Email.COM  ", "Password123", "User", true, "1.0"
        );

        when(userRepository.existsByEmail("test@email.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any(UserAccount.class))).thenReturn(mockUser);
        when(jwtService.generateToken(any(UserAccount.class))).thenReturn("token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        authService.register(request);
        verify(userRepository).existsByEmail("test@email.com");
    }
}
