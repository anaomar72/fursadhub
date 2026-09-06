package com.fursadhub.university.api;

import com.fursadhub.university.domain.University;

/**
 * One row of the public university directory (Backend Phase B1) — the exact counterpart of
 * {@code PublicOrganizationSummaryResponse}.
 *
 * <p>Public-safe fields only. Explicitly NOT exposed: {@code registrationNumber}, the raw
 * {@code status} (only the coarse {@code verified} boolean), evidence pointers, stored-file ids,
 * memberships, staff, departments, student counts, placement counts, or anything else derived from
 * the private academic record.
 *
 * <p>No {@code openOpportunityCount} counterpart exists here: opportunities belong to organizations,
 * and a university's relationship to them runs through placements and nominations, which are
 * private. Publishing a count derived from those would leak the shape of student placement data.
 *
 * <p>Backend Phase B2 added {@code countryCode} and {@code hasCover}. {@code publicContactEmail} is
 * deliberately NOT carried here — a contact address belongs on the profile page someone chose to
 * open, not in a directory grid that is trivially scrapable.
 */
public record PublicUniversitySummaryResponse(
        String id,
        String name,
        String slug,
        String city,
        String countryCode,
        String description,
        String website,
        boolean verified,
        boolean hasLogo,
        boolean hasCover) {

    public static PublicUniversitySummaryResponse from(University university) {
        return new PublicUniversitySummaryResponse(
                university.getId().toString(),
                university.getName(),
                university.getSlug(),
                university.getCity(),
                university.getCountryCode(),
                university.getDescription(),
                university.getWebsite(),
                university.isVerified(),
                // Columns on the aggregate already in memory — never a second query per row.
                university.getLogoStoredFileId() != null,
                university.getCoverStoredFileId() != null);
    }
}
