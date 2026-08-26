package com.fursadhub.compliance.application;

import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.compliance.domain.LegalDocument;
import com.fursadhub.compliance.domain.LegalDocumentRepository;
import com.fursadhub.compliance.domain.LegalDocumentType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Publishes and serves versioned legal documents (CLAUDE.md section 49).
 *
 * <p>Reading is public and unauthenticated on purpose: someone deciding whether to register must be
 * able to read the terms first, and gating them behind a login would be backwards.
 *
 * <p>Publishing is SUPER_ADMIN only, and a published version is immutable — there is no update or
 * delete path anywhere in this service. Correcting the wording means publishing a new version, which
 * is what keeps every recorded acceptance meaningful.
 */
@Service
public class LegalDocumentService {

    /** The product's two UI languages (CLAUDE.md section 56). */
    private static final Set<String> SUPPORTED_LOCALES = Set.of("en", "so");

    private static final String FALLBACK_LOCALE = "en";

    private final LegalDocumentRepository documents;
    private final PlatformAuthorization authorization;
    private final AuditService audit;
    private final Clock clock;

    public LegalDocumentService(
            LegalDocumentRepository documents, PlatformAuthorization authorization,
            AuditService audit, Clock clock) {
        this.documents = documents;
        this.authorization = authorization;
        this.audit = audit;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- public reads

    /**
     * The version currently in force, in the requested language.
     *
     * <p>Falls back to English when a document has not been translated into Somali yet. Showing the
     * English text is the right failure: a reader who cannot see the terms at all is worse off than
     * one reading them in their second language, and the fallback is visible in the response's own
     * {@code locale} field.
     */
    @Transactional(readOnly = true)
    public LegalDocument current(LegalDocumentType documentType, String requestedLocale) {
        LocalDate today = LocalDate.now(clock);
        String locale = normalizeLocale(requestedLocale);

        return documents.findCurrent(documentType, locale, today)
                .or(() -> locale.equals(FALLBACK_LOCALE)
                        ? java.util.Optional.empty()
                        : documents.findCurrent(documentType, FALLBACK_LOCALE, today))
                .orElseThrow(() -> new ApiException("LEGAL_DOCUMENT_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "That document has not been published yet."));
    }

    @Transactional(readOnly = true)
    public List<LegalDocument> allCurrent(String requestedLocale) {
        return documents.findAllCurrent(normalizeLocale(requestedLocale), LocalDate.now(clock));
    }

    // ---------------------------------------------------------------- administration

    @Transactional(readOnly = true)
    public List<LegalDocument> listAll(UUID actingUserId) {
        authorization.requireSuperAdmin(actingUserId);
        return documents.findAllOrderByCreatedAtDesc();
    }

    /**
     * Creates and immediately publishes a new version.
     *
     * <p>Draft-then-publish exists in the domain model, but this pilot endpoint does both at once:
     * a two-step editorial workflow needs a review UI to be worth anything, and a half-built one
     * would just leave drafts stranded. The immutability that matters is already there — a published
     * version can never be edited.
     */
    @Transactional
    public LegalDocument publish(
            UUID actingUserId, LegalDocumentType documentType, String version, String locale,
            String title, String body, LocalDate effectiveFrom, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        String normalizedLocale = requireSupportedLocale(locale);
        if (documents.existsByDocumentTypeAndVersionAndLocale(documentType, version, normalizedLocale)) {
            throw new ApiException("LEGAL_DOCUMENT_VERSION_EXISTS", HttpStatus.CONFLICT,
                    "That version already exists in this language. Publish a new version instead.");
        }

        LegalDocument document = LegalDocument.draft(
                documentType, version, normalizedLocale, title, body, effectiveFrom, actingUserId);
        document.publish();
        documents.save(document);

        audit.record("LEGAL_DOCUMENT_PUBLISHED", actingUserId, ip, userAgent,
                documentType + " version " + version + " (" + normalizedLocale + ")");
        return document;
    }

    private String normalizeLocale(String requested) {
        if (requested == null || requested.isBlank()) {
            return FALLBACK_LOCALE;
        }
        String normalized = requested.trim().toLowerCase(Locale.ROOT);
        return SUPPORTED_LOCALES.contains(normalized) ? normalized : FALLBACK_LOCALE;
    }

    /** Publishing, unlike reading, refuses an unsupported language rather than quietly substituting one. */
    private String requireSupportedLocale(String locale) {
        String normalized = locale == null ? "" : locale.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_LOCALES.contains(normalized)) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Legal documents are published in English or Somali.");
        }
        return normalized;
    }
}
