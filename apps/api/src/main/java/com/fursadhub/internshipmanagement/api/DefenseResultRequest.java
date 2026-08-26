package com.fursadhub.internshipmanagement.api;

import com.fursadhub.internshipmanagement.domain.DefenseResult;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The panel's verdict on one attempt.
 *
 * <p>Recording RETAKE_REQUIRED does not reopen this attempt — it completes it. The university then
 * schedules a NEW attempt, and this one stays exactly as recorded (CLAUDE.md section 46).
 */
public record DefenseResultRequest(
        @NotNull DefenseResult result,
        @Size(max = 2000) String panelNotes) {
}
