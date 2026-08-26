package com.fursadhub.internshipmanagement.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Creating a weekly log.
 *
 * <p>Notice there is no period_start/period_end here: the period is derived on the backend from the
 * placement's start date and the week number, so a client cannot file a log covering dates outside
 * the internship (Phase 6 section 25).
 */
public record WeeklyLogRequest(
        @NotNull @Positive Integer weekNumber,
        @NotBlank @Size(max = 2000) String summary,
        @Size(max = 4000) String activities,
        @Size(max = 2000) String challenges,
        @Size(max = 2000) String learningOutcomes) {
}
