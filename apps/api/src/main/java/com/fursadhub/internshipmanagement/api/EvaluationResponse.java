package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.PlacementEvaluation;

import java.time.Instant;

/**
 * The evaluation as an authorized party renders it.
 *
 * <p>The student only ever receives this once the evaluation is FINAL; the service filters it out
 * beforehand, so a draft assessment is never serialized to them at all.
 */
public record EvaluationResponse(
        String id,
        String placementId,
        Short professionalismRating,
        Short reliabilityRating,
        Short communicationRating,
        Short workPerformanceRating,
        Short teamworkRating,
        Short overallRating,
        String strengths,
        String improvementAreas,
        String finalComments,
        String state,
        String submittedAt,
        String finalizedAt,
        String createdAt,
        String updatedAt) {

    public static EvaluationResponse from(PlacementEvaluation evaluation) {
        return new EvaluationResponse(
                evaluation.getId().toString(),
                evaluation.getPlacementId().toString(),
                evaluation.getProfessionalismRating(),
                evaluation.getReliabilityRating(),
                evaluation.getCommunicationRating(),
                evaluation.getWorkPerformanceRating(),
                evaluation.getTeamworkRating(),
                evaluation.getOverallRating(),
                evaluation.getStrengths(),
                evaluation.getImprovementAreas(),
                evaluation.getFinalComments(),
                evaluation.getState().name(),
                text(evaluation.getSubmittedAt()),
                text(evaluation.getFinalizedAt()),
                evaluation.getCreatedAt().toString(),
                evaluation.getUpdatedAt().toString());
    }

    private static String text(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
