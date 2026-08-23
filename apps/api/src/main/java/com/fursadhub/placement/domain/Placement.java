package com.fursadhub.placement.domain;

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
 * An internship placement (CLAUDE.md section 39).
 *
 * <p>Phase 4 scope is deliberately narrow: this entity exists only so a successful offer acceptance
 * can create exactly one {@code PLANNED} placement inside that atomic transaction, which is a
 * frozen requirement (CLAUDE.md section 38). The rest of the lifecycle — start, cancel, terminate,
 * completion request/complete, supervisor assignment and history — is Phase 5 scope and is
 * intentionally NOT implemented here.
 *
 * <p>University and department are stored on the placement itself rather than resolved live through
 * the student's current enrollment, so a historical placement stays tied to the academic context it
 * was actually served under.
 */
@Entity
@Table(name = "placements")
public class Placement {

    @Id
    private UUID id;

    @Column(name = "candidacy_id", nullable = false)
    private UUID candidacyId;

    @Column(name = "offer_id", nullable = false)
    private UUID offerId;

    @Column(name = "opportunity_id", nullable = false)
    private UUID opportunityId;

    @Column(name = "student_user_id", nullable = false)
    private UUID studentUserId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "university_id", nullable = false)
    private UUID universityId;

    @Column(name = "department_id", nullable = false)
    private UUID departmentId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(length = 255)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlacementStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Placement() {
    }

    /** The only way a placement comes into existence in Phase 4: an accepted internship offer. */
    public static Placement planFromAcceptedOffer(
            UUID candidacyId, UUID offerId, UUID opportunityId, UUID studentUserId, UUID organizationId,
            UUID universityId, UUID departmentId, LocalDate startDate, LocalDate endDate, String location) {
        Instant now = Instant.now();
        Placement placement = new Placement();
        placement.id = UUID.randomUUID();
        placement.candidacyId = candidacyId;
        placement.offerId = offerId;
        placement.opportunityId = opportunityId;
        placement.studentUserId = studentUserId;
        placement.organizationId = organizationId;
        placement.universityId = universityId;
        placement.departmentId = departmentId;
        placement.startDate = startDate;
        placement.endDate = endDate;
        placement.location = location;
        placement.status = PlacementStatus.PLANNED;
        placement.createdAt = now;
        placement.updatedAt = now;
        return placement;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidacyId() {
        return candidacyId;
    }

    public UUID getOfferId() {
        return offerId;
    }

    public UUID getOpportunityId() {
        return opportunityId;
    }

    public UUID getStudentUserId() {
        return studentUserId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getUniversityId() {
        return universityId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getLocation() {
        return location;
    }

    public PlacementStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
