package com.fursadhub.administration.api;

import com.fursadhub.university.domain.University;

import java.time.Instant;
import java.util.UUID;

/**
 * A university as the platform verification queue sees it.
 *
 * <p>{@code hasEvidence} tells the reviewer whether there is a document to open without handing
 * out its stored-file id — the document is reached through this university's own download route, and
 * a file id in a response would imply a generic file route that does not exist.
 */
public record UniversityVerificationResponse(
        UUID id,
        String name,
        String slug,
        String city,
        String registrationNumber,
        String website,
        String verificationStatus,
        boolean hasEvidence,
        Instant evidenceUploadedAt,
        Instant verifiedAt,
        Instant createdAt) {

    public static UniversityVerificationResponse from(University university) {
        return new UniversityVerificationResponse(
                university.getId(),
                university.getName(),
                university.getSlug(),
                university.getCity(),
                university.getRegistrationNumber(),
                university.getWebsite(),
                university.getStatus().name(),
                university.getEvidenceStoredFileId() != null,
                university.getEvidenceUploadedAt(),
                university.getVerifiedAt(),
                university.getCreatedAt());
    }
}
