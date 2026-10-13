package com.fursadhub.administration.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * One individually granted {@link PlatformPermission} (Phase C1), on top of whatever roles the staff
 * member holds. Only grantable permissions can be stored — enforced here and by PostgreSQL.
 * Revocation is a soft close, like {@link PlatformStaffRoleAssignment}.
 */
@Entity
@Table(name = "platform_staff_permission_grants")
public class PlatformStaffPermissionGrant {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private PlatformPermission permission;

    @Column(name = "granted_by_user_id", nullable = false)
    private UUID grantedByUserId;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by_user_id")
    private UUID revokedByUserId;

    protected PlatformStaffPermissionGrant() {
    }

    public static PlatformStaffPermissionGrant grant(UUID userId, PlatformPermission permission, UUID grantedByUserId) {
        if (permission == null || !permission.isGrantable()) {
            throw new ApiException("PLATFORM_PERMISSION_NOT_GRANTABLE", HttpStatus.BAD_REQUEST,
                    "That permission cannot be assigned.");
        }
        if (userId.equals(grantedByUserId)) {
            throw new ApiException("PLATFORM_SELF_GRANT_FORBIDDEN", HttpStatus.FORBIDDEN,
                    "You cannot grant platform access to yourself.");
        }
        PlatformStaffPermissionGrant grant = new PlatformStaffPermissionGrant();
        grant.id = UUID.randomUUID();
        grant.userId = userId;
        grant.permission = permission;
        grant.grantedByUserId = grantedByUserId;
        grant.grantedAt = Instant.now();
        return grant;
    }

    /** Idempotent. */
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

    public PlatformPermission getPermission() {
        return permission;
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
