package ie.michaelferry.tradingapi.auth;

import ie.michaelferry.tradingapi.auth.dto.AuthResponse;
import ie.michaelferry.tradingapi.auth.dto.LoginRequest;
import ie.michaelferry.tradingapi.auth.dto.RegisterRequest;
import ie.michaelferry.tradingapi.auth.dto.UpdateProfileRequest;
import ie.michaelferry.tradingapi.auth.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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
        if (userDetails == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Not authenticated"
            );
        }
        return authService.getCurrentUser(userDetails.getUsername());
    }

    @PutMapping("/profile")
    public UserResponse updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        if (userDetails == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Not authenticated"
            );
        }
        return authService.updateProfile(userDetails.getUsername(), request);
    }
}
