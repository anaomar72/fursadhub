package com.fursadhub.internshipmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Placement completion under each policy shape (Phase 6 sections 21-24, 42).
 *
 * <p>The rule these prove together is the one that matters most: DISABLED requirements never block
 * completion, and each ENABLED one blocks it until its own explicit condition is met — with the
 * reason reported as a machine-readable code rather than prose.
 */
class PlacementCompletionIT extends AbstractPhase6IT {

    // ---------------------------------------------------------------- policy A: nothing required

    @Test
    void withEveryRequirementDisabledCompletionSucceedsImmediately() {
        InternshipFixture fixture = createActiveInternship("cp-none");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);
        requestCompletion(fixture);

        ResponseEntity<Map> completed = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        assertThat(completed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completed.getBody()).containsEntry("status", "COMPLETED");
        assertThat(completed.getBody().get("completedAt")).isNotNull();
    }

    @Test
    void disabledRequirementsAreReportedAsNotRequiredRatherThanUnmet() {
        InternshipFixture fixture = createActiveInternship("cp-hidden");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, true, false);

        ResponseEntity<Map> status = completionStatus(fixture.studentToken(), fixture.placementId());

        List<Map<String, Object>> requirements = requirements(status);
        assertThat(requirements).hasSize(5);
        // The UI hides these; it must never draw them as missing items.
        assertThat(requirement(requirements, "WEEKLY_LOGS")).containsEntry("required", false);
        assertThat(requirement(requirements, "WEEKLY_LOGS")).containsEntry("satisfied", true);
        assertThat(requirement(requirements, "FINAL_REPORT")).containsEntry("required", true);
        assertThat(requirement(requirements, "FINAL_REPORT")).containsEntry("satisfied", false);
        assertThat(status.getBody()).containsEntry("canComplete", false);
    }

    // ---------------------------------------------------------------- policy B-E: each blocks

    @Test
    void incompleteWeeklyLogsBlockCompletion() {
        InternshipFixture fixture = createActiveInternship("cp-logs");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);
        reviewWeek(fixture, 1);
        requestCompletion(fixture);

        ResponseEntity<Map> blocked = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        assertThatBlockedBy(blocked, "WEEKLY_LOGS", "WEEKLY_LOGS_INCOMPLETE");
        assertThat(placementStatus(fixture.placementId())).isEqualTo("COMPLETION_PENDING");
    }

    @Test
    void anEvaluationThatIsOnlySubmittedBlocksCompletion() {
        InternshipFixture fixture = createActiveInternship("cp-eval");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, true, false, false);
        String base = "/api/v1/placements/" + fixture.placementId() + "/evaluation";
        authorizedPut(base, fixture.organizationSupervisor().token(), fullEvaluationBody());
        authorizedPost(base + "/submit", fixture.organizationSupervisor().token(), null);
        requestCompletion(fixture);

        ResponseEntity<Map> blocked = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        // SUBMITTED is not FINAL.
        assertThatBlockedBy(blocked, "ORGANIZATION_EVALUATION", "ORGANIZATION_EVALUATION_INCOMPLETE");
    }

    @Test
    void aReportThatIsOnlySubmittedBlocksCompletion() {
        InternshipFixture fixture = createActiveInternship("cp-report");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, true, false);
        uploadFinalReport(fixture.studentToken(), fixture.placementId(),
                "report.pdf", "application/pdf", validPdfBytes());
        authorizedPost("/api/v1/placements/" + fixture.placementId() + "/final-report/submit",
                fixture.studentToken(), null);
        requestCompletion(fixture);

        ResponseEntity<Map> blocked = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        assertThatBlockedBy(blocked, "FINAL_REPORT", "FINAL_REPORT_NOT_APPROVED");
    }

    @Test
    void aDefenseThatWasNotPassedBlocksCompletion() {
        InternshipFixture fixture = createActiveInternship("cp-defense");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, true);
        String attemptId = (String) scheduleDefense(
                fixture.universitySupervisor().token(), fixture.placementId()).getBody().get("id");
        recordDefenseResult(fixture.universitySupervisor().token(), attemptId, "RETAKE_REQUIRED");
        requestCompletion(fixture);

        ResponseEntity<Map> blocked = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        assertThatBlockedBy(blocked, "DEFENSE", "DEFENSE_NOT_PASSED");
    }

    @Test
    void attendanceWithNoRecordsOrAnUnresolvedDisputeBlocksCompletion() {
        InternshipFixture fixture = createActiveInternship("cp-att");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, true, false, false, false);
        requestCompletion(fixture);

        // No attendance at all.
        assertThatBlockedBy(completePlacement(fixture.universityAdmin().token(), fixture.placementId()),
                "ATTENDANCE", "ATTENDANCE_INCOMPLETE");
    }

    @Test
    void anUnansweredAttendanceDisputeBlocksCompletion() {
        InternshipFixture fixture = createActiveInternship("cp-att-dispute");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, true, false, false, false);
        String recordId = (String) recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "ABSENT").getBody().get("id");
        authorizedPost("/api/v1/attendance/" + recordId + "/dispute",
                fixture.studentToken(), Map.of("reason", "I was there."));
        requestCompletion(fixture);

        // A recorded ABSENT day does not block completion; an UNANSWERED dispute does.
        assertThatBlockedBy(completePlacement(fixture.universityAdmin().token(), fixture.placementId()),
                "ATTENDANCE", "ATTENDANCE_INCOMPLETE");

        authorizedPost("/api/v1/attendance/" + recordId + "/resolve",
                fixture.organizationSupervisor().token(), Map.of("resolutionNote", "Sheet corrected."));
        assertThat(completePlacement(fixture.universityAdmin().token(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void severalUnmetRequirementsAreAllReportedAtOnce() {
        InternshipFixture fixture = createActiveInternship("cp-many");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, true, true, true);
        requestCompletion(fixture);

        ResponseEntity<Map> blocked = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        // The student is never sent away to fix one thing only to discover another.
        assertThat(errorCode(blocked)).isEqualTo("PLACEMENT_COMPLETION_REQUIREMENTS_NOT_MET");
        List<Map<String, Object>> fieldErrors = (List<Map<String, Object>>) blocked.getBody().get("fieldErrors");
        assertThat(fieldErrors).hasSize(3);
        assertThat(fieldErrors).extracting(error -> error.get("code"))
                .containsExactlyInAnyOrder("ORGANIZATION_EVALUATION_INCOMPLETE",
                        "FINAL_REPORT_NOT_APPROVED", "DEFENSE_NOT_PASSED");
    }

    // ---------------------------------------------------------------- policy F: everything met

    @Test
    void withEveryEnabledRequirementSatisfiedThePlacementCompletes() {
        InternshipFixture fixture = createActiveInternship("cp-all");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, true, true, true, true);

        reviewAllWeeks(fixture);
        recordAndConfirmAttendance(fixture);
        finalizeEvaluation(fixture);
        approveFinalReport(fixture);
        passDefense(fixture);

        ResponseEntity<Map> status = completionStatus(
                fixture.universityAdmin().token(), fixture.placementId());
        assertThat(status.getBody()).containsEntry("canComplete", true);

        requestCompletion(fixture);
        int auditBefore = countAuditEvents("PLACEMENT_COMPLETED");

        ResponseEntity<Map> completed = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        assertThat(completed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completed.getBody()).containsEntry("status", "COMPLETED");
        assertThat(completed.getBody().get("completedAt")).isNotNull();
        assertThat(countAuditEvents("PLACEMENT_COMPLETED")).isEqualTo(auditBefore + 1);
    }

    @Test
    void completionReleasesTheStudentToTakeAnotherPlacement() {
        InternshipFixture fixture = createActiveInternship("cp-avail");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);

        // Availability is DERIVED from a live placement, so before completion the student is occupied.
        assertThat(hasLivePlacement(fixture)).isTrue();

        requestCompletion(fixture);
        completePlacement(fixture.universityAdmin().token(), fixture.placementId());

        assertThat(hasLivePlacement(fixture)).isFalse();
    }

    // ---------------------------------------------------------------- transitions and idempotency

    @Test
    void repeatedCompletionIsSafeAndProducesNoSecondSetOfEffects() {
        InternshipFixture fixture = createActiveInternship("cp-idem");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);
        requestCompletion(fixture);

        completePlacement(fixture.universityAdmin().token(), fixture.placementId());
        int auditAfterFirst = countAuditEvents("PLACEMENT_COMPLETED");

        ResponseEntity<Map> second = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody()).containsEntry("status", "COMPLETED");
        assertThat(countAuditEvents("PLACEMENT_COMPLETED")).isEqualTo(auditAfterFirst);
    }

    @Test
    void anActivePlacementCannotSkipTheCompletionRequest() {
        InternshipFixture fixture = createActiveInternship("cp-skip");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);

        ResponseEntity<Map> response = completePlacement(
                fixture.universityAdmin().token(), fixture.placementId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("PLACEMENT_INVALID_TRANSITION");
        assertThat(placementStatus(fixture.placementId())).isEqualTo("ACTIVE");
    }

    // ---------------------------------------------------------------- authorization

    @Test
    void onlyUniversityStaffWithStandingAuthorityMayComplete() {
        InternshipFixture fixture = createActiveInternship("cp-auth");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);
        requestCompletion(fixture);

        // The student, the host organization and the university SUPERVISOR can all SEE the
        // checklist, but completion is the university's standing decision.
        assertThat(completePlacement(fixture.studentToken(), fixture.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(completePlacement(fixture.placement().recruiterToken(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(completePlacement(fixture.universitySupervisor().token(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(completePlacement(fixture.universityAdmin().token(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void aCoordinatorMayCompleteOnlyWithinTheirOwnDepartment() {
        InternshipFixture fixture = createActiveInternship("cp-dept");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);
        java.util.UUID otherDepartment = insertDepartment(fixture.universityId(), "Business",
                "BUS-" + java.util.UUID.randomUUID().toString().substring(0, 8));
        Staff outsider = universityStaff("cp-coord-out", fixture.universityId(),
                "DEPARTMENT_COORDINATOR", List.of(otherDepartment));
        Staff inScope = universityStaff("cp-coord-in", fixture.universityId(),
                "DEPARTMENT_COORDINATOR", List.of(fixture.departmentId()));
        requestCompletion(fixture);

        assertThat(completePlacement(outsider.token(), fixture.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(completePlacement(inScope.token(), fixture.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void universityACannotCompleteUniversityBPlacement() {
        InternshipFixture ours = createActiveInternship("cp-uni-a");
        InternshipFixture theirs = createActiveInternship("cp-uni-b");
        requestCompletion(ours);

        assertThat(completePlacement(theirs.universityAdmin().token(), ours.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void everyPartyAttachedToThePlacementCanSeeTheChecklist() {
        InternshipFixture fixture = createActiveInternship("cp-visible");

        assertThat(completionStatus(fixture.studentToken(), fixture.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(completionStatus(fixture.universitySupervisor().token(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completionStatus(fixture.organizationSupervisor().token(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completionStatus(fixture.placement().recruiterToken(), fixture.placementId())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void anUnrelatedUsersChecklistRequestIsRefused() {
        InternshipFixture ours = createActiveInternship("cp-outsider");
        InternshipFixture theirs = createActiveInternship("cp-outsider2");

        assertThat(completionStatus(theirs.studentToken(), ours.placementId()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- helpers

    private void assertThatBlockedBy(ResponseEntity<Map> response, String requirement, String code) {
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("PLACEMENT_COMPLETION_REQUIREMENTS_NOT_MET");
        List<Map<String, Object>> fieldErrors = (List<Map<String, Object>>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).anySatisfy(error -> {
            assertThat(error.get("field")).isEqualTo(requirement);
            assertThat(error.get("code")).isEqualTo(code);
        });
    }

    private List<Map<String, Object>> requirements(ResponseEntity<Map> status) {
        return (List<Map<String, Object>>) status.getBody().get("requirements");
    }

    private Map<String, Object> requirement(List<Map<String, Object>> requirements, String type) {
        return requirements.stream()
                .filter(requirement -> type.equals(requirement.get("type")))
                .findFirst()
                .orElseThrow();
    }

    private boolean hasLivePlacement(InternshipFixture fixture) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placements WHERE student_user_id = ? "
                        + "AND status IN ('PLANNED', 'ACTIVE', 'COMPLETION_PENDING')",
                Integer.class, fixture.placement().student().userId());
        return count != null && count > 0;
    }
}
