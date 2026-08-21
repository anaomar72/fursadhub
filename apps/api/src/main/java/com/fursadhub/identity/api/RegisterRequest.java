package com.fursadhub.identity.api;

import com.fursadhub.identity.domain.PasswordPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Pattern(regexp = PasswordPolicy.REGEX, message = "Password must be at least 8 characters and include a letter and a number.")
        String password,
        String preferredLocale) {
}
