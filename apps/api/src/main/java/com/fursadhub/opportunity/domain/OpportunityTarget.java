package com.fursadhub.opportunity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One university targeted by a {@code UNIVERSITY_TARGETED}/{@code HYBRID} opportunity (CLAUDE.md
 * section 34). {@code requestedNominees} is deliberately separate from the opportunity's {@code
 * numberOfOpenings} — an organization may ask a university for more nominees than it has openings.
 */
@Entity
@Table(name = "opportunity_targets")
public class OpportunityTarget {

    @Id
    private UUID id;

    @Column(name = "opportunity_id", nullable = false)
    private UUID opportunityId;

    @Column(name = "university_id", nullable = false)
    private UUID universityId;

    @Column(name = "requested_nominees", nullable = false)
    private int requestedNominees;

    @Column(name = "nomination_deadline", nullable = false)
    private LocalDate nominationDeadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OpportunityTargetStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OpportunityTarget() {
    }

    public static OpportunityTarget create(UUID opportunityId, UUID universityId, int requestedNominees, LocalDate nominationDeadline) {
        OpportunityTarget target = new OpportunityTarget();
        target.id = UUID.randomUUID();
        target.opportunityId = opportunityId;
        target.universityId = universityId;
        target.requestedNominees = requestedNominees;
        target.nominationDeadline = nominationDeadline;
        target.status = OpportunityTargetStatus.REQUESTED;
        target.createdAt = Instant.now();
        return target;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOpportunityId() {
        return opportunityId;
    }

    public UUID getUniversityId() {
        return universityId;
    }

    public int getRequestedNominees() {
        return requestedNominees;
    }

    public LocalDate getNominationDeadline() {
        return nominationDeadline;
    }

    public OpportunityTargetStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
