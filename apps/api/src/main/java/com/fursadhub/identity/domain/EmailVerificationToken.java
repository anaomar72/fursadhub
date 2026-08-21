package com.fursadhub.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A keyed-hash-stored, one-time, expiring 4-digit email-verification code challenge (CLAUDE.md
 * section 13). Never a JWT; the raw code only ever exists transiently in memory and inside the
 * outbound verification email — it is never persisted or logged. {@code codeHash} is an HMAC
 * (see {@code EmailVerificationCodeHasher}), not a plain hash: a 4-digit code has only 10,000
 * possible values, so a plain hash would be trivially brute-forceable offline if this table ever
 * leaked. At most one active (unconsumed) challenge exists per user at a time (enforced by a
 * partial unique index — see the Flyway migration) since issuing a new one always invalidates any
 * previous one.
 */
@Entity
@Table(name = "email_verification_tokens")
public class EmailVerificationToken {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected EmailVerificationToken() {
    }

    public EmailVerificationToken(UUID id, UUID userId, String codeHash, Instant expiresAt) {
        this.id = id;
        this.userId = userId;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
        this.failedAttempts = 0;
        this.createdAt = Instant.now();
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isConsumed() {
        return consumedAt != null;
    }

    public void consume() {
        this.consumedAt = Instant.now();
    }

    public void registerFailedAttempt() {
        this.failedAttempts++;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getCodeHash() {
        return codeHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getConsumedAt() {
        return consumedAt;
    }

    public int getFailedAttempts() {
        return failedAttempts;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
