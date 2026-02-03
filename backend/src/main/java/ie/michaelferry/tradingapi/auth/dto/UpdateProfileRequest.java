package ie.michaelferry.tradingapi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Display name is required")
        @Size(min = 2, max = 40, message = "Display name must be between 2 and 40 characters")
        String displayName
) {
}
