package com.fursadhub.compliance.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One version of one legal document in one language (CLAUDE.md section 49).
 *
 * <p>A published version is IMMUTABLE. Changing the wording means publishing a new version, never
 * editing this row — otherwise an acceptance recorded last month could silently come to mean
 * something the user never actually saw, which would make the acceptance record worthless as
 * evidence.
 *
 * <p>Every document exists per locale (EN and SO), and the two locales of the same version are
 * separate rows sharing a version label. Accepting one accepts that version: the user is shown the
 * text in their own language and the acceptance points at the row they were actually shown.
 */
@Entity
@Table(name = "legal_documents")
public class LegalDocument {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private LegalDocumentType documentType;

    @Column(nullable = false, length = 40)
    private String version;

    @Column(nullable = false, length = 5)
    private String locale;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false)
    private String body;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    /** NULL means draft. A draft is never served to anyone and can never be accepted. */
    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LegalDocument() {
    }

    public static LegalDocument draft(
            LegalDocumentType documentType, String version, String locale, String title,
            String body, LocalDate effectiveFrom, UUID createdByUserId) {
        LegalDocument document = new LegalDocument();
        document.id = UUID.randomUUID();
        document.documentType = documentType;
        document.version = version;
        document.locale = locale;
        document.title = title;
        document.body = body;
        document.effectiveFrom = effectiveFrom;
        document.createdByUserId = createdByUserId;
        document.createdAt = Instant.now();
        return document;
    }

    /** Publishing is the act that makes a version real. Idempotent — the first timestamp stands. */
    public void publish() {
        if (publishedAt == null) {
            this.publishedAt = Instant.now();
        }
    }

    public boolean isPublished() {
        return publishedAt != null;
    }

    /**
     * A published version whose effective date has arrived. A version published today but effective
     * next month is visible to administrators and not yet binding on anyone.
     */
    public boolean isInForce(LocalDate today) {
        return isPublished() && !effectiveFrom.isAfter(today);
    }

    /** Guards acceptance: a draft or not-yet-effective version must not be acceptable. */
    public void requireAcceptable(LocalDate today) {
        if (!isInForce(today)) {
            throw new ApiException("LEGAL_DOCUMENT_NOT_IN_FORCE", HttpStatus.CONFLICT,
                    "That document version cannot be accepted.");
        }
        if (!documentType.requiresAcceptance()) {
            throw new ApiException("LEGAL_DOCUMENT_NOT_ACCEPTABLE", HttpStatus.CONFLICT,
                    "That document does not require acceptance.");
        }
    }

    public UUID getId() {
        return id;
    }

    public LegalDocumentType getDocumentType() {
        return documentType;
    }

    public String getVersion() {
        return version;
    }

    public String getLocale() {
        return locale;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public LocalDate getEffectiveFrom() {
        return effectiveFrom;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
