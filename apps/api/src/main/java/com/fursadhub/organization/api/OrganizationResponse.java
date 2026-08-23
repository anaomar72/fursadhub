package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.Organization;

import java.time.Instant;

/**
 * Management view of an organization, for authorized members only. Never returned from public
 * endpoints (CLAUDE.md section 4 — public/private organization data must stay separate); use
 * {@link OrganizationSummaryResponse} there instead.
 */
public record OrganizationResponse(
        String id,
        String name,
        String slug,
        String type,
        String registrationNumber,
        String website,
        String description,
        String verificationStatus,
        Instant verifiedAt,
        Instant createdAt,
        Instant updatedAt) {

    public static OrganizationResponse from(Organization organization) {
        return new OrganizationResponse(
                organization.getId().toString(),
                organization.getName(),
                organization.getSlug(),
                organization.getType().name(),
                organization.getRegistrationNumber(),
                organization.getWebsite(),
                organization.getDescription(),
                organization.getVerificationStatus().name(),
                organization.getVerifiedAt(),
                organization.getCreatedAt(),
                organization.getUpdatedAt());
    }
}
