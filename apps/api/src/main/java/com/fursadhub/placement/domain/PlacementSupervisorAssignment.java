package com.fursadhub.placement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

/**
 * One supervisor assignment on a placement, as an append-only history (CLAUDE.md section 40).
 *
 * <p>Supervisors are deliberately NOT modelled as {@code university_supervisor_id} /
 * {@code organization_supervisor_id} columns on the placement: overwriting such a column would
 * destroy the record of who actually supervised the student over a given period, which matters for
 * evaluation and defense later. Instead, reassignment closes the current row by stamping
 * {@link #removedAt} and inserts a new one — nothing is ever deleted or rewritten.
 *
 * <p>"Currently assigned" therefore means {@code removed_at IS NULL}, and a partial unique index on
 * {@code (placement_id, type) WHERE removed_at IS NULL} makes at-most-one-active-per-type a database
 * guarantee rather than only a service-layer check.
 */
@Entity
@Table(name = "placement_supervisor_assignments")
public class PlacementSupervisorAssignment {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "supervisor_user_id", nullable = false)
    private UUID supervisorUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SupervisorType type;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Column(name = "removed_at")
    private Instant removedAt;

    /** The staff member who performed the assignment — audit context, never the supervisor. */
    @Column(name = "assigned_by", nullable = false)
    private UUID assignedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected PlacementSupervisorAssignment() {
    }

    public static PlacementSupervisorAssignment assign(
            UUID placementId, UUID supervisorUserId, SupervisorType type, UUID assignedBy) {
        Instant now = Instant.now();
        PlacementSupervisorAssignment assignment = new PlacementSupervisorAssignment();
        assignment.id = UUID.randomUUID();
        assignment.placementId = placementId;
        assignment.supervisorUserId = supervisorUserId;
        assignment.type = type;
        assignment.assignedAt = now;
        assignment.assignedBy = assignedBy;
        assignment.createdAt = now;
        return assignment;
    }

    /**
     * Closes this assignment. The row itself stays in the table forever — this only stamps the end
     * of the period during which this supervisor was responsible for the placement.
     */
    public void remove() {
        if (removedAt == null) {
            this.removedAt = Instant.now();
        }
    }

    public boolean isActive() {
        return removedAt == null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPlacementId() {
        return placementId;
    }

    public UUID getSupervisorUserId() {
        return supervisorUserId;
    }

    public SupervisorType getType() {
        return type;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Instant getRemovedAt() {
        return removedAt;
    }

    public UUID getAssignedBy() {
        return assignedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public long getVersion() {
        return version;
    }
}
