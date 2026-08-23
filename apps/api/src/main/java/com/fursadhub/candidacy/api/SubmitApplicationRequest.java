package com.fursadhub.candidacy.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Self-application body. Deliberately carries NO student/user id — the applicant is always the
 * authenticated caller (CLAUDE.md section 12).
 */
public record SubmitApplicationRequest(
        @Size(max = 5) @Valid List<ScreeningAnswerRequest> answers) {

    public record ScreeningAnswerRequest(
            @NotNull UUID questionId,
            @Size(max = 4000) String answer) {
    }
}
