package com.fursadhub.internshipmanagement.api;

import jakarta.validation.constraints.NotNull;

/**
 * The five — and only five — completion requirements (CLAUDE.md section 41).
 *
 * <p>Every field is explicitly required rather than defaulted, so a client that omits one is told
 * so instead of silently disabling a requirement the university meant to keep.
 */
public record InternshipPolicyRequest(
        @NotNull Boolean weeklyLogsRequired,
        @NotNull Boolean attendanceRequired,
        @NotNull Boolean organizationEvaluationRequired,
        @NotNull Boolean finalReportRequired,
        @NotNull Boolean defenseRequired) {
}
