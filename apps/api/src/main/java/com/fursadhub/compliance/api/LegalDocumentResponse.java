package com.fursadhub.compliance.api;

import com.fursadhub.compliance.domain.LegalDocument;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A legal document as served to a reader.
 *
 * <p>{@code locale} is the language actually returned, which is not always the one requested: a
 * document with no Somali version yet falls back to English, and the client shows a note rather than
 * silently implying the text is translated.
 */
public record LegalDocumentResponse(
        UUID id,
        String documentType,
        String version,
        String locale,
        String title,
        String body,
        LocalDate effectiveFrom,
        Instant publishedAt,
        boolean requiresAcceptance) {

    public static LegalDocumentResponse from(LegalDocument document) {
        return new LegalDocumentResponse(
                document.getId(),
                document.getDocumentType().name(),
                document.getVersion(),
                document.getLocale(),
                document.getTitle(),
                document.getBody(),
                document.getEffectiveFrom(),
                document.getPublishedAt(),
                document.getDocumentType().requiresAcceptance());
    }

    /** Summary form for lists — omits the body, which can be very long. */
    public static LegalDocumentResponse summary(LegalDocument document) {
        return new LegalDocumentResponse(
                document.getId(),
                document.getDocumentType().name(),
                document.getVersion(),
                document.getLocale(),
                document.getTitle(),
                null,
                document.getEffectiveFrom(),
                document.getPublishedAt(),
                document.getDocumentType().requiresAcceptance());
    }
}
