package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityStatus;
import com.fursadhub.opportunity.domain.ScreeningQuestion;
import com.fursadhub.opportunity.domain.ScreeningQuestionChoice;
import com.fursadhub.opportunity.domain.ScreeningQuestionChoiceRepository;
import com.fursadhub.opportunity.domain.ScreeningQuestionRepository;
import com.fursadhub.opportunity.domain.ScreeningQuestionType;
import com.fursadhub.organization.application.OrganizationAuthorization;
import com.fursadhub.organization.domain.OrganizationRole;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Manages an opportunity's screening questions (CLAUDE.md Phase 4 section 9).
 *
 * <p>This is deliberately not a generic dynamic-form builder: the type set is closed, there are at
 * most {@link ScreeningQuestion#MAX_QUESTIONS_PER_OPPORTUNITY} questions, and questions can only be
 * changed while the opportunity is still {@code DRAFT} — mirroring how Phase 3 restricts editing the
 * opportunity itself. Once published, students are answering against a fixed question set, so
 * mutating it would silently invalidate answers already given.
 */
@Service
public class ScreeningQuestionService {

    private final ScreeningQuestionRepository questions;
    private final ScreeningQuestionChoiceRepository choices;
    private final OpportunityQueryService opportunityQueryService;
    private final OrganizationAuthorization organizationAuthorization;

    @PersistenceContext
    private EntityManager entityManager;

    public ScreeningQuestionService(
            ScreeningQuestionRepository questions, ScreeningQuestionChoiceRepository choices,
            OpportunityQueryService opportunityQueryService, OrganizationAuthorization organizationAuthorization) {
        this.questions = questions;
        this.choices = choices;
        this.opportunityQueryService = opportunityQueryService;
        this.organizationAuthorization = organizationAuthorization;
    }

    public record QuestionWithChoices(ScreeningQuestion question, List<ScreeningQuestionChoice> choices) {
    }

    @Transactional
    public QuestionWithChoices addQuestion(
            UUID actingUserId, UUID opportunityId, String prompt, ScreeningQuestionType type, boolean required,
            List<String> choiceLabels) {
        authorizeEditableQuestions(actingUserId, opportunityId);

        int existing = questions.countByOpportunityId(opportunityId);
        if (existing >= ScreeningQuestion.MAX_QUESTIONS_PER_OPPORTUNITY) {
            throw new ApiException("SCREENING_QUESTION_LIMIT_REACHED", HttpStatus.CONFLICT,
                    "An opportunity may have at most " + ScreeningQuestion.MAX_QUESTIONS_PER_OPPORTUNITY
                            + " screening questions.");
        }

        List<String> labels = normalizeChoiceLabels(choiceLabels);
        validateChoices(type, labels);

        ScreeningQuestion question = ScreeningQuestion.create(opportunityId, prompt.trim(), type, required, existing);
        questions.save(question);

        for (int position = 0; position < labels.size(); position++) {
            choices.save(ScreeningQuestionChoice.create(question.getId(), labels.get(position), position));
        }

        return new QuestionWithChoices(question, choices.findByQuestionIdOrderByPosition(question.getId()));
    }

    @Transactional
    public void removeQuestion(UUID actingUserId, UUID opportunityId, UUID questionId) {
        authorizeEditableQuestions(actingUserId, opportunityId);

        ScreeningQuestion question = questions.findById(questionId)
                .filter(q -> q.getOpportunityId().equals(opportunityId))
                .orElseThrow(() -> new ApiException("SCREENING_QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Screening question not found."));

        // Renumbering the survivors transiently duplicates a position (2 -> 1 while 1 still exists),
        // so the unique constraint is deferred to commit for this transaction; V18 declares it
        // DEFERRABLE for exactly this. The end state is still fully validated at COMMIT.
        entityManager.createNativeQuery(
                "SET CONSTRAINTS uk_screening_questions_opportunity_position DEFERRED").executeUpdate();

        choices.deleteByQuestionId(question.getId());
        questions.delete(question);

        List<ScreeningQuestion> remaining = questions.findByOpportunityIdOrderByPosition(opportunityId).stream()
                .filter(q -> !q.getId().equals(question.getId()))
                .toList();
        for (int position = 0; position < remaining.size(); position++) {
            ScreeningQuestion current = remaining.get(position);
            if (current.getPosition() != position) {
                current.reposition(position);
                questions.save(current);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<QuestionWithChoices> listForManagement(UUID actingUserId, UUID opportunityId) {
        InternshipOpportunity opportunity = opportunityQueryService.getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(actingUserId, opportunity.getOrganizationId());
        return listWithChoices(opportunityId);
    }

    /** Public read: an applicant must be able to see the questions before answering them. */
    @Transactional(readOnly = true)
    public List<QuestionWithChoices> listPublic(UUID opportunityId) {
        return listWithChoices(opportunityId);
    }

    private List<QuestionWithChoices> listWithChoices(UUID opportunityId) {
        List<ScreeningQuestion> ordered = questions.findByOpportunityIdOrderByPosition(opportunityId);
        Map<UUID, List<ScreeningQuestionChoice>> choicesByQuestion = choices
                .findByQuestionIdIn(ordered.stream().map(ScreeningQuestion::getId).toList())
                .stream()
                .sorted(Comparator.comparingInt(ScreeningQuestionChoice::getPosition))
                .collect(Collectors.groupingBy(ScreeningQuestionChoice::getQuestionId));

        return ordered.stream()
                .map(question -> new QuestionWithChoices(
                        question, choicesByQuestion.getOrDefault(question.getId(), List.of())))
                .toList();
    }

    private List<String> normalizeChoiceLabels(List<String> choiceLabels) {
        return choiceLabels == null ? List.of() : choiceLabels.stream()
                .filter(label -> label != null && !label.isBlank())
                .map(String::trim)
                .toList();
    }

    private void validateChoices(ScreeningQuestionType type, List<String> labels) {
        if (type == ScreeningQuestionType.SINGLE_CHOICE) {
            if (labels.size() < 2) {
                throw validationFailed("A single-choice question needs at least two choices.");
            }
            if (labels.size() != labels.stream().distinct().count()) {
                throw validationFailed("Choices must be distinct.");
            }
        } else if (!labels.isEmpty()) {
            throw validationFailed("Only a single-choice question can define choices.");
        }
    }

    private void authorizeEditableQuestions(UUID actingUserId, UUID opportunityId) {
        InternshipOpportunity opportunity = opportunityQueryService.getOrThrow(opportunityId);
        organizationAuthorization.requireMembership(
                actingUserId, opportunity.getOrganizationId(), OrganizationRole.ORGANIZATION_ADMIN,
                OrganizationRole.RECRUITER);

        if (opportunity.getStatus() != OpportunityStatus.DRAFT) {
            throw new ApiException("OPPORTUNITY_NOT_EDITABLE", HttpStatus.CONFLICT,
                    "Screening questions can only be changed while the opportunity is a draft.");
        }
    }

    private ApiException validationFailed(String message) {
        return new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, message);
    }
}
