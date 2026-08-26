package com.fursadhub.internshipmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Weekly logs over real HTTP against real PostgreSQL (CLAUDE.md section 42, Phase 6 section 37).
 *
 * <p>These prove the two things that matter: the frozen state machine, and that a weekly log is
 * reachable only by the student who wrote it and the university staff actually in scope for that
 * placement. Every request goes through the API, so route-level authorization is exercised rather
 * than assumed.
 */
class WeeklyLogIT extends AbstractPhase6IT {

    @Test
    void studentCreatesSubmitsAndSupervisorReviewsTheirOwnLog() {
        InternshipFixture fixture = createActiveInternship("wl-happy");

        ResponseEntity<Map> created = createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(created.getBody()).containsEntry("state", "DRAFT");
        // The period is derived from the placement, never supplied by the client.
        assertThat(created.getBody().get("periodStart")).isNotNull();
        assertThat(created.getBody().get("periodEnd")).isNotNull();
        String logId = (String) created.getBody().get("id");

        ResponseEntity<Map> submitted =
                authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);
        assertThat(submitted.getBody()).containsEntry("state", "SUBMITTED");

        ResponseEntity<Map> reviewed = authorizedPost("/api/v1/weekly-logs/" + logId + "/review",
                fixture.universitySupervisor().token(), Map.of("comment", "Good work."));
        assertThat(reviewed.getBody()).containsEntry("state", "REVIEWED");
        assertThat(reviewed.getBody()).containsEntry("reviewComment", "Good work.");
    }

    @Test
    void aReturnedLogCanBeEditedAndResubmitted() {
        InternshipFixture fixture = createActiveInternship("wl-return");
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");
        authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);

        ResponseEntity<Map> returned = authorizedPost("/api/v1/weekly-logs/" + logId + "/return",
                fixture.universitySupervisor().token(), Map.of("comment", "Add detail on what you built."));
        assertThat(returned.getBody()).containsEntry("state", "RETURNED_FOR_CHANGES");
        assertThat(returned.getBody()).containsEntry("editable", true);

        ResponseEntity<Map> edited = authorizedPut("/api/v1/weekly-logs/" + logId,
                fixture.studentToken(), Map.of("summary", "A much fuller account of the week."));
        assertThat(edited.getBody()).containsEntry("summary", "A much fuller account of the week.");

        ResponseEntity<Map> resubmitted =
                authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);
        assertThat(resubmitted.getBody()).containsEntry("state", "SUBMITTED");
    }

    @Test
    void aReturnWithoutACommentIsRejected() {
        InternshipFixture fixture = createActiveInternship("wl-nocomment");
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");
        authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);

        ResponseEntity<Map> response = authorizedPost("/api/v1/weekly-logs/" + logId + "/return",
                fixture.universitySupervisor().token(), Map.of("comment", "  "));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void aSecondLogForTheSameWeekIsBlockedByTheDatabaseConstraint() {
        InternshipFixture fixture = createActiveInternship("wl-dupe");
        createWeeklyLog(fixture.studentToken(), fixture.placementId(), 2);

        ResponseEntity<Map> duplicate = createWeeklyLog(fixture.studentToken(), fixture.placementId(), 2);

        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(duplicate)).isEqualTo("WEEKLY_LOG_ALREADY_EXISTS");
    }

    @Test
    void anAbsurdWeekNumberIsRejected() {
        InternshipFixture fixture = createActiveInternship("wl-week");

        ResponseEntity<Map> response = createWeeklyLog(fixture.studentToken(), fixture.placementId(), 900);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("WEEKLY_LOG_WEEK_OUT_OF_RANGE");
    }

    @Test
    void aStudentCannotCreateALogOnAnotherStudentsPlacement() {
        InternshipFixture mine = createActiveInternship("wl-mine");
        InternshipFixture theirs = createActiveInternship("wl-theirs");

        ResponseEntity<Map> response = createWeeklyLog(mine.studentToken(), theirs.placementId(), 1);

        // NOT FOUND rather than FORBIDDEN, so probing ids cannot confirm the placement exists.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(errorCode(response)).isEqualTo("PLACEMENT_NOT_FOUND");
    }

    @Test
    void aStudentCannotReadAnotherStudentsLogs() {
        InternshipFixture mine = createActiveInternship("wl-read-mine");
        InternshipFixture theirs = createActiveInternship("wl-read-theirs");
        createWeeklyLog(theirs.studentToken(), theirs.placementId(), 1);

        // A denial renders the ApiError contract, so this reads the response as an error object.
        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + theirs.placementId() + "/weekly-logs", mine.studentToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void aStudentCannotReviewTheirOwnLog() {
        InternshipFixture fixture = createActiveInternship("wl-selfreview");
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");
        authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);

        ResponseEntity<Map> response = authorizedPost("/api/v1/weekly-logs/" + logId + "/review",
                fixture.studentToken(), Map.of("comment", "Excellent, if I say so myself."));

        // Owning the placement grants no university scope, so this needs no special case.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void aSupervisorAssignedToAnotherPlacementCannotReview() {
        InternshipFixture fixture = createActiveInternship("wl-otherplace");
        InternshipFixture other = createActiveInternship("wl-otherplace2");
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");
        authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);

        ResponseEntity<Map> response = authorizedPost("/api/v1/weekly-logs/" + logId + "/review",
                other.universitySupervisor().token(), Map.of("comment", "Reviewed."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void aCoordinatorForAnotherDepartmentCannotSeeOrReviewTheLog() {
        InternshipFixture fixture = createActiveInternship("wl-dept");
        UUID otherDepartment = insertDepartment(fixture.universityId(), "Business", "BUS-" + shortCode());
        Staff outsideCoordinator = universityStaff(
                "wl-coord-out", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(otherDepartment));
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");
        authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);

        // Same university, wrong department — department isolation (CLAUDE.md section 25).
        assertThat(authorizedGet("/api/v1/placements/" + fixture.placementId() + "/weekly-logs",
                outsideCoordinator.token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedPost("/api/v1/weekly-logs/" + logId + "/review",
                outsideCoordinator.token(), Map.of("comment", "Fine.")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void aCoordinatorForTheCorrectDepartmentMayReview() {
        InternshipFixture fixture = createActiveInternship("wl-dept-ok");
        Staff coordinator = universityStaff(
                "wl-coord-in", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(fixture.departmentId()));
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");
        authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);

        ResponseEntity<Map> response = authorizedPost("/api/v1/weekly-logs/" + logId + "/review",
                coordinator.token(), Map.of("comment", "Approved."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("state", "REVIEWED");
    }

    @Test
    void organizationStaffHaveNoAccessToAcademicSupervisionContent() {
        InternshipFixture fixture = createActiveInternship("wl-org");
        createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1);

        // Both the assigned organization supervisor and the recruiter are refused: a weekly log is
        // the student's reflective academic work, not something the host organization reads by
        // default (CLAUDE.md section 6).
        assertThat(authorizedGet("/api/v1/placements/" + fixture.placementId() + "/weekly-logs",
                fixture.organizationSupervisor().token()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/placements/" + fixture.placementId() + "/weekly-logs",
                fixture.placement().recruiterToken()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anInvalidTransitionIsRejectedWithAStableCode() {
        InternshipFixture fixture = createActiveInternship("wl-transition");
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");

        // Reviewing a DRAFT skips submission entirely.
        ResponseEntity<Map> response = authorizedPost("/api/v1/weekly-logs/" + logId + "/review",
                fixture.universitySupervisor().token(), Map.of("comment", "Fine."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("WEEKLY_LOG_INVALID_TRANSITION");
    }

    @Test
    void repeatedSubmitIsASafeNoOp() {
        InternshipFixture fixture = createActiveInternship("wl-idem");
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");

        authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);
        ResponseEntity<Map> second =
                authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody()).containsEntry("state", "SUBMITTED");
    }

    private String shortCode() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
