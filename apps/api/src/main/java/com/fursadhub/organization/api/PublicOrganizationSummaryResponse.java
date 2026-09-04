package com.fursadhub.organization.api;

import com.fursadhub.organization.application.PublicOrganizationDirectoryService;
import com.fursadhub.organization.domain.Organization;

/**
 * One row of the public organization directory (Backend Phase B1).
 *
 * <p>Public-safe fields only, and a deliberately smaller surface than
 * {@link PublicOrganizationResponse}: a directory card needs identity, trust and scale, not the
 * organization's full prose. Everything here is something the organization itself chose to publish,
 * plus the platform's own verification verdict.
 *
 * <p>Explicitly NOT exposed: {@code registrationNumber}, the raw {@code verificationStatus} (only
 * the coarse {@code verified} boolean — a visitor learns "trusted", never "currently suspended" or
 * "rejected in review"), evidence pointers, stored-file ids, memberships, staff, timestamps, and
 * anything derived from placements.
 *
 * <p>{@code verified} is always {@code true} here, since the directory query admits nothing else. It
 * is carried anyway so a card renders identically whether it came from this endpoint or from
 * {@link PublicOrganizationResponse}, and so the contract survives if the policy is ever revisited.
 */
public record PublicOrganizationSummaryResponse(
        String id,
        String name,
        String slug,
        String type,
        String description,
        String website,
        boolean verified,
        boolean hasLogo,
        long openOpportunityCount) {

    public static PublicOrganizationSummaryResponse from(PublicOrganizationDirectoryService.DirectoryEntry entry) {
        Organization organization = entry.organization();
        return new PublicOrganizationSummaryResponse(
                organization.getId().toString(),
                organization.getName(),
                organization.getSlug(),
                organization.getType().name(),
                organization.getDescription(),
                organization.getWebsite(),
                organization.isVerified(),
                // A column on the aggregate already in memory — never a second query per row.
                organization.getLogoStoredFileId() != null,
                entry.openOpportunityCount());
    }
}
