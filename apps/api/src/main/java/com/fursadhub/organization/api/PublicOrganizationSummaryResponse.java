package com.fursadhub.organization.api;

import com.fursadhub.organization.application.PublicOrganizationDirectoryService;
import com.fursadhub.organization.domain.Organization;

/**
 * One row of the public organization directory (Backend Phase B1, enriched additively in B2).
 *
 * <p>Public-safe fields only, and a deliberately smaller surface than
 * {@link PublicOrganizationResponse}: a directory card needs identity, trust, scale and enough
 * context to decide whether to click. The full prose, social links, founded year and banner belong
 * to the profile page, not to a card.
 *
 * <p>{@code shortDescription} is carried instead of {@code description} for exactly that reason — a
 * 2000-character body does not belong in a grid cell. {@code description} remains available on the
 * detail response.
 *
 * <p>Explicitly NOT exposed: {@code registrationNumber}, the raw {@code verificationStatus} (only
 * the coarse {@code verified} boolean — a visitor learns "trusted", never "currently suspended"),
 * evidence pointers, stored-file ids, memberships, staff, timestamps, and anything derived from
 * placements.
 *
 * <p>{@code verified} is always {@code true} here, since the directory query admits nothing else. It
 * is carried anyway so a card renders identically whichever endpoint fed it.
 */
public record PublicOrganizationSummaryResponse(
        String id,
        String name,
        String slug,
        String type,
        String industry,
        String city,
        String countryCode,
        String shortDescription,
        String description,
        String website,
        boolean verified,
        boolean hasLogo,
        boolean hasCover,
        long openOpportunityCount) {

    public static PublicOrganizationSummaryResponse from(PublicOrganizationDirectoryService.DirectoryEntry entry) {
        Organization organization = entry.organization();
        return new PublicOrganizationSummaryResponse(
                organization.getId().toString(),
                organization.getName(),
                organization.getSlug(),
                organization.getType().name(),
                organization.getIndustry(),
                organization.getCity(),
                organization.getCountryCode(),
                organization.getShortDescription(),
                organization.getDescription(),
                organization.getWebsite(),
                organization.isVerified(),
                // Columns on the aggregate already in memory — never a second query per row.
                organization.getLogoStoredFileId() != null,
                organization.getCoverStoredFileId() != null,
                entry.openOpportunityCount());
    }
}
