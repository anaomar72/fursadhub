package com.fursadhub.university.api;

import com.fursadhub.university.domain.University;

/** A university as anyone browsing FursadHub — signed in or not — sees it. */
public record PublicUniversityResponse(
        String id,
        String name,
        String slug,
        String city,
        String website,
        String description,
        boolean verified,
        boolean hasLogo) {

    public static PublicUniversityResponse from(University university) {
        return new PublicUniversityResponse(
                university.getId().toString(),
                university.getName(),
                university.getSlug(),
                university.getCity(),
                university.getWebsite(),
                university.getDescription(),
                university.isVerified(),
                university.getLogoStoredFileId() != null);
    }
}
