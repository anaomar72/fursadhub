package com.fursadhub.opportunity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** A department, within the target university, eligible for this opportunity target (CLAUDE.md section 10). */
@Entity
@Table(name = "opportunity_target_departments")
public class OpportunityTargetDepartment {

    @Id
    private UUID id;

    @Column(name = "opportunity_target_id", nullable = false)
    private UUID opportunityTargetId;

    @Column(name = "department_id", nullable = false)
    private UUID departmentId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OpportunityTargetDepartment() {
    }

    public static OpportunityTargetDepartment create(UUID opportunityTargetId, UUID departmentId) {
        OpportunityTargetDepartment entry = new OpportunityTargetDepartment();
        entry.id = UUID.randomUUID();
        entry.opportunityTargetId = opportunityTargetId;
        entry.departmentId = departmentId;
        entry.createdAt = Instant.now();
        return entry;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOpportunityTargetId() {
        return opportunityTargetId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
