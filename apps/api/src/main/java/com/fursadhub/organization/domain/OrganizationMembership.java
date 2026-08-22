package com.fursadhub.organization.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A user's staff role at one organization (CLAUDE.md section 3/26). Mirrors
 * {@code UniversityMembership}: a user has at most one active membership per organization at a
 * time; revoking preserves history rather than deleting the row.
 */
@Entity
@Table(name = "organization_memberships")
public class OrganizationMembership {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private OrganizationRole role;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected OrganizationMembership() {
    }

    public static OrganizationMembership assign(UUID organizationId, UUID userId, OrganizationRole role) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.id = UUID.randomUUID();
        membership.organizationId = organizationId;
        membership.userId = userId;
        membership.role = role;
        membership.assignedAt = Instant.now();
        return membership;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }

    public boolean isActive() {
        return revokedAt == null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getUserId() {
        return userId;
    }

    public OrganizationRole getRole() {
        return role;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }
}
