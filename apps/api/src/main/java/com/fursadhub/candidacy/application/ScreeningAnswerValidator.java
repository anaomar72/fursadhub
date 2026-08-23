package com.fursadhub.candidacy.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.application.ScreeningQuestionService;
import com.fursadhub.opportunity.domain.ScreeningQuestion;
import com.fursadhub.opportunity.domain.ScreeningQuestionChoice;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Validates a student's screening answers against the opportunity's OWN questions
 * (CLAUDE.md Phase 4 section 10).
 *
 * <p>Question ids arrive from the browser and are therefore untrusted: this never looks a question
 * up by the supplied id alone. It starts from the opportunity's authoritative question list and
 * matches submitted answers into it, so an answer referencing a question that belongs to a
 * different opportunity is rejected rather than silently stored.
 */
@Component
public class ScreeningAnswerValidator {

    private static final int MAX_SHORT_TEXT_LENGTH = 500;
    private static final int MAX_LONG_TEXT_LENGTH = 4000;
    private static final Set<String> YES_NO_VALUES = Set.of("YES", "NO");

    private final ScreeningQuestionService screeningQuestions;

    public ScreeningAnswerValidator(ScreeningQuestionService screeningQuestions) {
        this.screeningQuestions = screeningQuestions;
    }

    /** One submitted answer, exactly as received from the client. */
    public record SubmittedAnswer(UUID questionId, String answer) {
    }

    /**
     * @return the validated answers keyed by question id, ready to persist. Optional questions the
     *         student left blank are simply absent rather than stored as empty strings.
     */
    public Map<UUID, String> validate(UUID opportunityId, List<SubmittedAnswer> submitted) {
        List<ScreeningQuestionService.QuestionWithChoices> questions = screeningQuestions.listPublic(opportunityId);

        Map<UUID, String> submittedByQuestionId = new LinkedHashMap<>();
        for (SubmittedAnswer answer : submitted == null ? List.<SubmittedAnswer>of() : submitted) {
            if (answer == null || answer.questionId() == null) {
                continue;
            }
            if (submittedByQuestionId.put(answer.questionId(), answer.answer()) != null) {
                throw validationFailed("The same screening question was answered more than once.");
            }
        }

        Map<UUID, String> validated = new LinkedHashMap<>();
        for (ScreeningQuestionService.QuestionWithChoices entry : questions) {
            ScreeningQuestion question = entry.question();
            String raw = submittedByQuestionId.remove(question.getId());
            String value = raw == null ? null : raw.trim();

            if (value == null || value.isEmpty()) {
                if (question.isRequired()) {
                    throw validationFailed("A required screening question was not answered.");
                }
                continue;
            }
            validated.put(question.getId(), validateAnswer(question, entry.choices(), value));
        }

        // Anything left over referenced a question this opportunity does not own.
        if (!submittedByQuestionId.isEmpty()) {
            throw new ApiException("SCREENING_ANSWER_INVALID", HttpStatus.BAD_REQUEST,
                    "An answer referenced a screening question that does not belong to this opportunity.");
        }
        return validated;
    }

    private String validateAnswer(ScreeningQuestion question, List<ScreeningQuestionChoice> choices, String value) {
        switch (question.getType()) {
            case SHORT_TEXT -> requireMaxLength(value, MAX_SHORT_TEXT_LENGTH);
            case LONG_TEXT -> requireMaxLength(value, MAX_LONG_TEXT_LENGTH);
            case YES_NO -> {
                String normalized = value.toUpperCase(Locale.ROOT);
                if (!YES_NO_VALUES.contains(normalized)) {
                    throw validationFailed("A yes/no screening question must be answered with YES or NO.");
                }
                return normalized;
            }
            case SINGLE_CHOICE -> {
                boolean allowed = choices.stream().anyMatch(choice -> choice.getLabel().equals(value));
                if (!allowed) {
                    throw validationFailed("A single-choice screening answer must match one of the offered choices.");
                }
            }
        }
        return value;
    }

    private void requireMaxLength(String value, int max) {
        if (value.length() > max) {
            throw validationFailed("A screening answer exceeds the maximum allowed length.");
        }
    }

    private ApiException validationFailed(String message) {
        return new ApiException("SCREENING_ANSWER_INVALID", HttpStatus.BAD_REQUEST, message);
    }
}
