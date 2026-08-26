package com.fursadhub.internshipmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Internship policy configuration and precedence (CLAUDE.md section 41, Phase 6 sections 3-4).
 *
 * <p>Two levels, five booleans, explicit precedence, and — critically — a snapshot that stops a later
 * policy edit from rewriting what an in-flight internship required.
 */
class InternshipPolicyIT extends AbstractPhase6IT {

    private String universityPolicyPath(UUID universityId) {
        return "/api/v1/universities/" + universityId + "/internship-policy";
    }

    private String departmentPolicyPath(UUID universityId, UUID departmentId) {
        return "/api/v1/universities/" + universityId + "/departments/" + departmentId + "/internship-policy";
    }

    @Test
    void anUnconfiguredUniversityRequiresNothing() {
        InternshipFixture fixture = createActiveInternship("pol-default");

        ResponseEntity<Map> response = authorizedGet(
                universityPolicyPath(fixture.universityId()), fixture.universityAdmin().token());

        // FursadHub does not invent university regulations: with nothing configured, nothing is
        // required and no real internship is blocked from completing.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("source", "PLATFORM_DEFAULT");
        assertThat(response.getBody()).containsEntry("weeklyLogsRequired", false);
        assertThat(response.getBody()).containsEntry("finalReportRequired", false);
        assertThat(response.getBody()).containsEntry("defenseRequired", false);
    }

    @Test
    void aUniversityAdminSetsTheUniversityWideDefault() {
        InternshipFixture fixture = createActiveInternship("pol-uni");

        ResponseEntity<Map> saved = authorizedPut(universityPolicyPath(fixture.universityId()),
                fixture.universityAdmin().token(), policyBody(true, false, true, false, false));

        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(saved.getBody()).containsEntry("source", "UNIVERSITY");
        assertThat(saved.getBody()).containsEntry("weeklyLogsRequired", true);
        assertThat(saved.getBody()).containsEntry("organizationEvaluationRequired", true);
        assertThat(saved.getBody()).containsEntry("attendanceRequired", false);
    }

    @Test
    void aDepartmentWithoutAnOverrideReportsTheUniversityValues() {
        InternshipFixture fixture = createActiveInternship("pol-inherit");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, true, false, false, false);

        ResponseEntity<Map> response = authorizedGet(
                departmentPolicyPath(fixture.universityId(), fixture.departmentId()),
                fixture.universityAdmin().token());

