package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.ScreeningQuestionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateScreeningQuestionRequest(
        @NotBlank @Size(max = 500) String prompt,
        @NotNull ScreeningQuestionType type,
        boolean required,
        @Size(max = 10) List<@Size(max = 200) String> choices) {
}
