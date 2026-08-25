package com.fursadhub.placement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The placement authorization boundary (CLAUDE.md sections 24-26, 60).
 *
 * <p>Every test here changes a UUID in a URL while holding a completely legitimate account, because
 * that is the actual attack: the caller is a real recruiter, a real coordinator, a real student —
 * just not for THIS placement. A role string is never enough, so each case proves the backend
 * re-resolves scope from the placement itself.
 */
class PlacementAccessIT extends AbstractPhase5IT {

    // ---------------------------------------------------------------- student isolation

    /** Reported as NOT FOUND, not FORBIDDEN, so probing cannot confirm the placement exists. */
    @Test
    void studentCannotReadAnotherStudentsPlacement() {
        PlacementFixture victim = createPlacement("victim");
        PlacementFixture attacker = createPlacement("attacker");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/students/me/placements/" + victim.placementId(), attacker.student().accessToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void studentPlacementListOnlyContainsTheirOwn() {
        PlacementFixture mine = createPlacement("mine");
        createPlacement("someone-else");

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/students/me/placements", mine.student().accessToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(((Map<String, Object>) response.getBody().get(0)).get("id"))
                .isEqualTo(mine.placementId().toString());
    }

    /** The student owns the placement but does not drive its lifecycle. */
    @Test
    void studentCannotStartOrTerminateTheirOwnPlacement() {
        PlacementFixture fixture = createPlacement("student-lifecycle");

        ResponseEntity<Map> start = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/start", fixture.student().accessToken(), null);

        assertThat(start.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(placementStatus(fixture.placementId())).isEqualTo("PLANNED");
    }

    // ---------------------------------------------------------------- organization isolation

    @Test
    void recruiterFromAnotherOrganizationCannotReadPlacement() {
        PlacementFixture fixture = createPlacement("org-victim");

        // A completely legitimate recruiter — at a different organization.
        String outsiderToken = registerVerifiedAndLogin(emailPrefix("org-outsider"));
        createVerifiedOrganization(outsiderToken, "Other Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + fixture.placementId(), outsiderToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void recruiterFromAnotherOrganizationCannotRunLifecycle() {
        PlacementFixture fixture = createPlacement("org-lifecycle-victim");

        String outsiderToken = registerVerifiedAndLogin(emailPrefix("org-lifecycle-outsider"));
        createVerifiedOrganization(outsiderToken, "Other Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/terminate", outsiderToken,
                Map.of("reason", "not mine to end"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(placementStatus(fixture.placementId())).isEqualTo("PLANNED");
    }

    @Test
    void organizationListingCannotBeAimedAtAnotherOrganization() {
        PlacementFixture fixture = createPlacement("org-listing-victim");

        String outsiderToken = registerVerifiedAndLogin(emailPrefix("org-listing-outsider"));
        createVerifiedOrganization(outsiderToken, "Other Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/organizations/" + fixture.organizationId() + "/placements", outsiderToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void recruiterSeesTheirOwnOrganizationsPlacements() {
        PlacementFixture fixture = createPlacement("org-listing-own");

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/organizations/" + fixture.organizationId() + "/placements", fixture.recruiterToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    // ---------------------------------------------------------------- university isolation

    @Test
    void universityAdminSeesTheirOwnUniversitysPlacements() {
        PlacementFixture fixture = createPlacement("uni-admin");
        Staff admin = universityStaff("uni-admin-staff", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/universities/" + fixture.universityId() + "/placements", admin.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void adminOfAnotherUniversityCannotReadPlacement() {
        PlacementFixture fixture = createPlacement("uni-victim");

        UUID otherUniversityId = insertVerifiedUniversity("Other University " + UUID.randomUUID());
        Staff outsider = universityStaff("uni-outsider", otherUniversityId, "UNIVERSITY_ADMIN", List.of());

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + fixture.placementId(), outsider.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    /**
     * Department isolation (CLAUDE.md section 25). Sharing a university with the placement is NOT
     * enough — the coordinator must hold scope over the placement's own department.
     */
    @Test
    void coordinatorOfAnotherDepartmentCannotReadPlacement() {
        PlacementFixture fixture = createPlacement("dept-victim");

        UUID otherDepartmentId = insertDepartment(fixture.universityId(), "Business", "BUS");
        Staff coordinator = universityStaff(
                "dept-outsider", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(otherDepartmentId));

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + fixture.placementId(), coordinator.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void coordinatorListingExcludesOtherDepartments() {
        PlacementFixture fixture = createPlacement("dept-listing");

        UUID otherDepartmentId = insertDepartment(fixture.universityId(), "Business", "BUS");
        Staff outsideCoordinator = universityStaff(
                "dept-listing-outsider", fixture.universityId(), "DEPARTMENT_COORDINATOR", List.of(otherDepartmentId));
        Staff scopedCoordinator = universityStaff(
                "dept-listing-scoped", fixture.universityId(), "DEPARTMENT_COORDINATOR",
                List.of(fixture.departmentId()));

        ResponseEntity<List> outside = authorizedGetList(
                "/api/v1/universities/" + fixture.universityId() + "/placements", outsideCoordinator.token());
        ResponseEntity<List> scoped = authorizedGetList(
                "/api/v1/universities/" + fixture.universityId() + "/placements", scopedCoordinator.token());

        assertThat(outside.getBody()).isEmpty();
        assertThat(scoped.getBody()).hasSize(1);
    }

    @Test
    void coordinatorInScopeCanReadPlacement() {
        PlacementFixture fixture = createPlacement("dept-in-scope");
        Staff coordinator = universityStaff(
                "dept-in-scope-staff", fixture.universityId(), "DEPARTMENT_COORDINATOR",
                List.of(fixture.departmentId()));

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + fixture.placementId(), coordinator.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    /** University staff read placements; the lifecycle belongs to the hosting organization. */
    @Test
    void universityAdminCannotRunTheLifecycle() {
        PlacementFixture fixture = createPlacement("uni-lifecycle");
        Staff admin = universityStaff("uni-lifecycle-staff", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/start", admin.token(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(placementStatus(fixture.placementId())).isEqualTo("PLANNED");
    }

    // ---------------------------------------------------------------- supervisor scope

    /**
     * The narrowest scope in the system: holding the supervisor role grants NOTHING on its own.
     * An unassigned supervisor cannot read a placement at their own university.
     */
    @Test
    void unassignedUniversitySupervisorCannotReadPlacement() {
        PlacementFixture fixture = createPlacement("sup-unassigned");
        Staff supervisor = universityStaff(
                "sup-unassigned-staff", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + fixture.placementId(), supervisor.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void assignedUniversitySupervisorCanReadOnlyTheirOwnPlacements() {
        PlacementFixture assigned = createPlacement("sup-assigned");
        Staff admin = universityStaff("sup-admin", assigned.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff supervisor = universityStaff(
                "sup-assigned-staff", assigned.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        assignUniversitySupervisor(assigned.placementId(), admin.token(), supervisor.userId());

        // Reachable: they are actively assigned to it.
        assertThat(authorizedGet("/api/v1/placements/" + assigned.placementId(), supervisor.token())
                .getStatusCode()).isEqualTo(HttpStatus.OK);

        // Another placement at the SAME university that they are not assigned to stays invisible.
        PlacementFixture otherPlacement = placementAt(assigned.universityId(), assigned.departmentId(), "sup-other");
        assertThat(authorizedGet("/api/v1/placements/" + otherPlacement.placementId(), supervisor.token())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // And the university listing narrows to their assignments rather than the whole university.
        ResponseEntity<List> listing = authorizedGetList(
                "/api/v1/universities/" + assigned.universityId() + "/placements", supervisor.token());
        assertThat(listing.getBody()).hasSize(1);
        assertThat(((Map<String, Object>) listing.getBody().get(0)).get("id"))
                .isEqualTo(assigned.placementId().toString());
    }

    /** Access ends the moment the assignment is closed — it does not linger. */
    @Test
    void replacedSupervisorLosesAccessImmediately() {
        PlacementFixture fixture = createPlacement("sup-replaced");
        Staff admin = universityStaff("sup-replaced-admin", fixture.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff first = universityStaff("sup-replaced-first", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());
        Staff second = universityStaff("sup-replaced-second", fixture.universityId(), "UNIVERSITY_SUPERVISOR", List.of());

        assignUniversitySupervisor(fixture.placementId(), admin.token(), first.userId());
        assertThat(authorizedGet("/api/v1/placements/" + fixture.placementId(), first.token())
                .getStatusCode()).isEqualTo(HttpStatus.OK);

        assignUniversitySupervisor(fixture.placementId(), admin.token(), second.userId());

        assertThat(authorizedGet("/api/v1/placements/" + fixture.placementId(), first.token())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/placements/" + fixture.placementId(), second.token())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    /** An organization supervisor sees their assignments, never the organization's wider pipeline. */
    @Test
    void organizationSupervisorListingIsLimitedToAssignments() {
        PlacementFixture assigned = createPlacement("orgsup");
        Staff supervisor = organizationStaff(
                "orgsup-staff", assigned.organizationId(), "ORGANIZATION_SUPERVISOR");

        // A second placement at the same organization, for a different student.
        UUID secondPlacementId = secondPlacementAtSameOrganization(assigned);

        ResponseEntity<Map> assign = authorizedPost(
                "/api/v1/placements/" + assigned.placementId() + "/organization-supervisor",
                assigned.recruiterToken(), Map.of("supervisorUserId", supervisor.userId().toString()));
        assertThat(assign.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<List> listing = authorizedGetList(
                "/api/v1/organizations/" + assigned.organizationId() + "/placements", supervisor.token());

        assertThat(listing.getBody()).hasSize(1);
        assertThat(((Map<String, Object>) listing.getBody().get(0)).get("id"))
                .isEqualTo(assigned.placementId().toString());
        assertThat(authorizedGet("/api/v1/placements/" + secondPlacementId, supervisor.token())
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    /** Supervising an internship does not confer authority to end it. */
    @Test
    void organizationSupervisorCannotRunTheLifecycle() {
        PlacementFixture fixture = createPlacement("orgsup-lifecycle");
        Staff supervisor = organizationStaff(
                "orgsup-lifecycle-staff", fixture.organizationId(), "ORGANIZATION_SUPERVISOR");
        authorizedPost("/api/v1/placements/" + fixture.placementId() + "/organization-supervisor",
                fixture.recruiterToken(), Map.of("supervisorUserId", supervisor.userId().toString()));

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/terminate", supervisor.token(),
                Map.of("reason", "not my call"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(placementStatus(fixture.placementId())).isEqualTo("PLANNED");
    }

    // ---------------------------------------------------------------- unauthenticated

    @Test
    void unauthenticatedCallerCannotReachPlacements() {
        PlacementFixture fixture = createPlacement("anon");

        ResponseEntity<Map> response = restTemplate.getForEntity(
                url("/api/v1/placements/" + fixture.placementId()), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ---------------------------------------------------------------- helpers

    private void assignUniversitySupervisor(UUID placementId, String staffToken, UUID supervisorUserId) {
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + placementId + "/university-supervisor", staffToken,
                Map.of("supervisorUserId", supervisorUserId.toString()));
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Supervisor assignment failed: " + response.getBody());
        }
    }

    /** A placement for a fresh student at an EXISTING university/department. */
    private PlacementFixture placementAt(UUID universityId, UUID departmentId, String prefix) {
        String recruiterToken = registerVerifiedAndLogin(emailPrefix(prefix + "-recruiter"));
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiterToken, opportunityId);

        StudentFixture student = createVerifiedStudent(emailPrefix(prefix + "-student"), universityId, departmentId);
        UUID placementId = runOfferFlow(recruiterToken, opportunityId, student);

        return new PlacementFixture(
                placementId, null, opportunityId, organizationId, universityId, departmentId,
                student, recruiterToken, null);
    }

    /** A second placement at the same organization, for a different student. */
    private UUID secondPlacementAtSameOrganization(PlacementFixture fixture) {
        UUID opportunityId = createDraftOpportunity(
                fixture.recruiterToken(), fixture.organizationId(), "PUBLIC", Map.of());
        publishOpportunity(fixture.recruiterToken(), opportunityId);

        StudentFixture student = createVerifiedStudent(
                emailPrefix("second-student-" + UUID.randomUUID().toString().substring(0, 6)),
                fixture.universityId(), fixture.departmentId());

        return runOfferFlow(fixture.recruiterToken(), opportunityId, student);
    }

    private UUID runOfferFlow(String recruiterToken, UUID opportunityId, StudentFixture student) {
        ResponseEntity<Map> applied = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/applications", student.accessToken(), Map.of());
        UUID candidacyId = UUID.fromString((String) applied.getBody().get("id"));

        ResponseEntity<Map> offered = authorizedPost(
                "/api/v1/candidacies/" + candidacyId + "/offer", recruiterToken,
                Map.of(
                        "startDate", java.time.LocalDate.now().plusMonths(2).toString(),
                        "endDate", java.time.LocalDate.now().plusMonths(5).toString(),
                        "responseDeadline", java.time.LocalDate.now().plusWeeks(2).toString(),
                        "location", "Mogadishu",
                        "details", "Internship."));
        UUID offerId = UUID.fromString((String) offered.getBody().get("id"));

        ResponseEntity<Map> accepted = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", student.accessToken(), null);
        if (!accepted.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Acceptance failed: " + accepted.getBody());
        }
        Map<String, Object> placement = (Map<String, Object>) accepted.getBody().get("placement");
        return UUID.fromString((String) placement.get("id"));
    }
}
