package com.fursadhub.common.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * PostgreSQL-backed transactional-email outbox (CLAUDE.md section 55). Application services
 * enqueue a message in the same database transaction as the business action, so registration/
 * password-reset never fails or half-completes because SMTP is unavailable; a separate
 * {@link EmailOutboxDispatcher} delivers pending messages and retries failures asynchronously.
 */
@Entity
@Table(name = "email_outbox")
public class EmailOutboxMessage {

    @Id
    private UUID id;

    @Column(name = "to_email", nullable = false, length = 320)
    private String toEmail;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmailOutboxStatus status;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    protected EmailOutboxMessage() {
    }

    public EmailOutboxMessage(UUID id, String toEmail, String subject, String body) {
        this.id = id;
        this.toEmail = toEmail;
        this.subject = subject;
        this.body = body;
        this.status = EmailOutboxStatus.PENDING;
        this.attempts = 0;
        this.createdAt = Instant.now();
    }

    public void markSent() {
        this.status = EmailOutboxStatus.SENT;
        this.sentAt = Instant.now();
    }

    public void markAttemptFailed(String error) {
        this.attempts += 1;
        this.lastError = error;
        this.status = attempts >= 5 ? EmailOutboxStatus.FAILED : EmailOutboxStatus.PENDING;
    }

    public UUID getId() {
        return id;
    }

    public String getToEmail() {
        return toEmail;
    }

    public String getSubject() {
        return subject;
    }

    public String getBody() {
        return body;
    }

    public EmailOutboxStatus getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }

    public String getLastError() {
        return lastError;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getSentAt() {
        return sentAt;
    }
}
