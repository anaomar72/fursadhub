package com.fursadhub.administration.api;

import com.fursadhub.organization.domain.Organization;

import java.time.Instant;
import java.util.UUID;

/** An organization as the platform verification queue sees it. */
public record OrganizationVerificationResponse(
        UUID id,
        String name,
        String slug,
        String type,
        String registrationNumber,
        String website,
        String verificationStatus,
        Instant verifiedAt,
        Instant createdAt) {

    public static OrganizationVerificationResponse from(Organization organization) {
        return new OrganizationVerificationResponse(
                organization.getId(),
                organization.getName(),
                organization.getSlug(),
                organization.getType().name(),
                organization.getRegistrationNumber(),
                organization.getWebsite(),
                organization.getVerificationStatus().name(),
                organization.getVerifiedAt(),
                organization.getCreatedAt());
    }
}
