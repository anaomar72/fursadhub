package com.fursadhub.candidacy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Screening questions and answer validation (CLAUDE.md Phase 4 sections 9/10).
 *
 * <p>The recurring theme: question ids arrive from the browser and are untrusted, so validation
 * always starts from the opportunity's own authoritative question list.
 */
class ScreeningQuestionIT extends AbstractPhase4IT {

    private record Draft(String recruiterToken, UUID organizationId, UUID opportunityId) {
    }

    private Draft draftOpportunity(String prefix) {
        String recruiterToken = registerVerifiedAndLogin(prefix + "-recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        return new Draft(recruiterToken, organizationId, opportunityId);
    }

    private Map<String, Object> questionBody(String prompt, String type, boolean required, List<String> choices) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("prompt", prompt);
        body.put("type", type);
        body.put("required", required);
        if (choices != null) {
            body.put("choices", choices);
        }
        return body;
    }

    private UUID addQuestion(Draft draft, String prompt, String type, boolean required, List<String> choices) {
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions",
                draft.recruiterToken(), questionBody(prompt, type, required, choices));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Question creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    // ---------------------------------------------------------------- authoring

    @Test
    void recruiterCanAddAllFourQuestionTypes() {
        Draft draft = draftOpportunity("types");

        addQuestion(draft, "Why this internship?", "SHORT_TEXT", true, null);
        addQuestion(draft, "Describe a project.", "LONG_TEXT", false, null);
        addQuestion(draft, "Can you work on site?", "YES_NO", true, null);
        addQuestion(draft, "Preferred track?", "SINGLE_CHOICE", true, List.of("Backend", "Frontend"));

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions", draft.recruiterToken());

        assertThat(response.getBody()).hasSize(4);
    }

