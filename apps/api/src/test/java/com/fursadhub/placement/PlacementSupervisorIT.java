package com.fursadhub.placement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Supervisor assignment as an append-only history (CLAUDE.md section 40).
 *
 * <p>The point these tests defend is that reassignment never OVERWRITES: the previous supervisor's
 * period survives, so "who supervised this student in March?" stays answerable after a handover.
 * They also prove the eligibility rules, because the supervisor id arrives from the browser and is
 * therefore untrusted.
 */
class PlacementSupervisorIT extends AbstractPhase5IT {

    private ResponseEntity<Map> assignUniversity(UUID placementId, String token, UUID supervisorUserId) {
        return authorizedPost("/api/v1/placements/" + placementId + "/university-supervisor", token,
                Map.of("supervisorUserId", supervisorUserId.toString()));
    }

    private ResponseEntity<Map> assignOrganization(UUID placementId, String token, UUID supervisorUserId) {
        return authorizedPost("/api/v1/placements/" + placementId + "/organization-supervisor", token,
                Map.of("supervisorUserId", supervisorUserId.toString()));
    }

    // ---------------------------------------------------------------- assignment

    @Test
    void universityAdminAssignsUniversitySupervisor() {
        PlacementFixture fixture = createPlacement("assign-uni");
        Staff admin = universityStaff("assign-uni-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff supervisor = universityStaff(
                "assign-uni-sup", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        ResponseEntity<Map> response = assignUniversity(fixture.placementId(), admin.token(), supervisor.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> assigned = (Map<String, Object>) response.getBody().get("universitySupervisor");
        assertThat(assigned).isNotNull();
        assertThat(assigned.get("supervisorUserId")).isEqualTo(supervisor.userId().toString());
        assertThat(assigned.get("active")).isEqualTo(true);
        assertThat(countActiveAssignments(fixture.placementId(), "UNIVERSITY")).isEqualTo(1);
    }

    @Test
    void coordinatorInDepartmentScopeCanAssignUniversitySupervisor() {
        PlacementFixture fixture = createPlacement("assign-coord");
        Staff coordinator = universityStaff(
                "assign-coord-staff", fixture.universityId(), "DEPARTMENT_COORDINATOR",
                List.of(fixture.departmentId()));
        Staff supervisor = universityStaff(
                "assign-coord-sup", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        ResponseEntity<Map> response = assignUniversity(fixture.placementId(), coordinator.token(), supervisor.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    /** Department isolation applies to writes too, not only to reads. */
    @Test
    void coordinatorOutOfDepartmentScopeCannotAssignUniversitySupervisor() {
        PlacementFixture fixture = createPlacement("assign-coord-out");
        UUID otherDepartmentId = insertDepartment(fixture.universityId(), "Business", "BUS");
        Staff coordinator = universityStaff(
                "assign-coord-out-staff", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(otherDepartmentId));
        Staff supervisor = universityStaff(
                "assign-coord-out-sup", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        ResponseEntity<Map> response = assignUniversity(fixture.placementId(), coordinator.token(), supervisor.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(countActiveAssignments(fixture.placementId(), "UNIVERSITY")).isZero();
    }

    @Test
    void recruiterAssignsOrganizationSupervisor() {
        PlacementFixture fixture = createPlacement("assign-org");
        Staff supervisor = organizationStaff(
                "assign-org-sup", fixture.organizationId(), "ORGANIZATION_SUPERVISOR");

        ResponseEntity<Map> response = assignOrganization(
                fixture.placementId(), fixture.recruiterToken(), supervisor.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> assigned = (Map<String, Object>) response.getBody().get("organizationSupervisor");
        assertThat(assigned.get("supervisorUserId")).isEqualTo(supervisor.userId().toString());
        assertThat(countActiveAssignments(fixture.placementId(), "ORGANIZATION")).isEqualTo(1);
    }

    /** The two posts are independent — filling one must not disturb the other. */
    @Test
    void universityAndOrganizationSupervisorsCoexist() {
        PlacementFixture fixture = createPlacement("both-sups");
        Staff admin = universityStaff("both-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff uniSupervisor = universityStaff(
                "both-uni-sup", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());
        Staff orgSupervisor = organizationStaff("both-org-sup", fixture.organizationId(), "ORGANIZATION_SUPERVISOR");

        assignUniversity(fixture.placementId(), admin.token(), uniSupervisor.userId());
        ResponseEntity<Map> response = assignOrganization(
                fixture.placementId(), fixture.recruiterToken(), orgSupervisor.userId());

        assertThat(((Map<String, Object>) response.getBody().get("universitySupervisor")).get("supervisorUserId"))
                .isEqualTo(uniSupervisor.userId().toString());
        assertThat(((Map<String, Object>) response.getBody().get("organizationSupervisor")).get("supervisorUserId"))
                .isEqualTo(orgSupervisor.userId().toString());
        assertThat(countActiveAssignments(fixture.placementId(), "UNIVERSITY")).isEqualTo(1);
        assertThat(countActiveAssignments(fixture.placementId(), "ORGANIZATION")).isEqualTo(1);
    }

    // ---------------------------------------------------------------- reassignment and history

    /** The central guarantee of CLAUDE.md section 40: reassignment preserves, never overwrites. */
    @Test
    void reassignmentClosesThePreviousAssignmentAndPreservesIt() {
        PlacementFixture fixture = createPlacement("reassign");
        Staff admin = universityStaff("reassign-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff first = universityStaff("reassign-first", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());
        Staff second = universityStaff("reassign-second", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        assignUniversity(fixture.placementId(), admin.token(), first.userId());
        ResponseEntity<Map> response = assignUniversity(fixture.placementId(), admin.token(), second.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(((Map<String, Object>) response.getBody().get("universitySupervisor")).get("supervisorUserId"))
                .isEqualTo(second.userId().toString());

        // Exactly one holder of the post, but BOTH periods still on record.
        assertThat(countActiveAssignments(fixture.placementId(), "UNIVERSITY")).isEqualTo(1);
        assertThat(countAllAssignments(fixture.placementId(), "UNIVERSITY")).isEqualTo(2);
    }

    @Test
    void historyEndpointReturnsEveryPeriodOldestFirst() {
        PlacementFixture fixture = createPlacement("history");
        Staff admin = universityStaff("history-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff first = universityStaff("history-first", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());
        Staff second = universityStaff("history-second", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        assignUniversity(fixture.placementId(), admin.token(), first.userId());
        assignUniversity(fixture.placementId(), admin.token(), second.userId());

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/placements/" + fixture.placementId() + "/supervisors", admin.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<Map<String, Object>> history = response.getBody();
        assertThat(history).hasSize(2);

        Map<String, Object> older = history.get(0);
        assertThat(older.get("supervisorUserId")).isEqualTo(first.userId().toString());
        assertThat(older.get("active")).isEqualTo(false);
        assertThat(older.get("removedAt")).isNotNull();

        Map<String, Object> current = history.get(1);
        assertThat(current.get("supervisorUserId")).isEqualTo(second.userId().toString());
        assertThat(current.get("active")).isEqualTo(true);
        assertThat(current.get("removedAt")).isNull();
    }

    /** A retried or double-clicked assignment must not fragment the history into empty periods. */
    @Test
    void reassigningTheSameSupervisorIsANoOp() {
        PlacementFixture fixture = createPlacement("same-sup");
        Staff admin = universityStaff("same-sup-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff supervisor = universityStaff(
                "same-sup-staff", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        assignUniversity(fixture.placementId(), admin.token(), supervisor.userId());
        ResponseEntity<Map> second = assignUniversity(fixture.placementId(), admin.token(), supervisor.userId());

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(countActiveAssignments(fixture.placementId(), "UNIVERSITY")).isEqualTo(1);
        assertThat(countAllAssignments(fixture.placementId(), "UNIVERSITY")).isEqualTo(1);
    }

    // ---------------------------------------------------------------- eligibility

    /** The supplied id is untrusted: staff at another university cannot be attached by id. */
    @Test
    void supervisorFromAnotherUniversityIsRejected() {
        PlacementFixture fixture = createPlacement("wrong-uni");
        Staff admin = universityStaff("wrong-uni-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());

        UUID otherUniversityId = insertVerifiedUniversity("Other University " + UUID.randomUUID());
        Staff foreignSupervisor = universityStaff(
                "wrong-uni-sup", otherUniversityId, "UNIVERSITY_SUPERVISOR", List.of());

        ResponseEntity<Map> response = assignUniversity(
                fixture.placementId(), admin.token(), foreignSupervisor.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(errorCode(response)).isEqualTo("SUPERVISOR_WRONG_UNIVERSITY");
        assertThat(countActiveAssignments(fixture.placementId(), "UNIVERSITY")).isZero();
    }

    @Test
    void supervisorFromAnotherOrganizationIsRejected() {
        PlacementFixture fixture = createPlacement("wrong-org");

        String otherRecruiterToken = registerVerifiedAndLogin(emailPrefix("wrong-org-recruiter"));
        UUID otherOrganizationId = createVerifiedOrganization(otherRecruiterToken, "Other Org " + UUID.randomUUID());
        Staff foreignSupervisor = organizationStaff(
                "wrong-org-sup", otherOrganizationId, "ORGANIZATION_SUPERVISOR");

        ResponseEntity<Map> response = assignOrganization(
                fixture.placementId(), fixture.recruiterToken(), foreignSupervisor.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(errorCode(response)).isEqualTo("SUPERVISOR_WRONG_ORGANIZATION");
        assertThat(countActiveAssignments(fixture.placementId(), "ORGANIZATION")).isZero();
    }

    /** Supervising is a distinct responsibility from administering — an admin is not eligible. */
    @Test
    void universityAdminIsNotEligibleAsSupervisor() {
        PlacementFixture fixture = createPlacement("admin-not-sup");
        Staff admin = universityStaff("admin-not-sup-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());

        ResponseEntity<Map> response = assignUniversity(fixture.placementId(), admin.token(), admin.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(errorCode(response)).isEqualTo("SUPERVISOR_NOT_ELIGIBLE");
    }

    @Test
    void unknownUserIsNotEligible() {
        PlacementFixture fixture = createPlacement("unknown-sup");
        Staff admin = universityStaff("unknown-sup-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());

        ResponseEntity<Map> response = assignUniversity(fixture.placementId(), admin.token(), UUID.randomUUID());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(errorCode(response)).isEqualTo("SUPERVISOR_NOT_ELIGIBLE");
    }

    @Test
    void missingSupervisorIdFailsValidation() {
        PlacementFixture fixture = createPlacement("missing-sup-id");
        Staff admin = universityStaff("missing-sup-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/university-supervisor", admin.token(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ---------------------------------------------------------------- eligible pickers

    @Test
    void eligibleUniversitySupervisorsListsOnlySupervisorsAtThatUniversity() {
        PlacementFixture fixture = createPlacement("eligible-uni");
        Staff admin = universityStaff("eligible-uni-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff supervisor = universityStaff(
                "eligible-uni-sup", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        // Noise that must NOT appear: a supervisor at a different university.
        UUID otherUniversityId = insertVerifiedUniversity("Other University " + UUID.randomUUID());
        universityStaff("eligible-uni-foreign", otherUniversityId, "UNIVERSITY_SUPERVISOR", List.of());

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/placements/" + fixture.placementId() + "/eligible-university-supervisors", admin.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(((Map<String, Object>) response.getBody().get(0)).get("userId"))
                .isEqualTo(supervisor.userId().toString());
    }

    @Test
    void eligibleOrganizationSupervisorsListsOnlySupervisorsAtThatOrganization() {
        PlacementFixture fixture = createPlacement("eligible-org");
        Staff supervisor = organizationStaff(
                "eligible-org-sup", fixture.organizationId(), "ORGANIZATION_SUPERVISOR");

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/placements/" + fixture.placementId() + "/eligible-organization-supervisors",
                fixture.recruiterToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(((Map<String, Object>) response.getBody().get(0)).get("userId"))
                .isEqualTo(supervisor.userId().toString());
    }

    /** The picker is scoped like everything else — an outsider cannot enumerate staff through it. */
    @Test
    void outsiderCannotListEligibleSupervisors() {
        PlacementFixture fixture = createPlacement("eligible-outsider");

        String outsiderToken = registerVerifiedAndLogin(emailPrefix("eligible-outsider-recruiter"));
        createVerifiedOrganization(outsiderToken, "Other Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + fixture.placementId() + "/eligible-organization-supervisors", outsiderToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- audit

    @Test
    void assignmentAndReassignmentAreAudited() {
        PlacementFixture fixture = createPlacement("audit-sup");
        Staff admin = universityStaff("audit-sup-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff first = universityStaff("audit-sup-first", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());
        Staff second = universityStaff("audit-sup-second", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        assignUniversity(fixture.placementId(), admin.token(), first.userId());
        assignUniversity(fixture.placementId(), admin.token(), second.userId());

        assertThat(countAuditFor("UNIVERSITY_SUPERVISOR_ASSIGNED", fixture.placementId())).isEqualTo(1);
        assertThat(countAuditFor("UNIVERSITY_SUPERVISOR_REASSIGNED", fixture.placementId())).isEqualTo(1);
    }

    private int countAuditFor(String eventType, UUID placementId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_events WHERE event_type = ? AND metadata LIKE ?",
                Integer.class, eventType, "%placementId=" + placementId + "%");
        return count == null ? 0 : count;
    }
}
