package com.fursadhub.internshipmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Defense attempts over real HTTP (CLAUDE.md section 46, Phase 6 section 41).
 *
 * <p>The central assertion is that history survives: a retake creates a NEW attempt and the previous
 * one keeps its own state, result and notes. Alongside that, only authorized university actors may
 * schedule or record, and University A cannot manage University B.
 */
class DefenseIT extends AbstractPhase6IT {

    @Test
    void aUniversityActorSchedulesAndRecordsAPass() {
        InternshipFixture fixture = createActiveInternship("df-happy");

        ResponseEntity<Map> scheduled = scheduleDefense(
                fixture.universitySupervisor().token(), fixture.placementId());
        assertThat(scheduled.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(scheduled.getBody()).containsEntry("state", "SCHEDULED");
        assertThat(scheduled.getBody()).containsEntry("attemptNumber", 1);

        ResponseEntity<Map> recorded = recordDefenseResult(
                fixture.universitySupervisor().token(), (String) scheduled.getBody().get("id"), "PASSED");
        assertThat(recorded.getBody()).containsEntry("state", "COMPLETED");
        assertThat(recorded.getBody()).containsEntry("result", "PASSED");
    }

    @Test
    void failedAndRetakeRequiredAreRecordedAsThemselves() {
        InternshipFixture failedFixture = createActiveInternship("df-failed");
        String failedId = (String) scheduleDefense(
                failedFixture.universitySupervisor().token(), failedFixture.placementId()).getBody().get("id");
        assertThat(recordDefenseResult(failedFixture.universitySupervisor().token(), failedId, "FAILED")
                .getBody()).containsEntry("result", "FAILED");

        InternshipFixture retakeFixture = createActiveInternship("df-retake-result");
        String retakeId = (String) scheduleDefense(
                retakeFixture.universitySupervisor().token(), retakeFixture.placementId()).getBody().get("id");
        assertThat(recordDefenseResult(retakeFixture.universitySupervisor().token(), retakeId, "RETAKE_REQUIRED")
                .getBody()).containsEntry("result", "RETAKE_REQUIRED");
    }

    @Test
    void aRetakeCreatesANewAttemptAndLeavesTheFirstUntouched() {
        InternshipFixture fixture = createActiveInternship("df-retake");
        String token = fixture.universitySupervisor().token();

        String firstId = (String) scheduleDefense(token, fixture.placementId()).getBody().get("id");
        recordDefenseResult(token, firstId, "RETAKE_REQUIRED");

        ResponseEntity<Map> second = scheduleDefense(token, fixture.placementId());
        assertThat(second.getBody()).containsEntry("attemptNumber", 2);
        assertThat(second.getBody()).containsEntry("state", "SCHEDULED");

        ResponseEntity<List> history = authorizedGetList(
                "/api/v1/placements/" + fixture.placementId() + "/defense-attempts", token);
        assertThat(history.getBody()).hasSize(2);

        // Attempt 1 is exactly as it was recorded — not reset to SCHEDULED, not renumbered.
        Map<String, Object> attemptOne = (Map<String, Object>) history.getBody().get(0);
        assertThat(attemptOne).containsEntry("attemptNumber", 1);
        assertThat(attemptOne).containsEntry("state", "COMPLETED");
        assertThat(attemptOne).containsEntry("result", "RETAKE_REQUIRED");
        assertThat(countDefenseAttempts(fixture.placementId())).isEqualTo(2);
    }

    @Test
    void aSecondAttemptCannotBeScheduledWhileOneIsStillOpen() {
        InternshipFixture fixture = createActiveInternship("df-open");
        String token = fixture.universitySupervisor().token();
        scheduleDefense(token, fixture.placementId());

        ResponseEntity<Map> second = scheduleDefense(token, fixture.placementId());

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(second)).isEqualTo("DEFENSE_ATTEMPT_ALREADY_OPEN");
        assertThat(countDefenseAttempts(fixture.placementId())).isEqualTo(1);
    }

    @Test
    void aCancelledAttemptIsPreservedAndItsNumberIsNotReused() {
        InternshipFixture fixture = createActiveInternship("df-cancel");
        String token = fixture.universitySupervisor().token();
        String firstId = (String) scheduleDefense(token, fixture.placementId()).getBody().get("id");

        assertThat(authorizedPost("/api/v1/defense-attempts/" + firstId + "/cancel", token, null)
                .getBody()).containsEntry("state", "CANCELLED");

        ResponseEntity<Map> second = scheduleDefense(token, fixture.placementId());
        assertThat(second.getBody()).containsEntry("attemptNumber", 2);
        assertThat(countDefenseAttempts(fixture.placementId())).isEqualTo(2);
    }

    @Test
    void aCompletedAttemptCannotBeCancelledOrRerecorded() {
        InternshipFixture fixture = createActiveInternship("df-terminal");
        String token = fixture.universitySupervisor().token();
        String attemptId = (String) scheduleDefense(token, fixture.placementId()).getBody().get("id");
        recordDefenseResult(token, attemptId, "PASSED");

        assertThat(authorizedPost("/api/v1/defense-attempts/" + attemptId + "/cancel", token, null)
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ResponseEntity<Map> rerecord = recordDefenseResult(token, attemptId, "FAILED");
        assertThat(rerecord.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(rerecord)).isEqualTo("DEFENSE_INVALID_TRANSITION");
    }

    @Test
    void aStudentSeesTheirOwnAttemptsButCannotScheduleOrRecordThem() {
        InternshipFixture fixture = createActiveInternship("df-student");
        String token = fixture.universitySupervisor().token();
        String attemptId = (String) scheduleDefense(token, fixture.placementId()).getBody().get("id");

        assertThat(authorizedGetList("/api/v1/placements/" + fixture.placementId() + "/defense-attempts",
                fixture.studentToken()).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(scheduleDefense(fixture.studentToken(), fixture.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(recordDefenseResult(fixture.studentToken(), attemptId, "PASSED").getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void universityACannotManageUniversityBDefense() {
        InternshipFixture ours = createActiveInternship("df-uni-a");
        InternshipFixture theirs = createActiveInternship("df-uni-b");

        assertThat(scheduleDefense(theirs.universityAdmin().token(), ours.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(scheduleDefense(theirs.universitySupervisor().token(), ours.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void aCoordinatorForAnotherDepartmentCannotScheduleDefense() {
        InternshipFixture fixture = createActiveInternship("df-dept");
        UUID otherDepartment = insertDepartment(
                fixture.universityId(), "Business", "BUS-" + UUID.randomUUID().toString().substring(0, 8));
        Staff outsider = universityStaff(
                "df-coord-out", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(otherDepartment));

        assertThat(scheduleDefense(outsider.token(), fixture.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        Staff inScope = universityStaff(
                "df-coord-in", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(fixture.departmentId()));
        assertThat(scheduleDefense(inScope.token(), fixture.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void organizationStaffCannotManageOrEvenReadAcademicDefense() {
        InternshipFixture fixture = createActiveInternship("df-org");
        scheduleDefense(fixture.universitySupervisor().token(), fixture.placementId());

        assertThat(scheduleDefense(fixture.organizationSupervisor().token(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/placements/" + fixture.placementId() + "/defense-attempts",
                fixture.placement().recruiterToken()).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
