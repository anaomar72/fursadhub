package com.fursadhub.compliance.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A record that one user accepted one exact document version (CLAUDE.md section 49).
 *
 * <p>Append-only and never updated. The point of the record is that it can be produced later as
 * evidence of what was agreed and when, so it stores the document id — not the document type — and
 * the version it pointed at can never be edited underneath it.
 *
 * <p>IP and user agent are captured for the same evidential reason, and are the same safe metadata
 * the audit trail already keeps (CLAUDE.md section 51).
 */
@Entity
@Table(name = "terms_acceptances")
public class TermsAcceptance {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "legal_document_id", nullable = false)
    private UUID legalDocumentId;

    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    protected TermsAcceptance() {
    }

    public static TermsAcceptance of(UUID userId, UUID legalDocumentId, String ipAddress, String userAgent) {
        TermsAcceptance acceptance = new TermsAcceptance();
        acceptance.id = UUID.randomUUID();
        acceptance.userId = userId;
        acceptance.legalDocumentId = legalDocumentId;
        acceptance.acceptedAt = Instant.now();
        acceptance.ipAddress = ipAddress;
        acceptance.userAgent = userAgent;
        return acceptance;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getLegalDocumentId() {
        return legalDocumentId;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }
}
