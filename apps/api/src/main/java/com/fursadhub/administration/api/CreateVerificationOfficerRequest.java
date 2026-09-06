package com.fursadhub.administration.api;

import com.fursadhub.identity.domain.DisplayNamePolicy;
import com.fursadhub.identity.domain.PasswordPolicy;
import com.fursadhub.identity.domain.UsernamePolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Creates a managed platform {@code VERIFICATION_OFFICER} (Backend Phase B5.6).
 *
 * <p><strong>There is deliberately no {@code role} field.</strong> Verification officer is the only
 * role this endpoint provisions, so the resource name carries that fact and the request cannot
 * express any other. A privilege-escalation parameter that does not exist cannot be validated
 * wrongly, forgotten in a later refactor, or reached through a request shape nobody anticipated —
 * which is a stronger guarantee than a server-side allowlist over a {@code role} the caller submits.
 *
 * <p>The five fields are exactly the identity and credential the account needs. No phone, job title,
 * department, biography, avatar or tenant: a platform officer has no tenant, and every additional
 * field would be one more thing to keep correct for no operational gain.
 *
 * <p>{@code confirmPassword} is request-validation only and is never persisted, matching the managed
 * institution-staff convention (CLAUDE.md section 26A "Initial Credentials"): the Super Admin types
 * the initial password and therefore already knows it, so nothing is generated and nothing is
 * returned.
 */
public record CreateVerificationOfficerRequest(

        /** REQUIRED here, unlike institution staff: the admin console identifies officers by name. */
        @NotBlank @Size(max = DisplayNamePolicy.MAX_LENGTH) String displayName,

        /**
         * The identifier the officer signs in with. Syntax and lower-casing come from
         * {@link UsernamePolicy}; nothing is derived from the email address.
         */
        @NotBlank String username,

        /** Contact address only — it will NOT authenticate, because the account has a username. */
        @NotBlank @Email @Size(max = 320) String email,

        @NotBlank @Pattern(regexp = PasswordPolicy.REGEX,
                message = "Password must be at least 8 characters and include a letter and a number.") String password,

        @NotBlank String confirmPassword) {
}
