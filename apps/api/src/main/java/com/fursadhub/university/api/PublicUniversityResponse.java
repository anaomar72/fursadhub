package com.fursadhub.university.api;

import com.fursadhub.university.domain.University;

/**
 * A university as anyone browsing FursadHub — signed in or not — sees it. Backend Phase B2 added
 * country, the published contact address and the banner flag.
 *
 * <p>Never exposed: {@code registrationNumber}, the raw {@code status} (only the coarse
 * {@code verified} fact), evidence state, stored-file ids, memberships, staff, departments, student
 * counts, placements — anything derived from the private academic record.
 *
 * <p>{@code publicContactEmail} is the one address here, and it exists only because a
 * {@code UNIVERSITY_ADMIN} explicitly published it. No staff or admin account email is ever surfaced
 * through this DTO.
 */
public record PublicUniversityResponse(
        String id,
        String name,
        String slug,
        String city,
        String countryCode,
        String website,
        String description,
        String publicContactEmail,
        boolean verified,
        boolean hasLogo,
        boolean hasCover) {

    public static PublicUniversityResponse from(University university) {
        return new PublicUniversityResponse(
                university.getId().toString(),
                university.getName(),
                university.getSlug(),
                university.getCity(),
                university.getCountryCode(),
                university.getWebsite(),
                university.getDescription(),
                university.getPublicContactEmail(),
                university.isVerified(),
                university.getLogoStoredFileId() != null,
                university.getCoverStoredFileId() != null);
    }
}
