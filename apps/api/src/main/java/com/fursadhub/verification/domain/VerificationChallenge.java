package com.fursadhub.verification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Short-lived opaque account-binding challenge (CLAUDE.md section 29) — a one-time-use, hash-
 * stored, expiring code the student displays/reads out and university staff enters to confirm the
 * FursadHub account in front of them matches the enrollment being verified. Never a JWT; the raw
 * code only ever exists transiently in the API response, mirroring {@code EmailVerificationToken}.
 */
@Entity
@Table(name = "verification_challenges")
public class VerificationChallenge {

    @Id
    private UUID id;

    @Column(name = "verification_case_id", nullable = false)
    private UUID verificationCaseId;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected VerificationChallenge() {
    }

    public VerificationChallenge(UUID id, UUID verificationCaseId, String codeHash, Instant expiresAt) {
        this.id = id;
        this.verificationCaseId = verificationCaseId;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
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

    public UUID getId() {
        return id;
    }

    public UUID getVerificationCaseId() {
        return verificationCaseId;
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

    public Instant getCreatedAt() {
        return createdAt;
    }
}
