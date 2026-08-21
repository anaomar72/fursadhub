package com.fursadhub.identity.api;

import com.fursadhub.identity.domain.PasswordPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Pattern(regexp = PasswordPolicy.REGEX, message = "Password must be at least 8 characters and include a letter and a number.")
        String newPassword) {
}
