package com.fursadhub.organization.api;

import com.fursadhub.identity.domain.PasswordPolicy;
import com.fursadhub.organization.domain.OrganizationRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Creates a brand-new managed staff account (CLAUDE.md section 26A) — the email does not need to
 * belong to an existing FursadHub user. The creating admin supplies and confirms the initial
 * password directly; {@code confirmPassword} is request-validation only and is never persisted.
 */
public record CreateOrganizationMemberRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Pattern(regexp = PasswordPolicy.REGEX,
                message = "Password must be at least 8 characters and include a letter and a number.") String password,
        @NotBlank String confirmPassword,
        @NotNull OrganizationRole role) {
}
