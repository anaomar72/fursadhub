package com.fursadhub.internshipmanagement.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Scheduling a defense sitting.
 *
 * <p>{@code scheduledAt} is an {@link Instant} — a point in time, stored in UTC — because a defense
 * happens at a moment, not on a date (CLAUDE.md section 53).
 */
public record ScheduleDefenseRequest(
        @NotNull Instant scheduledAt,
        @Size(max = 500) String locationDetails) {
}
