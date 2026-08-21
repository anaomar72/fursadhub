package com.fursadhub.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Opaque, hash-stored, rotating refresh token (CLAUDE.md sections 17-18). Every successful
 * refresh revokes this token and issues a new one in the same {@code family_id}; replaying an
 * already-revoked token is treated as theft and revokes the whole family.
 */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "replaced_by_token_id")
    private UUID replacedByTokenId;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "created_ip", length = 64)
    private String createdIp;

    protected RefreshToken() {
    }

    /** Starts a brand-new session/family (e.g. on login). */
    public static RefreshToken startNewFamily(UUID userId, String tokenHash, Instant expiresAt, String userAgent, String createdIp) {
        return new RefreshToken(UUID.randomUUID(), userId, tokenHash, UUID.randomUUID(), expiresAt, userAgent, createdIp);
    }

    /** Continues an existing family after rotation. */
    public static RefreshToken continueFamily(UUID userId, String tokenHash, UUID familyId, Instant expiresAt, String userAgent, String createdIp) {
        return new RefreshToken(UUID.randomUUID(), userId, tokenHash, familyId, expiresAt, userAgent, createdIp);
    }

    private RefreshToken(UUID id, UUID userId, String tokenHash, UUID familyId, Instant expiresAt, String userAgent, String createdIp) {
        this.id = id;
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.familyId = familyId;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
        this.userAgent = userAgent;
        this.createdIp = createdIp;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }

    public void markUsedAndReplacedBy(UUID newTokenId) {
        this.lastUsedAt = Instant.now();
        this.revokedAt = Instant.now();
        this.replacedByTokenId = newTokenId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }

    public UUID getReplacedByTokenId() {
        return replacedByTokenId;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getCreatedIp() {
        return createdIp;
    }
}
