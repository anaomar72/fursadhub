package com.fursadhub.university.api;

import com.fursadhub.identity.domain.DisplayNamePolicy;
import com.fursadhub.identity.domain.PasswordPolicy;
import com.fursadhub.university.domain.UniversityRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Creates a brand-new managed staff account (CLAUDE.md section 26A) — the email does not need to
 * belong to an existing FursadHub user. The creating admin supplies and confirms the initial
 * password directly; {@code confirmPassword} is request-validation only and is never persisted.
 *
 * <p>Backend Phase B5 added {@code displayName} additively and OPTIONALLY: a client written before
 * B5 sends the same body it always did and still creates a staff account, whose display name is
 * simply null. Nothing derives a name from the email address.
 */
public record CreateStaffRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Pattern(regexp = PasswordPolicy.REGEX,
                message = "Password must be at least 8 characters and include a letter and a number.") String password,
        @NotBlank String confirmPassword,

        /** Backend Phase B5. Optional; normalised by {@link DisplayNamePolicy}. Presentation only. */
        @Size(max = DisplayNamePolicy.MAX_LENGTH) String displayName,

        @NotNull UniversityRole role,
        List<UUID> departmentIds) {
}
