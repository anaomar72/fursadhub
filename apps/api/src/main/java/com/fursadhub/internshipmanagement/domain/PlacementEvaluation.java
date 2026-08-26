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
 * The organization supervisor's assessment of the student (CLAUDE.md section 44).
 *
 * <p>A FIXED V1 structure: six named 1-5 ratings and three free-text fields, as columns. This is
 * explicitly not a rubric builder — there is no criteria table, no question definitions and no JSON
 * bag of arbitrary items, because a configurable rubric is out of scope and would be far harder to
 * withdraw later than to avoid now.
 *
 * <p>FINAL is terminal. Once finalized the evaluation cannot be edited, resubmitted or reopened; the
 * transition table simply has no outgoing edge, so there is no code path to audit for that mistake.
 */
@Entity
@Table(name = "placement_evaluations")
public class PlacementEvaluation {

    private static final int MIN_RATING = 1;
    private static final int MAX_RATING = 5;

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "professionalism_rating")
    private Short professionalismRating;

    @Column(name = "reliability_rating")
    private Short reliabilityRating;

    @Column(name = "communication_rating")
    private Short communicationRating;

    @Column(name = "work_performance_rating")
    private Short workPerformanceRating;

    @Column(name = "teamwork_rating")
    private Short teamworkRating;

    @Column(name = "overall_rating")
    private Short overallRating;

    @Column(length = 2000)
    private String strengths;

    @Column(name = "improvement_areas", length = 2000)
    private String improvementAreas;

    @Column(name = "final_comments", length = 2000)
    private String finalComments;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EvaluationState state;

    /**
     * The supervisor who authored it. Kept even after they are reassigned, so a finished internship
     * still records who actually assessed the student (CLAUDE.md section 40).
     */
    @Column(name = "evaluator_user_id", nullable = false)
    private UUID evaluatorUserId;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "finalized_at")
    private Instant finalizedAt;

    @Column(name = "finalized_by")
    private UUID finalizedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected PlacementEvaluation() {
    }

    public static PlacementEvaluation createDraft(UUID placementId, UUID evaluatorUserId) {
        Instant now = Instant.now();
        PlacementEvaluation evaluation = new PlacementEvaluation();
        evaluation.id = UUID.randomUUID();
        evaluation.placementId = placementId;
        evaluation.evaluatorUserId = evaluatorUserId;
        evaluation.state = EvaluationState.DRAFT;
        evaluation.createdAt = now;
        evaluation.updatedAt = now;
        return evaluation;
    }

    // ------------------------------------------------------------------ commands

    /**
     * Edits the draft. Ratings may be left null while drafting; they become mandatory at submit, so
     * a supervisor can save progress without being forced to guess a score early.
     */
    public void edit(
            Short professionalism, Short reliability, Short communication, Short workPerformance,
            Short teamwork, Short overall, String strengths, String improvementAreas, String finalComments) {
        if (state != EvaluationState.DRAFT) {
            throw invalidTransition();
        }
        this.professionalismRating = validated(professionalism);
        this.reliabilityRating = validated(reliability);
        this.communicationRating = validated(communication);
        this.workPerformanceRating = validated(workPerformance);
        this.teamworkRating = validated(teamwork);
        this.overallRating = validated(overall);
        this.strengths = strengths;
        this.improvementAreas = improvementAreas;
        this.finalComments = finalComments;
        this.updatedAt = Instant.now();
    }

    /** DRAFT to SUBMITTED. Every rating must be present — a half-filled assessment is not one. */
    public void submit() {
        if (state != EvaluationState.DRAFT) {
            throw invalidTransition();
        }
        requireComplete();
        this.state = EvaluationState.SUBMITTED;
        this.updatedAt = Instant.now();
        this.submittedAt = this.updatedAt;
    }

    /** SUBMITTED to FINAL. Terminal — the evaluation can never be edited or reopened afterwards. */
    public void markFinal(UUID finalizedByUserId) {
        if (state != EvaluationState.SUBMITTED) {
            throw invalidTransition();
        }
        this.state = EvaluationState.FINAL;
        this.updatedAt = Instant.now();
        this.finalizedAt = this.updatedAt;
        this.finalizedBy = finalizedByUserId;
    }

    private Short validated(Short rating) {
        if (rating != null && (rating < MIN_RATING || rating > MAX_RATING)) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Ratings must be between " + MIN_RATING + " and " + MAX_RATING + ".");
        }
        return rating;
    }

    private void requireComplete() {
        boolean complete = professionalismRating != null && reliabilityRating != null
                && communicationRating != null && workPerformanceRating != null
                && teamworkRating != null && overallRating != null;
        if (!complete) {
            throw new ApiException("EVALUATION_INCOMPLETE", HttpStatus.BAD_REQUEST,
                    "Every rating must be given before the evaluation can be submitted.");
        }
    }

    private ApiException invalidTransition() {
        return new ApiException("EVALUATION_INVALID_TRANSITION", HttpStatus.CONFLICT,
                "This evaluation cannot move to that state from its current state.");
    }

    // ------------------------------------------------------------------ queries

    /** FINAL is the only state that satisfies the organization-evaluation requirement. */
    public boolean countsTowardsCompletion() {
        return state == EvaluationState.FINAL;
    }

    /** The student sees the assessment only once it is FINAL, never mid-draft or mid-review. */
    public boolean isVisibleToStudent() {
        return state == EvaluationState.FINAL;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPlacementId() {
        return placementId;
    }

    public Short getProfessionalismRating() {
        return professionalismRating;
    }

    public Short getReliabilityRating() {
        return reliabilityRating;
    }

    public Short getCommunicationRating() {
        return communicationRating;
    }

    public Short getWorkPerformanceRating() {
        return workPerformanceRating;
    }

    public Short getTeamworkRating() {
        return teamworkRating;
    }

    public Short getOverallRating() {
        return overallRating;
    }

    public String getStrengths() {
        return strengths;
    }

    public String getImprovementAreas() {
        return improvementAreas;
    }

    public String getFinalComments() {
        return finalComments;
    }

    public EvaluationState getState() {
        return state;
    }

    public UUID getEvaluatorUserId() {
        return evaluatorUserId;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getFinalizedAt() {
        return finalizedAt;
    }

    public UUID getFinalizedBy() {
        return finalizedBy;
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
