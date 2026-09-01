package com.fursadhub.administration.api;

import com.fursadhub.organization.domain.Organization;

import java.time.Instant;
import java.util.UUID;

/**
 * An organization as the platform verification queue sees it.
 *
 * <p>{@code hasEvidence} is a flag rather than a stored-file id: the reviewer opens the license
 * through this organization's own download route, and publishing a file id would imply a generic
 * file route that deliberately does not exist. It tells the queue whether that button is worth
 * showing — from Phase 7.5 an organization cannot reach SUBMITTED without a license, so a submitted
 * row without one is a legacy record and the reviewer should see that before deciding.
 */
public record OrganizationVerificationResponse(
        UUID id,
        String name,
        String slug,
        String type,
        String registrationNumber,
        String website,
        String verificationStatus,
        Instant verifiedAt,
        boolean hasEvidence,
        Instant evidenceUploadedAt,
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
                organization.getEvidenceStoredFileId() != null,
                organization.getEvidenceUploadedAt(),
                organization.getCreatedAt());
    }
}
