package com.fursadhub.internshipmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The organization's evaluation over real HTTP (CLAUDE.md section 44, Phase 6 section 39).
 *
 * <p>Proves that only the ASSIGNED organization supervisor may author it, that FINAL is genuinely
 * sealed, and that Organization A cannot evaluate Organization B's placement.
 */
class PlacementEvaluationIT extends AbstractPhase6IT {

    private String base(InternshipFixture fixture) {
        return "/api/v1/placements/" + fixture.placementId() + "/evaluation";
    }

    @Test
    void assignedSupervisorDraftsSubmitsAndFinalizes() {
        InternshipFixture fixture = createActiveInternship("ev-happy");
        String token = fixture.organizationSupervisor().token();

        ResponseEntity<Map> draft = authorizedPut(base(fixture), token, fullEvaluationBody());
        assertThat(draft.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(draft.getBody()).containsEntry("state", "DRAFT");

        assertThat(authorizedPost(base(fixture) + "/submit", token, null).getBody())
                .containsEntry("state", "SUBMITTED");
        ResponseEntity<Map> finalized = authorizedPost(base(fixture) + "/finalize", token, null);
        assertThat(finalized.getBody()).containsEntry("state", "FINAL");
        assertThat(finalized.getBody().get("finalizedAt")).isNotNull();
    }

    @Test
    void aDraftMaySaveProgressWithPartialRatingsButCannotBeSubmitted() {
        InternshipFixture fixture = createActiveInternship("ev-partial");
        String token = fixture.organizationSupervisor().token();
        Map<String, Object> partial = new HashMap<>();
        partial.put("professionalismRating", 4);
        partial.put("strengths", "Good start.");

        assertThat(authorizedPut(base(fixture), token, partial).getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> submitted = authorizedPost(base(fixture) + "/submit", token, null);
        assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(submitted)).isEqualTo("EVALUATION_INCOMPLETE");
    }

    @Test
    void aRatingOutsideOneToFiveIsRejected() {
        InternshipFixture fixture = createActiveInternship("ev-rating");
        Map<String, Object> body = new HashMap<>(fullEvaluationBody());
        body.put("overallRating", 9);

        ResponseEntity<Map> response =
                authorizedPut(base(fixture), fixture.organizationSupervisor().token(), body);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void aFinalEvaluationCannotBeEditedOrReopened() {
        InternshipFixture fixture = createActiveInternship("ev-sealed");
        finalizeEvaluation(fixture);
        String token = fixture.organizationSupervisor().token();

        Map<String, Object> rewrite = new HashMap<>(fullEvaluationBody());
        rewrite.put("finalComments", "Actually, a much weaker intern.");
        ResponseEntity<Map> edited = authorizedPut(base(fixture), token, rewrite);
        assertThat(edited.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(edited)).isEqualTo("EVALUATION_INVALID_TRANSITION");

        // The stored assessment is untouched.
        assertThat(authorizedGet(base(fixture), token).getBody())
                .containsEntry("finalComments", "A strong intern.");
    }

    @Test
    void repeatedFinalizeIsASafeNoOp() {
        InternshipFixture fixture = createActiveInternship("ev-idem");
        finalizeEvaluation(fixture);

        ResponseEntity<Map> again = authorizedPost(
                base(fixture) + "/finalize", fixture.organizationSupervisor().token(), null);

        assertThat(again.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(again.getBody()).containsEntry("state", "FINAL");
    }

    @Test
    void aDraftCannotSkipStraightToFinal() {
        InternshipFixture fixture = createActiveInternship("ev-skip");
        String token = fixture.organizationSupervisor().token();
        authorizedPut(base(fixture), token, fullEvaluationBody());

        ResponseEntity<Map> response = authorizedPost(base(fixture) + "/finalize", token, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("EVALUATION_INVALID_TRANSITION");
    }

    @Test
    void anUnrelatedOrganizationSupervisorCannotEvaluateThisPlacement() {
        InternshipFixture ours = createActiveInternship("ev-org-a");
        InternshipFixture theirs = createActiveInternship("ev-org-b");

        ResponseEntity<Map> response =
                authorizedPut(base(ours), theirs.organizationSupervisor().token(), fullEvaluationBody());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void anOrganizationRecruiterCannotAuthorTheEvaluation() {
        InternshipFixture fixture = createActiveInternship("ev-recruiter");

        // The recruiter has Phase 5 read access to the placement, but did not supervise the student.
        ResponseEntity<Map> response =
                authorizedPut(base(fixture), fixture.placement().recruiterToken(), fullEvaluationBody());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void theStudentCannotModifyTheEvaluation() {
        InternshipFixture fixture = createActiveInternship("ev-student");

        assertThat(authorizedPut(base(fixture), fixture.studentToken(), fullEvaluationBody())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedPost(base(fixture) + "/submit", fixture.studentToken(), null)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void theStudentSeesNothingUntilTheEvaluationIsFinal() {
        InternshipFixture fixture = createActiveInternship("ev-visibility");
        String token = fixture.organizationSupervisor().token();

        authorizedPut(base(fixture), token, fullEvaluationBody());
        // 204 rather than 403: the student is entitled to ask, there is simply nothing to show yet.
        assertThat(authorizedGet(base(fixture), fixture.studentToken()).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);

        authorizedPost(base(fixture) + "/submit", token, null);
        assertThat(authorizedGet(base(fixture), fixture.studentToken()).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);

        authorizedPost(base(fixture) + "/finalize", token, null);
        ResponseEntity<Map> visible = authorizedGet(base(fixture), fixture.studentToken());
        assertThat(visible.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(visible.getBody()).containsEntry("state", "FINAL");
    }

    @Test
    void universityStaffInScopeMayReadTheEvaluation() {
        InternshipFixture fixture = createActiveInternship("ev-uni");
        finalizeEvaluation(fixture);

        ResponseEntity<Map> response = authorizedGet(base(fixture), fixture.universitySupervisor().token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("state", "FINAL");
    }
}
