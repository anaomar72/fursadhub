package com.fursadhub.university.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A user's staff role at one university (CLAUDE.md section 25). A user has at most one active
 * membership per university at a time; revoking preserves history rather than deleting the row
 * (CLAUDE.md section 40 applies the same "do not overwrite, track assigned_at/removed_at"
 * principle to staff assignment history).
 */
@Entity
@Table(name = "university_memberships")
public class UniversityMembership {

    @Id
    private UUID id;

    @Column(name = "university_id", nullable = false)
    private UUID universityId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private UniversityRole role;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected UniversityMembership() {
    }

    public static UniversityMembership assign(UUID universityId, UUID userId, UniversityRole role) {
        UniversityMembership membership = new UniversityMembership();
        membership.id = UUID.randomUUID();
        membership.universityId = universityId;
        membership.userId = userId;
        membership.role = role;
        membership.assignedAt = Instant.now();
        return membership;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }

    /** Changes the staff role in place, preserving the membership row's identity and history. */
    public void changeRole(UniversityRole newRole) {
        this.role = newRole;
    }

    public boolean isActive() {
        return revokedAt == null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUniversityId() {
        return universityId;
    }

    public UUID getUserId() {
        return userId;
    }

    public UniversityRole getRole() {
        return role;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }
}
