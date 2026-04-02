package ie.michaelferry.tradingapi.auth;

import ie.michaelferry.tradingapi.auth.dto.AuthResponse;
import ie.michaelferry.tradingapi.auth.dto.ChangePasswordRequest;
import ie.michaelferry.tradingapi.auth.dto.LoginRequest;
import ie.michaelferry.tradingapi.auth.dto.RegisterRequest;
import ie.michaelferry.tradingapi.auth.dto.UpdateProfileRequest;
import ie.michaelferry.tradingapi.auth.dto.UserResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Authentication and user-profile endpoints (register, login, change password,
 * profile updates). Issues JWT bearer tokens used by the rest of the API.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Registration, login, and user profile management")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmail(@RequestParam String email) {
        boolean available = authService.isEmailAvailable(email);
        return ResponseEntity.ok(Map.of("available", available));
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return authService.getCurrentUser(userDetails.getUsername());
    }

    @PutMapping("/profile")
    public UserResponse updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        requireAuth(userDetails);
        return authService.updateProfile(userDetails.getUsername(), request);
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        requireAuth(userDetails);
        authService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @GetMapping("/settings")
    public ResponseEntity<Map<String, String>> getSettings(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        requireAuth(userDetails);
        String json = authService.getSettings(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("settings", json != null ? json : "{}"));
    }

    @PutMapping("/settings")
    public ResponseEntity<Map<String, String>> updateSettings(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body
    ) {
        requireAuth(userDetails);
        String json = new com.fasterxml.jackson.databind.ObjectMapper()
                .valueToTree(body.get("settings")).toString();
        authService.updateSettings(userDetails.getUsername(), json);
        return ResponseEntity.ok(Map.of("settings", json));
    }

    private void requireAuth(UserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
    }
}