        // Staff see what students are actually held to, labelled as inherited rather than as the
        // department's own configuration.
        assertThat(response.getBody()).containsEntry("source", "UNIVERSITY");
        assertThat(response.getBody()).containsEntry("weeklyLogsRequired", true);
        assertThat(response.getBody()).containsEntry("attendanceRequired", true);
    }

    @Test
    void aDepartmentOverrideReplacesTheUniversityDefaultRatherThanMergingWithIt() {
        InternshipFixture fixture = createActiveInternship("pol-override");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, true, true, true, true);

        ResponseEntity<Map> saved = setDepartmentPolicy(
                fixture.universityAdmin().token(), fixture.universityId(), fixture.departmentId(),
                false, false, false, true, false);

        assertThat(saved.getBody()).containsEntry("source", "DEPARTMENT");
        // A department can WAIVE a university requirement, not only add to one — merging would make
        // that impossible and would hide the effective policy across two rows.
        assertThat(saved.getBody()).containsEntry("weeklyLogsRequired", false);
        assertThat(saved.getBody()).containsEntry("finalReportRequired", true);
    }

    @Test
    void removingAnOverrideReturnsTheDepartmentToTheUniversityDefault() {
        InternshipFixture fixture = createActiveInternship("pol-clear");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);
        setDepartmentPolicy(fixture.universityAdmin().token(), fixture.universityId(), fixture.departmentId(),
                false, false, false, false, false);

        ResponseEntity<Map> cleared = authorizedDelete(
                departmentPolicyPath(fixture.universityId(), fixture.departmentId()),
                fixture.universityAdmin().token());

        // Distinct from "everything false", which is a decision rather than a deferral.
        assertThat(cleared.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cleared.getBody()).containsEntry("source", "UNIVERSITY");
        assertThat(cleared.getBody()).containsEntry("weeklyLogsRequired", true);
    }

    @Test
    void aCoordinatorMaySetTheirOwnDepartmentButNotTheUniversityDefault() {
        InternshipFixture fixture = createActiveInternship("pol-coord");
        Staff coordinator = universityStaff(
                "pol-coord-in", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(fixture.departmentId()));

        assertThat(setDepartmentPolicy(coordinator.token(), fixture.universityId(), fixture.departmentId(),
                true, false, false, false, false).getStatusCode()).isEqualTo(HttpStatus.OK);

        // The university-wide default belongs to the admin.
        assertThat(authorizedPut(universityPolicyPath(fixture.universityId()), coordinator.token(),
                policyBody(true, true, true, true, true)).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void aCoordinatorCannotConfigureAnotherDepartment() {
        InternshipFixture fixture = createActiveInternship("pol-coord-out");
        UUID otherDepartment = insertDepartment(
                fixture.universityId(), "Business", "BUS-" + UUID.randomUUID().toString().substring(0, 8));
        Staff coordinator = universityStaff(
                "pol-coord-o", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(fixture.departmentId()));

        ResponseEntity<Map> response = setDepartmentPolicy(
                coordinator.token(), fixture.universityId(), otherDepartment, true, false, false, false, false);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void universityACannotConfigureUniversityBPolicy() {
        InternshipFixture ours = createActiveInternship("pol-uni-a");
        InternshipFixture theirs = createActiveInternship("pol-uni-b");

        assertThat(authorizedPut(universityPolicyPath(theirs.universityId()),
                ours.universityAdmin().token(), policyBody(true, true, true, true, true))
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void aDepartmentFromAnotherUniversityCannotBeAttachedToThisUniversitysPolicy() {
        InternshipFixture ours = createActiveInternship("pol-crossdept");
        InternshipFixture theirs = createActiveInternship("pol-crossdept2");

        // Our admin, our university in the path, but THEIR department id in it.
        ResponseEntity<Map> response = setDepartmentPolicy(
                ours.universityAdmin().token(), ours.universityId(), theirs.departmentId(),
                true, false, false, false, false);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(errorCode(response)).isEqualTo("DEPARTMENT_NOT_FOUND");
    }

    @Test
    void aStudentCannotReadOrChangePolicy() {
        InternshipFixture fixture = createActiveInternship("pol-student");

        assertThat(authorizedGet(universityPolicyPath(fixture.universityId()), fixture.studentToken())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedPut(universityPolicyPath(fixture.universityId()), fixture.studentToken(),
                policyBody(false, false, false, false, false)).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anIncompletePolicyBodyIsRejectedRatherThanSilentlyDisablingARequirement() {
        InternshipFixture fixture = createActiveInternship("pol-partial");

        ResponseEntity<Map> response = authorizedPut(universityPolicyPath(fixture.universityId()),
                fixture.universityAdmin().token(), Map.of("weeklyLogsRequired", true));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void aPlacementFreezesItsRequirementsAndALaterPolicyEditDoesNotRewriteThem() {
        InternshipFixture fixture = createActiveInternship("pol-snapshot");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);

        // First Phase 6 activity freezes the resolved policy onto the placement.
        createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1);
        assertThat(policySnapshotSource(fixture.placementId())).isEqualTo("UNIVERSITY");
        assertThat(requirementRequired(fixture, "FINAL_REPORT")).isFalse();

        // The university now demands a final report of everyone.
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, true, false);

        // This placement is unaffected: it is still governed by the rules in force when it started.
        assertThat(requirementRequired(fixture, "FINAL_REPORT")).isFalse();
    }

    @Test
    void theSnapshotIsWrittenOnceAndNotReResolved() {
        InternshipFixture fixture = createActiveInternship("pol-once");
        createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1);
        createWeeklyLog(fixture.studentToken(), fixture.placementId(), 2);
        completionStatus(fixture.studentToken(), fixture.placementId());

        Integer snapshots = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placement_policy_snapshots WHERE placement_id = ?",
                Integer.class, fixture.placementId());

        assertThat(snapshots).isEqualTo(1);
    }

    private boolean requirementRequired(InternshipFixture fixture, String type) {
        ResponseEntity<Map> status = completionStatus(fixture.studentToken(), fixture.placementId());
        requireOk(status, "Completion status");
        List<Map<String, Object>> requirements = (List<Map<String, Object>>) status.getBody().get("requirements");
        return requirements.stream()
                .filter(requirement -> type.equals(requirement.get("type")))
                .map(requirement -> (Boolean) requirement.get("required"))
                .findFirst()
                .orElseThrow();
    }
}
