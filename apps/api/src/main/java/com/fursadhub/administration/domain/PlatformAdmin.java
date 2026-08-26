package com.fursadhub.administration.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One grant of a platform role to one user (CLAUDE.md section 23/24).
 *
 * <p>Modelled exactly like {@code UniversityMembership} and {@code OrganizationMembership}: a row
 * that is re-read from PostgreSQL on every request, never a claim inside a JWT. Revoking a grant is
 * effective immediately on the holder's next call rather than whenever their 10-minute access token
 * happens to expire.
 *
 * <p>Revocation is a soft close. The row stays, {@link #revokedAt} is set, and a partial unique index
 * keeps at most one ACTIVE grant per user per role — so who held platform authority, and when,
 * survives as history (CLAUDE.md section 51).
 */
@Entity
@Table(name = "platform_admins")
public class PlatformAdmin {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PlatformRole role;

    @Column(name = "granted_by_user_id")
    private UUID grantedByUserId;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by_user_id")
    private UUID revokedByUserId;

    protected PlatformAdmin() {
    }

    /**
     * @param grantedByUserId the acting SUPER_ADMIN, or {@code null} for the ops-bootstrapped first
     *                        admin, which by definition has no earlier admin to have granted it.
     */
    public static PlatformAdmin grant(UUID userId, PlatformRole role, UUID grantedByUserId) {
        PlatformAdmin admin = new PlatformAdmin();
        admin.id = UUID.randomUUID();
        admin.userId = userId;
        admin.role = role;
        admin.grantedByUserId = grantedByUserId;
        admin.grantedAt = Instant.now();
        return admin;
    }

    public void revoke(UUID revokedByUserId) {
        if (revokedAt != null) {
            return;
        }
        this.revokedAt = Instant.now();
        this.revokedByUserId = revokedByUserId;
    }

    public boolean isActive() {
        return revokedAt == null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public PlatformRole getRole() {
        return role;
    }

    public UUID getGrantedByUserId() {
        return grantedByUserId;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public UUID getRevokedByUserId() {
        return revokedByUserId;
    }
}
