package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.application.ScreeningQuestionService;
import com.fursadhub.opportunity.domain.ScreeningQuestionChoice;

import java.util.List;

/** Screening question as returned to both organization staff and applying students. */
public record ScreeningQuestionResponse(
        String id,
        String prompt,
        String type,
        boolean required,
        int position,
        List<String> choices) {

    public static ScreeningQuestionResponse from(ScreeningQuestionService.QuestionWithChoices entry) {
        return new ScreeningQuestionResponse(
                entry.question().getId().toString(),
                entry.question().getPrompt(),
                entry.question().getType().name(),
                entry.question().isRequired(),
                entry.question().getPosition(),
                entry.choices().stream().map(ScreeningQuestionChoice::getLabel).toList());
    }
}
