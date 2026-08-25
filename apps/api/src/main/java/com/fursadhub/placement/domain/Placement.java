package com.fursadhub.placement.domain;

import com.fursadhub.common.api.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * An internship placement (CLAUDE.md section 39).
 *
 * <p>A placement comes into existence in exactly ONE way — {@link #planFromAcceptedOffer} inside the
 * Phase 4 offer-acceptance transaction — and {@code UNIQUE(candidacy_id)} in the database is the
 * hard guarantee behind that. Phase 5 adds the lifecycle on top of that same row; it deliberately
 * introduces no second creation pathway.
 *
 * <p>Every state change is an explicit named command ({@link #start()}, {@link #cancel},
 * {@link #terminate}, {@link #requestCompletion()}, {@link #complete()}) validated against
 * {@link #ALLOWED_TRANSITIONS}. There is intentionally no {@code setStatus}, so no controller or
 * service can push a placement into an arbitrary state (CLAUDE.md section 10/33).
 *
 * <p>University and department are stored on the placement itself rather than resolved live through
 * the student's current enrollment, so a historical placement stays tied to the academic context it
 * was actually served under (CLAUDE.md section 39). Editing a student's profile or enrollment later
 * cannot rewrite who owns this placement.
 */
@Entity
@Table(name = "placements")
public class Placement {

    /**
     * The frozen transition table (CLAUDE.md section 39). The three terminal states — COMPLETED,
     * CANCELLED, TERMINATED — are absent as keys and therefore accept nothing, which is what makes
     * COMPLETED/CANCELLED/TERMINATED to ACTIVE|PLANNED impossible rather than merely discouraged.
     *
     * <p>CANCELLED and TERMINATED are NOT interchangeable: cancelling is only reachable from
     * PLANNED (the internship never properly started) and terminating only from ACTIVE or
     * COMPLETION_PENDING (it started, then ended early).
     */
    private static final Map<PlacementStatus, Set<PlacementStatus>> ALLOWED_TRANSITIONS = Map.of(
            PlacementStatus.PLANNED, EnumSet.of(PlacementStatus.ACTIVE, PlacementStatus.CANCELLED),
            PlacementStatus.ACTIVE, EnumSet.of(PlacementStatus.COMPLETION_PENDING, PlacementStatus.TERMINATED),
            PlacementStatus.COMPLETION_PENDING, EnumSet.of(PlacementStatus.COMPLETED, PlacementStatus.TERMINATED));

    /** Statuses that occupy the student, mirroring the partial unique index in V22. */
    private static final Set<PlacementStatus> LIVE = EnumSet.of(
            PlacementStatus.PLANNED, PlacementStatus.ACTIVE, PlacementStatus.COMPLETION_PENDING);

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

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completion_requested_at")
    private Instant completionRequestedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "terminated_at")
    private Instant terminatedAt;

    @Column(name = "cancellation_reason", length = 1000)
    private String cancellationReason;

    @Column(name = "termination_reason", length = 1000)
    private String terminationReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Optimistic lock. Lifecycle commands additionally take a pessimistic {@code SELECT ... FOR
     * UPDATE} on this row (see {@code PlacementRepository#findByIdForUpdate}); this version column
     * is the second line of defence for any path that reads without locking.
     */
    @Version
    @Column(nullable = false)
    private long version;

    protected Placement() {
    }

    /** The only way a placement comes into existence: an accepted internship offer (Phase 4). */
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

    // ------------------------------------------------------------------ lifecycle commands

    /** PLANNED to ACTIVE. The internship has actually begun. */
    public void start() {
        transitionTo(PlacementStatus.ACTIVE);
        this.startedAt = this.updatedAt;
    }

    /**
     * PLANNED to CANCELLED, for a placement that never properly started. A placement that has
     * already begun must be TERMINATED instead, and the transition table enforces that.
     */
    public void cancel(String reason) {
        transitionTo(PlacementStatus.CANCELLED);
        this.cancelledAt = this.updatedAt;
        this.cancellationReason = reason;
    }

    /** ACTIVE|COMPLETION_PENDING to TERMINATED. The internship started, then ended early. */
    public void terminate(String reason) {
        transitionTo(PlacementStatus.TERMINATED);
        this.terminatedAt = this.updatedAt;
        this.terminationReason = reason;
    }

    /**
     * ACTIVE to COMPLETION_PENDING. Phase 5 establishes the transition only; whether the
     * internship requirements (weekly logs, attendance, evaluation, final report, defense) are
     * actually satisfied is Phase 6 InternshipPolicy work and is deliberately not evaluated here.
     */
    public void requestCompletion() {
        transitionTo(PlacementStatus.COMPLETION_PENDING);
        this.completionRequestedAt = this.updatedAt;
    }

    /**
     * COMPLETION_PENDING to COMPLETED.
     *
     * <p>Deliberately NOT exposed through any Phase 5 REST endpoint: completing an internship must
     * be gated on the Phase 6 requirement checks, and shipping an unrestricted completion command
     * now would let callers bypass them. The transition lives here so Phase 6 can add its
     * validation in front of a state machine that is already correct and tested.
     */
    public void complete() {
        transitionTo(PlacementStatus.COMPLETED);
        this.completedAt = this.updatedAt;
    }

    private void transitionTo(PlacementStatus target) {
        Set<PlacementStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(status, Set.of());
        if (!allowed.contains(target)) {
            throw new ApiException("PLACEMENT_INVALID_TRANSITION", HttpStatus.CONFLICT,
                    "This placement cannot move to that state from its current state.");
        }
        this.status = target;
        this.updatedAt = Instant.now();
    }

    // ------------------------------------------------------------------ queries

    /** A live placement occupies the student; the terminal ones release them (CLAUDE.md section 38). */
    public boolean isLive() {
        return LIVE.contains(status);
    }

    public boolean isTerminal() {
        return !ALLOWED_TRANSITIONS.containsKey(status);
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

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletionRequestedAt() {
        return completionRequestedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public Instant getTerminatedAt() {
        return terminatedAt;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public String getTerminationReason() {
        return terminationReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }
}
