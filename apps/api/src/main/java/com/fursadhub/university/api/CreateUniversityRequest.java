package com.fursadhub.university.api;

import com.fursadhub.common.api.PublicLink;
import com.fursadhub.common.api.PublicLinkPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-registration payload. Sizes match the columns exactly so an over-long value fails as a
 * {@code VALIDATION_FAILED} field error rather than a database error (CLAUDE.md section 11).
 */
public record CreateUniversityRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 120) String city,
        @Size(max = 120) String registrationNumber,

        // Same rule as UpdateUniversityRequest — see CreateOrganizationRequest for why registration
        // cannot be the one way to publish an unvalidated link.
        @Size(max = PublicLinkPolicy.URL_MAX_LENGTH) @PublicLink String website,

        @Size(max = 2000) String description) {
}
