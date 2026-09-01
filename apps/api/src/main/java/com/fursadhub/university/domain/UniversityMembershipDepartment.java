package com.fursadhub.university.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Department scope for a {@code DEPARTMENT_COORDINATOR}/{@code UNIVERSITY_SUPERVISOR} membership
 * (CLAUDE.md section 25 — "department isolation is a critical backend security boundary").
 * {@code UNIVERSITY_ADMIN} memberships never need a row here since admins hold whole-university
 * scope by role alone.
 */
@Entity
@Table(name = "university_membership_departments")
public class UniversityMembershipDepartment {

    @Id
    private UUID id;

    @Column(name = "membership_id", nullable = false)
    private UUID membershipId;

    @Column(name = "department_id", nullable = false)
    private UUID departmentId;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Column(name = "removed_at")
    private Instant removedAt;

    protected UniversityMembershipDepartment() {
    }

    public static UniversityMembershipDepartment assign(UUID membershipId, UUID departmentId) {
        UniversityMembershipDepartment scope = new UniversityMembershipDepartment();
        scope.id = UUID.randomUUID();
        scope.membershipId = membershipId;
        scope.departmentId = departmentId;
        scope.assignedAt = Instant.now();
        return scope;
    }

    /** Ends this department's scope without deleting the row, preserving assignment history. */
    public void remove() {
        this.removedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getMembershipId() {
        return membershipId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public Instant getRemovedAt() {
        return removedAt;
    }
}