    @Test
    void sixthQuestionIsRejected() {
        Draft draft = draftOpportunity("limit");
        for (int i = 0; i < 5; i++) {
            addQuestion(draft, "Question " + i, "SHORT_TEXT", false, null);
        }

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions", draft.recruiterToken(),
                questionBody("One too many", "SHORT_TEXT", false, null));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("SCREENING_QUESTION_LIMIT_REACHED");
    }

    @Test
    void singleChoiceQuestionRequiresAtLeastTwoChoices() {
        Draft draft = draftOpportunity("choices");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions", draft.recruiterToken(),
                questionBody("Pick one", "SINGLE_CHOICE", true, List.of("Only")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void nonChoiceQuestionCannotDefineChoices() {
        Draft draft = draftOpportunity("no-choices");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions", draft.recruiterToken(),
                questionBody("Free text", "SHORT_TEXT", true, List.of("A", "B")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void anotherOrganizationCannotAddQuestions() {
        Draft draft = draftOpportunity("victim");
        String outsiderToken = registerVerifiedAndLogin("outsider");
        createVerifiedOrganization(outsiderToken, "Other " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions", outsiderToken,
                questionBody("Injected", "SHORT_TEXT", true, null));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void questionsCannotBeChangedAfterPublish() {
        Draft draft = draftOpportunity("published");
        publishOpportunity(draft.recruiterToken(), draft.opportunityId());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions", draft.recruiterToken(),
                questionBody("Too late", "SHORT_TEXT", true, null));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("OPPORTUNITY_NOT_EDITABLE");
    }

    /** Removing a question renumbers the survivors so the position sequence stays gapless. */
    @Test
    void removingQuestionRenumbersRemaining() {
        Draft draft = draftOpportunity("renumber");
        UUID first = addQuestion(draft, "First", "SHORT_TEXT", false, null);
        addQuestion(draft, "Second", "SHORT_TEXT", false, null);
        addQuestion(draft, "Third", "SHORT_TEXT", false, null);

        ResponseEntity<Map> removed = restTemplateDelete(
                "/api/v1/opportunities/" + draft.opportunityId() + "/screening-questions/" + first,
                draft.recruiterToken());
        assertThat(removed.getStatusCode()).isEqualTo(HttpStatus.OK);

        List<Integer> positions = jdbcTemplate.queryForList(
                "SELECT position FROM screening_questions WHERE opportunity_id = ? ORDER BY position",
                Integer.class, draft.opportunityId());

        assertThat(positions).containsExactly(0, 1);

        // And a fifth question can still be added afterwards, proving the cap tracks the real count.
        addQuestion(draft, "Fourth", "SHORT_TEXT", false, null);
        addQuestion(draft, "Fifth", "SHORT_TEXT", false, null);
        addQuestion(draft, "Sixth slot is free now", "SHORT_TEXT", false, null);
    }

    private ResponseEntity<Map> restTemplateDelete(String path, String accessToken) {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url(path), org.springframework.http.HttpMethod.DELETE,
                new org.springframework.http.HttpEntity<>(headers), Map.class);
    }

    // ---------------------------------------------------------------- answering

    private record Published(Draft draft, UUID universityId, UUID departmentId) {
    }

    private Published publishedWithQuestions(String prefix) {
        Draft draft = draftOpportunity(prefix);
        addQuestion(draft, "Why this internship?", "SHORT_TEXT", true, null);
        addQuestion(draft, "Preferred track?", "SINGLE_CHOICE", true, List.of("Backend", "Frontend"));
        addQuestion(draft, "Anything else?", "LONG_TEXT", false, null);
        publishOpportunity(draft.recruiterToken(), draft.opportunityId());

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        return new Published(draft, universityId, departmentId);
    }

    private List<Map<String, Object>> publicQuestions(UUID opportunityId) {
        return restTemplate.getForEntity(
                url("/api/v1/public/opportunities/" + opportunityId + "/screening-questions"), List.class).getBody();
    }

    @Test
    void applicantCanReadScreeningQuestionsPublicly() {
        Published published = publishedWithQuestions("public-read");

        List<Map<String, Object>> questions = publicQuestions(published.draft().opportunityId());

        assertThat(questions).hasSize(3);
        assertThat(questions.get(1).get("choices")).isEqualTo(List.of("Backend", "Frontend"));
    }

    @Test
    void applicationWithValidAnswersIsAccepted() {
        Published published = publishedWithQuestions("valid-answers");
        StudentFixture student = createVerifiedStudent("student", published.universityId(), published.departmentId());
        List<Map<String, Object>> questions = publicQuestions(published.draft().opportunityId());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + published.draft().opportunityId() + "/applications", student.accessToken(),
                Map.of("answers", List.of(
                        Map.of("questionId", questions.get(0).get("id"), "answer", "I want to learn."),
                        Map.of("questionId", questions.get(1).get("id"), "answer", "Backend"))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        UUID candidacyId = UUID.fromString((String) response.getBody().get("id"));
        Integer stored = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM screening_answers WHERE candidacy_id = ?", Integer.class, candidacyId);
        assertThat(stored).isEqualTo(2);
    }

    @Test
    void missingRequiredAnswerIsRejected() {
        Published published = publishedWithQuestions("missing-required");
        StudentFixture student = createVerifiedStudent("student", published.universityId(), published.departmentId());
        List<Map<String, Object>> questions = publicQuestions(published.draft().opportunityId());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + published.draft().opportunityId() + "/applications", student.accessToken(),
                Map.of("answers", List.of(
                        Map.of("questionId", questions.get(0).get("id"), "answer", "Only the first."))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("SCREENING_ANSWER_INVALID");
        assertThat(countCandidacies(published.draft().opportunityId(), student.userId())).isZero();
    }

    @Test
    void singleChoiceAnswerOutsideAllowedChoicesIsRejected() {
        Published published = publishedWithQuestions("bad-choice");
        StudentFixture student = createVerifiedStudent("student", published.universityId(), published.departmentId());
        List<Map<String, Object>> questions = publicQuestions(published.draft().opportunityId());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + published.draft().opportunityId() + "/applications", student.accessToken(),
                Map.of("answers", List.of(
                        Map.of("questionId", questions.get(0).get("id"), "answer", "Because."),
                        Map.of("questionId", questions.get(1).get("id"), "answer", "Fullstack"))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("SCREENING_ANSWER_INVALID");
    }

    /** The security case: an answer naming a question owned by a different opportunity. */
    @Test
    void answerReferencingForeignOpportunityQuestionIsRejected() {
        Published target = publishedWithQuestions("target");
        Published other = publishedWithQuestions("other");

        StudentFixture student = createVerifiedStudent("student", target.universityId(), target.departmentId());
        List<Map<String, Object>> targetQuestions = publicQuestions(target.draft().opportunityId());
        List<Map<String, Object>> foreignQuestions = publicQuestions(other.draft().opportunityId());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + target.draft().opportunityId() + "/applications", student.accessToken(),
                Map.of("answers", List.of(
                        Map.of("questionId", targetQuestions.get(0).get("id"), "answer", "Because."),
                        Map.of("questionId", targetQuestions.get(1).get("id"), "answer", "Backend"),
                        Map.of("questionId", foreignQuestions.get(0).get("id"), "answer", "Injected"))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("SCREENING_ANSWER_INVALID");
        assertThat(countCandidacies(target.draft().opportunityId(), student.userId())).isZero();
    }

    @Test
    void yesNoAnswerMustBeYesOrNo() {
        Draft draft = draftOpportunity("yes-no");
        addQuestion(draft, "On site?", "YES_NO", true, null);
        publishOpportunity(draft.recruiterToken(), draft.opportunityId());

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);
        List<Map<String, Object>> questions = publicQuestions(draft.opportunityId());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + draft.opportunityId() + "/applications", student.accessToken(),
                Map.of("answers", List.of(Map.of("questionId", questions.get(0).get("id"), "answer", "Maybe"))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("SCREENING_ANSWER_INVALID");
    }

    /**
     * A nomination-sourced candidacy legitimately has no answers — FursadHub must never invent
     * screening responses on a student's behalf (Phase 4 section 10).
     */
    @Test
    void nominationSourcedCandidacyHasNoFabricatedAnswers() {
        String recruiterToken = registerVerifiedAndLogin("nom-recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "HYBRID", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/screening-questions", recruiterToken,
                questionBody("Why?", "SHORT_TEXT", true, null));
        addTarget(recruiterToken, opportunityId, universityId, List.of(departmentId), 5);
        publishOpportunity(recruiterToken, opportunityId);

        String coordinatorEmail = uniqueEmail("coordinator");
        registerVerifiedUser(coordinatorEmail);
        insertUniversityMembership(universityId, userIdOf(coordinatorEmail), "DEPARTMENT_COORDINATOR", List.of(departmentId));
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");

        StudentFixture student = createVerifiedStudent("nominee", universityId, departmentId);
        UUID nominationId = UUID.fromString((String) authorizedPost(
                "/api/v1/universities/" + universityId + "/nominations", coordinatorToken,
                Map.of("opportunityId", opportunityId.toString(), "studentUserId", student.userId().toString()))
                .getBody().get("id"));

        ResponseEntity<Map> accepted = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/accept", student.accessToken(), null);
        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);

        UUID candidacyId = UUID.fromString((String) accepted.getBody().get("id"));
        Integer answers = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM screening_answers WHERE candidacy_id = ?", Integer.class, candidacyId);
        assertThat(answers).isZero();
    }
}
