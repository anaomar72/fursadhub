package com.fursadhub.internshipmanagement.domain;

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
 * One week of the student's internship diary (CLAUDE.md section 42).
 *
 * <p>The state machine is frozen and lives here, not in the service: DRAFT and RETURNED_FOR_CHANGES
 * are the only editable states, only the student submits, and only an authorized university actor
 * reviews or returns. There is no {@code setState}, so no controller can push a log into REVIEWED
 * without going through {@link #review}.
 *
 * <p>Review history is stamped rather than replaced. Returning a log for changes keeps the comment
 * that explained why, and a later review overwrites only the fields belonging to that new decision.
 */
@Entity
@Table(name = "weekly_logs")
public class WeeklyLog {

    /**
     * The frozen transition table (CLAUDE.md section 42). REVIEWED is absent as a key and therefore
     * accepts nothing: a reviewed log is finished, and reopening it would need an explicit business
     * rule that does not exist.
     */
    private static final Map<WeeklyLogState, Set<WeeklyLogState>> ALLOWED_TRANSITIONS = Map.of(
            WeeklyLogState.DRAFT, EnumSet.of(WeeklyLogState.SUBMITTED),
            WeeklyLogState.SUBMITTED, EnumSet.of(WeeklyLogState.REVIEWED, WeeklyLogState.RETURNED_FOR_CHANGES),
            WeeklyLogState.RETURNED_FOR_CHANGES, EnumSet.of(WeeklyLogState.SUBMITTED));

    /** The states in which the student may still edit their own content. */
    private static final Set<WeeklyLogState> EDITABLE =
            EnumSet.of(WeeklyLogState.DRAFT, WeeklyLogState.RETURNED_FOR_CHANGES);

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    /** 1-based, relative to the placement's own start date. See {@code WeeklyLogPeriods}. */
    @Column(name = "week_number", nullable = false)
    private int weekNumber;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(nullable = false, length = 2000)
    private String summary;

    @Column(length = 4000)
    private String activities;

    @Column(length = 2000)
    private String challenges;

    @Column(name = "learning_outcomes", length = 2000)
    private String learningOutcomes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WeeklyLogState state;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "review_comment", length = 2000)
    private String reviewComment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected WeeklyLog() {
    }

    public static WeeklyLog createDraft(
            UUID placementId, int weekNumber, LocalDate periodStart, LocalDate periodEnd,
            String summary, String activities, String challenges, String learningOutcomes) {
        Instant now = Instant.now();
        WeeklyLog log = new WeeklyLog();
        log.id = UUID.randomUUID();
        log.placementId = placementId;
        log.weekNumber = weekNumber;
        log.periodStart = periodStart;
        log.periodEnd = periodEnd;
        log.summary = summary;
        log.activities = activities;
        log.challenges = challenges;
        log.learningOutcomes = learningOutcomes;
        log.state = WeeklyLogState.DRAFT;
        log.createdAt = now;
        log.updatedAt = now;
        return log;
    }

    // ------------------------------------------------------------------ student commands

    /**
     * Edits the student's own content. Permitted only in DRAFT and RETURNED_FOR_CHANGES — a
     * SUBMITTED log is with the supervisor, and a REVIEWED one is finished.
     */
    public void edit(String summary, String activities, String challenges, String learningOutcomes) {
        if (!EDITABLE.contains(state)) {
            throw invalidTransition();
        }
        this.summary = summary;
        this.activities = activities;
        this.challenges = challenges;
        this.learningOutcomes = learningOutcomes;
        this.updatedAt = Instant.now();
    }

    /** DRAFT or RETURNED_FOR_CHANGES to SUBMITTED. */
    public void submit() {
        transitionTo(WeeklyLogState.SUBMITTED);
        this.submittedAt = this.updatedAt;
        // A resubmission answers the previous return, so the outgoing review decision is cleared —
        // but only after the student has actually acted on it.
        this.reviewedAt = null;
        this.reviewedBy = null;
    }

    // ------------------------------------------------------------------ supervisor commands

    /** SUBMITTED to REVIEWED — the supervisor accepts the log. Terminal. */
    public void review(UUID reviewerUserId, String comment) {
        transitionTo(WeeklyLogState.REVIEWED);
        this.reviewedAt = this.updatedAt;
        this.reviewedBy = reviewerUserId;
        this.reviewComment = comment;
    }

    /** SUBMITTED to RETURNED_FOR_CHANGES — the student must revise and resubmit. */
    public void returnForChanges(UUID reviewerUserId, String comment) {
        transitionTo(WeeklyLogState.RETURNED_FOR_CHANGES);
        this.reviewedAt = this.updatedAt;
        this.reviewedBy = reviewerUserId;
        this.reviewComment = comment;
    }

    private void transitionTo(WeeklyLogState target) {
        if (!ALLOWED_TRANSITIONS.getOrDefault(state, Set.of()).contains(target)) {
            throw invalidTransition();
        }
        this.state = target;
        this.updatedAt = Instant.now();
    }

    private ApiException invalidTransition() {
        return new ApiException("WEEKLY_LOG_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This weekly log cannot move to that state from its current state.");
    }

    // ------------------------------------------------------------------ queries

    public boolean isEditable() {
        return EDITABLE.contains(state);
    }

    /** REVIEWED is the accepted completion state for the weekly-logs requirement (Phase 6 section 22). */
    public boolean countsTowardsCompletion() {
        return state == WeeklyLogState.REVIEWED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPlacementId() {
        return placementId;
    }

    public int getWeekNumber() {
        return weekNumber;
    }

    public LocalDate getPeriodStart() {
        return periodStart;
    }

    public LocalDate getPeriodEnd() {
        return periodEnd;
    }

    public String getSummary() {
        return summary;
    }

    public String getActivities() {
        return activities;
    }

    public String getChallenges() {
        return challenges;
    }

    public String getLearningOutcomes() {
        return learningOutcomes;
    }

    public WeeklyLogState getState() {
        return state;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public UUID getReviewedBy() {
        return reviewedBy;
    }

    public String getReviewComment() {
        return reviewComment;
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
