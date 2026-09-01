package com.fursadhub.organization.api;

import com.fursadhub.organization.domain.Organization;

import java.time.Instant;

/**
 * Management view of an organization, for authorized members only. Never returned from public
 * endpoints (CLAUDE.md section 4 — public/private organization data must stay separate); use
 * {@link OrganizationSummaryResponse} there instead.
 *
 * <p>{@code hasEvidence} is a flag, never the stored-file id: the setup wizard needs to know whether
 * the license step is already done after a reload, and a file id would imply a generic file route
 * that deliberately does not exist.
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
        boolean hasEvidence,
        Instant evidenceUploadedAt,
        boolean hasLogo,
        Instant logoUploadedAt,
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
                organization.getEvidenceStoredFileId() != null,
                organization.getEvidenceUploadedAt(),
                organization.getLogoStoredFileId() != null,
                organization.getLogoUploadedAt(),
                organization.getCreatedAt(),
                organization.getUpdatedAt());
    }
}
