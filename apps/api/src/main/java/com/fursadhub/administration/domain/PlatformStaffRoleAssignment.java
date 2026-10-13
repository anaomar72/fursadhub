package com.fursadhub.administration.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Assigns a {@link PlatformCustomRole} to a platform staff member (Phase C1). Revocation is a soft
 * close — the row and who granted/revoked it remain — so access history is never overwritten
 * (CLAUDE.md section 51).
 */
@Entity
@Table(name = "platform_staff_role_assignments")
public class PlatformStaffRoleAssignment {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "custom_role_id", nullable = false)
    private UUID customRoleId;

    @Column(name = "granted_by_user_id", nullable = false)
    private UUID grantedByUserId;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by_user_id")
    private UUID revokedByUserId;

    protected PlatformStaffRoleAssignment() {
    }

    public static PlatformStaffRoleAssignment assign(UUID userId, UUID customRoleId, UUID grantedByUserId) {
        if (userId.equals(grantedByUserId)) {
            throw new ApiException("PLATFORM_SELF_GRANT_FORBIDDEN", HttpStatus.FORBIDDEN,
                    "You cannot grant platform access to yourself.");
        }
        PlatformStaffRoleAssignment assignment = new PlatformStaffRoleAssignment();
        assignment.id = UUID.randomUUID();
        assignment.userId = userId;
        assignment.customRoleId = customRoleId;
        assignment.grantedByUserId = grantedByUserId;
        assignment.grantedAt = Instant.now();
        return assignment;
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

    public UUID getCustomRoleId() {
        return customRoleId;
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
