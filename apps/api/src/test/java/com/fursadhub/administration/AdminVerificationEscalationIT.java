package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Escalating a student verification case to the platform (Phase 7 "Admin: verification escalation").
 *
 * <p>The property under test is that escalation changes WHO may act and nothing else. The frozen
 * state machine (CLAUDE.md section 30) is untouched, the university keeps its own access, and a
 * platform reviewer still cannot reach a case nobody escalated.
 */
class AdminVerificationEscalationIT extends AbstractPhase7IT {

    @Test
    @DisplayName("Escalation does not change the case's status")
    void escalationIsNotAStatus() {
        Fixture fixture = escalatedCase("esc-status");

        assertThat(caseStatus(fixture.caseId())).isEqualTo("SUBMITTED");
        assertThat(escalatedAt(fixture.caseId())).isNotNull();
        assertThat(countAuditEvents("STUDENT_VERIFICATION_ESCALATED")).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("An escalated case appears in the platform queue and can be resolved there")
    void platformReviewerResolvesEscalatedCase() {
        Staff officer = verificationOfficer("esc-officer");
        Fixture fixture = escalatedCase("esc-resolve");

        assertThat(escalationQueue(officer.token()))
                .anySatisfy(entry -> assertThat(entry.get("caseId")).isEqualTo(fixture.caseId().toString()));

        requireOk(authorizedPost(
                "/api/v1/admin/verification-escalations/" + fixture.caseId() + "/verify", officer.token(), null),
                "Verify escalated case");

        assertThat(caseStatus(fixture.caseId())).isEqualTo("VERIFIED");
        // The enrollment's denormalized status moves with it, exactly as a university resolution does.
        assertThat(enrollmentStatus(fixture.student().enrollmentId())).isEqualTo("VERIFIED");
        assertThat(countNotifications(fixture.student().userId(), "STUDENT_VERIFICATION_VERIFIED"))
                .isEqualTo(1);
    }

    @Test
    @DisplayName("A resolved case leaves the queue")
    void resolvedCasesLeaveTheQueue() {
        Staff officer = verificationOfficer("esc-queue");
        Fixture fixture = escalatedCase("esc-drain");

        requireOk(authorizedPost(
                "/api/v1/admin/verification-escalations/" + fixture.caseId() + "/reject", officer.token(),
                Map.of("note", "Identity could not be confirmed.")), "Reject");

        assertThat(escalationQueue(officer.token()))
                .noneSatisfy(entry -> assertThat(entry.get("caseId")).isEqualTo(fixture.caseId().toString()));
    }

    @Test
    @DisplayName("A platform reviewer cannot reach a case nobody escalated")
    void unescalatedCasesAreUnreachable() {
        Staff officer = verificationOfficer("esc-unreach");
        UUID universityId = insertVerifiedUniversity("Unescalated University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = studentWithSubmittedCase("esc-plain", universityId, departmentId);
        UUID caseId = myVerificationCaseId(student.accessToken());

        ResponseEntity<Map> detail = authorizedGet(
                "/api/v1/admin/verification-escalations/" + caseId, officer.token());
        ResponseEntity<Map> action = authorizedPost(
                "/api/v1/admin/verification-escalations/" + caseId + "/verify", officer.token(), null);

        // 404, not 403 — a 403 would confirm the case exists and let a reviewer enumerate students.
        assertThat(detail.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(action.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(caseStatus(caseId)).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("Rejecting an escalated case without a reason is refused")
    void rejectionRequiresAReason() {
        Staff officer = verificationOfficer("esc-noreason");
        Fixture fixture = escalatedCase("esc-blank");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/verification-escalations/" + fixture.caseId() + "/reject",
                officer.token(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(caseStatus(fixture.caseId())).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("A coordinator from another department cannot escalate a case")
    void escalationRespectsDepartmentScope() {
        UUID universityId = insertVerifiedUniversity("Escalation Scope University");
        UUID ownDepartment = insertDepartment(universityId, "Computing", "CS");
        UUID otherDepartment = insertDepartment(universityId, "Business", "BUS");

        StudentFixture student = studentWithSubmittedCase("esc-scope", universityId, ownDepartment);
        Staff outsider = universityStaff(
                "esc-outsider", universityId, "DEPARTMENT_COORDINATOR", List.of(otherDepartment));
        UUID caseId = myVerificationCaseId(student.accessToken());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + universityId + "/verification-cases/" + caseId + "/escalate",
                outsider.token(), Map.of("notes", "Not mine to escalate"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(escalatedAt(caseId)).isNull();
    }

    @Test
    @DisplayName("The university keeps its own access to a case it escalated")
    void universityRetainsAccessAfterEscalating() {
        Fixture fixture = escalatedCase("esc-retain");

        ResponseEntity<Map> detail = authorizedGet(
                "/api/v1/universities/" + fixture.universityId() + "/verification-cases/" + fixture.caseId(),
                fixture.coordinator().token());

        requireOk(detail, "University still reads its own case");
        assertThat(detail.getBody().get("escalatedAt")).isNotNull();
    }

    @Test
    @DisplayName("Escalating twice keeps the original escalation record")
    void escalationIsIdempotent() {
        Fixture fixture = escalatedCase("esc-twice");
        String firstEscalatedAt = escalatedAt(fixture.caseId());

        requireOk(authorizedPost(
                "/api/v1/universities/" + fixture.universityId() + "/verification-cases/"
                        + fixture.caseId() + "/escalate",
                fixture.coordinator().token(), Map.of("notes", "Escalating again")), "Second escalate");

        assertThat(escalatedAt(fixture.caseId())).isEqualTo(firstEscalatedAt);
    }

    // ---------------------------------------------------------------- fixture

    private record Fixture(UUID universityId, UUID caseId, StudentFixture student, Staff coordinator) {
    }

    private Fixture escalatedCase(String prefix) {
        UUID universityId = insertVerifiedUniversity("Escalation University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computing", "CS-" + UUID.randomUUID());
        StudentFixture student = studentWithSubmittedCase(prefix, universityId, departmentId);
        Staff coordinator = universityStaff(
                prefix + "-coord", universityId, "DEPARTMENT_COORDINATOR", List.of(departmentId));
        UUID caseId = myVerificationCaseId(student.accessToken());

        requireOk(authorizedPost(
                "/api/v1/universities/" + universityId + "/verification-cases/" + caseId + "/escalate",
                coordinator.token(), Map.of("notes", "Student records could not be confirmed.")),
                "Escalate");

        return new Fixture(universityId, caseId, student, coordinator);
    }

    private String caseStatus(UUID caseId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM student_verification_cases WHERE id = ?", String.class, caseId);
    }

    private String escalatedAt(UUID caseId) {
        return jdbcTemplate.queryForObject(
                "SELECT escalated_at::text FROM student_verification_cases WHERE id = ?", String.class, caseId);
    }

    private String enrollmentStatus(UUID enrollmentId) {
        return jdbcTemplate.queryForObject(
                "SELECT verification_status FROM student_enrollments WHERE id = ?", String.class, enrollmentId);
    }
}
