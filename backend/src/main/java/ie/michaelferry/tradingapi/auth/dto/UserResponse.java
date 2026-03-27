package ie.michaelferry.tradingapi.auth.dto;

import ie.michaelferry.tradingapi.auth.UserAccount;

import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String displayName,
        String role,
        Instant createdAt,
        String settingsJson,
        Instant termsAcceptedAt,
        String termsVersion
) {
    public static UserResponse from(UserAccount user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getSettingsJson(),
                user.getTermsAcceptedAt(),
                user.getTermsVersion()
        );
    }
}
