package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.DefenseAttempt;

import java.time.Instant;

/** One preserved defense attempt. Past attempts are always returned alongside the current one. */
public record DefenseAttemptResponse(
        String id,
        String placementId,
        int attemptNumber,
        String scheduledAt,
        String locationDetails,
        String state,
        String result,
        String panelNotes,
        String completedAt,
        String cancelledAt,
        String createdAt) {

    public static DefenseAttemptResponse from(DefenseAttempt attempt) {
        return new DefenseAttemptResponse(
                attempt.getId().toString(),
                attempt.getPlacementId().toString(),
                attempt.getAttemptNumber(),
                attempt.getScheduledAt().toString(),
                attempt.getLocationDetails(),
                attempt.getState().name(),
                attempt.getResult() == null ? null : attempt.getResult().name(),
                attempt.getPanelNotes(),
                text(attempt.getCompletedAt()),
                text(attempt.getCancelledAt()),
                attempt.getCreatedAt().toString());
    }

    private static String text(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
