package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.AttendanceValue;
import jakarta.validation.constraints.Size;

/**
 * Settling a dispute, optionally correcting the recorded value.
 *
 * <p>A null {@code correctedValue} means "the original record stands" — the dispute is still marked
 * resolved and the student's reason is still preserved, because a rejected dispute is as much a
 * decision as an accepted one.
 */
public record ResolveAttendanceRequest(
        AttendanceValue correctedValue,
        @Size(max = 1000) String resolutionNote) {
}
