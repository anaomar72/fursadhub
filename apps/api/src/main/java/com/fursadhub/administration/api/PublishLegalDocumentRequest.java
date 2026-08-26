package com.fursadhub.administration.api;

import com.fursadhub.compliance.domain.LegalDocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Publishing a new version of a legal document. There is no edit request anywhere: a published
 * version is immutable, and a correction is a new version (CLAUDE.md section 49).
 */
public record PublishLegalDocumentRequest(
        @NotNull LegalDocumentType documentType,
        @NotBlank @Size(max = 40) String version,
        @NotBlank @Pattern(regexp = "en|so", message = "Locale must be en or so.") String locale,
        @NotBlank @Size(max = 255) String title,
        @NotBlank String body,
        @NotNull LocalDate effectiveFrom) {
}
