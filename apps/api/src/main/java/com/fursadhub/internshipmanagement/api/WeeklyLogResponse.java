package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.WeeklyLog;

import java.time.Instant;

/** The weekly log as every area renders it (CLAUDE.md section 6 — JPA entities are never exposed). */
public record WeeklyLogResponse(
        String id,
        String placementId,
        int weekNumber,
        String periodStart,
        String periodEnd,
        String summary,
        String activities,
        String challenges,
        String learningOutcomes,
        String state,
        String submittedAt,
        String reviewedAt,
        String reviewComment,
        boolean editable,
        String createdAt,
        String updatedAt) {

    public static WeeklyLogResponse from(WeeklyLog log) {
        return new WeeklyLogResponse(
                log.getId().toString(),
                log.getPlacementId().toString(),
                log.getWeekNumber(),
                log.getPeriodStart().toString(),
                log.getPeriodEnd().toString(),
                log.getSummary(),
                log.getActivities(),
                log.getChallenges(),
                log.getLearningOutcomes(),
                log.getState().name(),
                text(log.getSubmittedAt()),
                text(log.getReviewedAt()),
                log.getReviewComment(),
                log.isEditable(),
                log.getCreatedAt().toString(),
                log.getUpdatedAt().toString());
    }

    private static String text(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
