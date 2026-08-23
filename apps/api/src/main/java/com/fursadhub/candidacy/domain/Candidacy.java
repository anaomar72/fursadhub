package com.fursadhub.candidacy.domain;

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
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The single unified candidacy for one (opportunity, student) pair (CLAUDE.md section 36/37).
 *
 * <p>Public self-applications and university nominations converge into this one record — FursadHub
 * deliberately has no separate "applicants" and "nominees" pipelines. All state transitions live
 * here as explicit named commands validated against {@link #ALLOWED_TRANSITIONS}; there is
 * intentionally no {@code setStatus}, so no caller can push a candidacy into an arbitrary state
 * (CLAUDE.md section 10 — important business transitions are commands, not status mutation).
 *
 * <p>{@code INTERVIEW} is optional and valid workflows may skip intermediate stages: a candidacy
 * may go SUBMITTED -&gt; OFFERED directly, or SUBMITTED -&gt; REJECTED.
 */
@Entity
@Table(name = "candidacies")
public class Candidacy {

    /**
     * The frozen transition table (CLAUDE.md section 37). Terminal states (ACCEPTED, REJECTED,
     * WITHDRAWN, OFFER_DECLINED, OFFER_EXPIRED) are absent as keys and therefore accept nothing —
     * notably ACCEPTED, which is what stops a student withdrawing after a placement exists
     * (Phase 4 brief section 13).
     */
    private static final Map<CandidacyStatus, Set<CandidacyStatus>> ALLOWED_TRANSITIONS = Map.of(
            CandidacyStatus.SUBMITTED, EnumSet.of(
                    CandidacyStatus.UNDER_REVIEW, CandidacyStatus.SHORTLISTED, CandidacyStatus.INTERVIEW,
                    CandidacyStatus.OFFERED, CandidacyStatus.REJECTED, CandidacyStatus.WITHDRAWN),
            CandidacyStatus.UNDER_REVIEW, EnumSet.of(
                    CandidacyStatus.SHORTLISTED, CandidacyStatus.INTERVIEW, CandidacyStatus.OFFERED,
                    CandidacyStatus.REJECTED, CandidacyStatus.WITHDRAWN),
            CandidacyStatus.SHORTLISTED, EnumSet.of(
                    CandidacyStatus.INTERVIEW, CandidacyStatus.OFFERED, CandidacyStatus.REJECTED,
                    CandidacyStatus.WITHDRAWN),
            CandidacyStatus.INTERVIEW, EnumSet.of(
                    CandidacyStatus.OFFERED, CandidacyStatus.REJECTED, CandidacyStatus.WITHDRAWN),
            CandidacyStatus.OFFERED, EnumSet.of(
                    CandidacyStatus.ACCEPTED, CandidacyStatus.OFFER_DECLINED, CandidacyStatus.OFFER_EXPIRED,
                    CandidacyStatus.REJECTED, CandidacyStatus.WITHDRAWN),
            // A lapsed/declined offer returns the candidate to the pool so a recruiter may re-engage
            // them; the previous offer row is preserved as history either way.
            CandidacyStatus.OFFER_DECLINED, EnumSet.of(CandidacyStatus.REJECTED, CandidacyStatus.WITHDRAWN),
            CandidacyStatus.OFFER_EXPIRED, EnumSet.of(
                    CandidacyStatus.SHORTLISTED, CandidacyStatus.OFFERED, CandidacyStatus.REJECTED,
                    CandidacyStatus.WITHDRAWN));

    @Id
    private UUID id;

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CandidacySource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CandidacyStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Optimistic locking guards against two recruiters concurrently advancing the same candidacy
     * (e.g. one rejecting while another offers) — the second commit fails rather than silently
     * overwriting the first decision.
     */
    @Version
    @Column(nullable = false)
    private long version;

    protected Candidacy() {
    }

    public static Candidacy open(
            UUID opportunityId, UUID studentUserId, UUID organizationId, UUID universityId, UUID departmentId,
            CandidacySource source) {
        Instant now = Instant.now();
        Candidacy candidacy = new Candidacy();
        candidacy.id = UUID.randomUUID();
        candidacy.opportunityId = opportunityId;
        candidacy.studentUserId = studentUserId;
        candidacy.organizationId = organizationId;
        candidacy.universityId = universityId;
        candidacy.departmentId = departmentId;
        candidacy.source = source;
        candidacy.status = CandidacyStatus.SUBMITTED;
        candidacy.createdAt = now;
        candidacy.updatedAt = now;
        return candidacy;
    }

    /**
     * Folds an additional entry route into this candidacy (CLAUDE.md section 36 — apply + nominate
     * merges to BOTH rather than creating a second candidacy).
     *
     * @return true when the source actually changed, so the caller only appends a history event for
     *         a real merge and repeated calls stay idempotent.
     */
    public boolean mergeSource(CandidacySource incoming) {
        CandidacySource merged = source.merge(incoming);
        if (merged == source) {
            return false;
        }
        this.source = merged;
        this.updatedAt = Instant.now();
        return true;
    }

    public void markUnderReview() {
        transitionTo(CandidacyStatus.UNDER_REVIEW);
    }

    public void shortlist() {
        transitionTo(CandidacyStatus.SHORTLISTED);
    }

    public void moveToInterview() {
        transitionTo(CandidacyStatus.INTERVIEW);
    }

    public void markOffered() {
        transitionTo(CandidacyStatus.OFFERED);
    }

    public void markOfferAccepted() {
        transitionTo(CandidacyStatus.ACCEPTED);
    }

    public void markOfferDeclined() {
        transitionTo(CandidacyStatus.OFFER_DECLINED);
    }

    public void markOfferExpired() {
        transitionTo(CandidacyStatus.OFFER_EXPIRED);
    }

    public void reject() {
        transitionTo(CandidacyStatus.REJECTED);
    }

    public void withdraw() {
        transitionTo(CandidacyStatus.WITHDRAWN);
    }

    /** True once the candidacy has reached a state no further transition can leave. */
    public boolean isClosed() {
        return !ALLOWED_TRANSITIONS.containsKey(status);
    }

    private void transitionTo(CandidacyStatus target) {
        Set<CandidacyStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(status, Set.of());
        if (!allowed.contains(target)) {
            throw new ApiException("CANDIDACY_INVALID_TRANSITION", HttpStatus.CONFLICT,
                    "This candidacy cannot move to that stage from its current state.");
        }
        this.status = target;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
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

    public CandidacySource getSource() {
        return source;
    }

    public CandidacyStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
