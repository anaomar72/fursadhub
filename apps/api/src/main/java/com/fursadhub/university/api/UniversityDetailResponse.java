package com.fursadhub.university.api;

import com.fursadhub.university.domain.University;

import java.time.Instant;

/**
 * Management view of a university, for its own staff and for the registering user.
 *
 * <p>Separate from {@link UniversityResponse}, which is the directory entry every authenticated user
 * can list: registration number, description and evidence state are the tenant's own administrative
 * data and have no business in a dropdown on the student enrollment form.
 *
 * <p>{@code hasEvidence} is a flag rather than a stored-file id on purpose — publishing the id
 * would imply a generic file route that deliberately does not exist (CLAUDE.md section 47).
 */
public record UniversityDetailResponse(
        String id,
        String name,
        String slug,
        String city,
        // Backend Phase B2. Readable here as well as publicly because the management form must be
        // able to display what it edits. Omitting one on save no longer clears it — see
        // UpdateUniversityRequest.
        String countryCode,
        String publicContactEmail,
        boolean hasCover,
        Instant coverUploadedAt,
        String registrationNumber,
        String website,
        String description,
        String status,
        boolean hasEvidence,
        Instant evidenceUploadedAt,
        boolean hasLogo,
        Instant logoUploadedAt,
        Instant verifiedAt,
        Instant createdAt,
        Instant updatedAt) {

    public static UniversityDetailResponse from(University university) {
        return new UniversityDetailResponse(
                university.getId().toString(),
                university.getName(),
                university.getSlug(),
                university.getCity(),
                university.getCountryCode(),
                university.getPublicContactEmail(),
                university.getCoverStoredFileId() != null,
                university.getCoverUploadedAt(),
                university.getRegistrationNumber(),
                university.getWebsite(),
                university.getDescription(),
                university.getStatus().name(),
                university.getEvidenceStoredFileId() != null,
                university.getEvidenceUploadedAt(),
                university.getLogoStoredFileId() != null,
                university.getLogoUploadedAt(),
                university.getVerifiedAt(),
                university.getCreatedAt(),
                university.getUpdatedAt());
    }
}
