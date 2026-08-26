package com.fursadhub.common.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Duration;
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

    /** After this many failed attempts the message is parked in FAILED for an operator to look at. */
    private static final int MAX_ATTEMPTS = 5;

    /** Ceiling on the retry delay, so a persistently failing message still gets a daily attempt. */
    private static final Duration MAX_DELAY = Duration.ofHours(6);

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

    /** When this message next becomes eligible for delivery. Drives the backoff described below. */
    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

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
        // Due immediately: the first delivery attempt should happen on the next dispatcher tick.
        this.nextAttemptAt = this.createdAt;
    }

    public void markSent() {
        this.status = EmailOutboxStatus.SENT;
        this.sentAt = Instant.now();
    }

    /**
     * Records a failed delivery attempt and schedules the next one (Phase 7).
     *
     * <p>Phase 1 retried on the very next 10-second tick, which burned all five attempts inside a
     * minute — so a provider outage of even a couple of minutes exhausted every attempt and parked
     * the message in FAILED forever, which is precisely the case retries exist for. The delay now
     * grows five-fold each time (1m, 5m, 25m, ~2h), spreading the same five attempts across roughly
     * three hours.
     *
     * <p>The business transaction that enqueued this message was never affected either way. This is
     * only about actually getting the mail delivered afterwards.
     */
    public void markAttemptFailed(String error) {
        this.attempts += 1;
        this.lastError = error;
        this.status = attempts >= MAX_ATTEMPTS ? EmailOutboxStatus.FAILED : EmailOutboxStatus.PENDING;
        this.nextAttemptAt = Instant.now().plus(backoffFor(attempts));
    }

    private static Duration backoffFor(int attempts) {
        // 1m, 5m, 25m, ~2h — capped so a long-standing failure cannot schedule itself past MAX_DELAY.
        long minutes = (long) Math.pow(5, Math.max(0, attempts - 1));
        Duration delay = Duration.ofMinutes(minutes);
        return delay.compareTo(MAX_DELAY) > 0 ? MAX_DELAY : delay;
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

    public Instant getNextAttemptAt() {
        return nextAttemptAt;
    }
}
