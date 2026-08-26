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
import java.util.UUID;

/**
 * One defense attempt (CLAUDE.md section 46).
 *
 * <p>Attempts are never overwritten. A retake inserts attempt N+1 while attempt N keeps its own
 * state, result and panel notes forever — which is why there is deliberately no transition back to
 * SCHEDULED and no "current attempt" pointer on the placement. A pointer column is exactly how
 * defense history gets destroyed.
 *
 * <p>COMPLETED and CANCELLED are both terminal, and a result exists only on a COMPLETED attempt, so
 * the completion check can never be misled by a result attached to an attempt that was never held.
 */
@Entity
@Table(name = "defense_attempts")
public class DefenseAttempt {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    /** 1-based and strictly increasing per placement; UNIQUE(placement_id, attempt_number) in V30. */
    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    /** A scheduled point in time, so an {@link Instant} rather than a business date. */
    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "location_details", length = 500)
    private String locationDetails;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DefenseAttemptState state;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DefenseResult result;

    @Column(name = "panel_notes", length = 2000)
    private String panelNotes;

    @Column(name = "scheduled_by", nullable = false)
    private UUID scheduledBy;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "recorded_by")
    private UUID recordedBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected DefenseAttempt() {
    }

    public static DefenseAttempt schedule(
            UUID placementId, int attemptNumber, Instant scheduledAt, String locationDetails, UUID scheduledBy) {
        Instant now = Instant.now();
        DefenseAttempt attempt = new DefenseAttempt();
        attempt.id = UUID.randomUUID();
        attempt.placementId = placementId;
        attempt.attemptNumber = attemptNumber;
        attempt.scheduledAt = scheduledAt;
        attempt.locationDetails = locationDetails;
        attempt.state = DefenseAttemptState.SCHEDULED;
        attempt.scheduledBy = scheduledBy;
        attempt.createdAt = now;
        attempt.updatedAt = now;
        return attempt;
    }

    // ------------------------------------------------------------------ commands

    /**
     * SCHEDULED to COMPLETED, recording what the panel decided. Terminal in every case: a
     * RETAKE_REQUIRED outcome creates a NEW attempt rather than reopening this one.
     */
    public void recordResult(DefenseResult result, String panelNotes, UUID recordedByUserId) {
        if (state != DefenseAttemptState.SCHEDULED) {
            throw invalidTransition();
        }
        this.state = DefenseAttemptState.COMPLETED;
        this.result = result;
        this.panelNotes = panelNotes;
        this.recordedBy = recordedByUserId;
        this.updatedAt = Instant.now();
        this.completedAt = this.updatedAt;
    }

    /** SCHEDULED to CANCELLED — the sitting did not happen. Carries no result. */
    public void cancel() {
        if (state != DefenseAttemptState.SCHEDULED) {
            throw invalidTransition();
        }
        this.state = DefenseAttemptState.CANCELLED;
        this.updatedAt = Instant.now();
        this.cancelledAt = this.updatedAt;
    }

    private ApiException invalidTransition() {
        return new ApiException("DEFENSE_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This defense attempt cannot move to that state from its current state.");
    }

    // ------------------------------------------------------------------ queries

    /**
     * Only a COMPLETED attempt with a PASSED result satisfies the defense requirement. FAILED and
     * RETAKE_REQUIRED both leave it unmet (Phase 6 section 22).
     */
    public boolean countsTowardsCompletion() {
        return state == DefenseAttemptState.COMPLETED && result != null && result.isSuccessful();
    }

    public boolean isOpen() {
        return state == DefenseAttemptState.SCHEDULED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPlacementId() {
        return placementId;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public String getLocationDetails() {
        return locationDetails;
    }

    public DefenseAttemptState getState() {
        return state;
    }

    public DefenseResult getResult() {
        return result;
    }

    public String getPanelNotes() {
        return panelNotes;
    }

    public UUID getScheduledBy() {
        return scheduledBy;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public UUID getRecordedBy() {
        return recordedBy;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
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
