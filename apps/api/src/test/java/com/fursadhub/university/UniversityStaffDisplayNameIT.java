package com.fursadhub.university;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B5 — the university half of managed staff display identity.
 *
 * <p>The organization side is covered by {@code StaffDisplayNameIT}; this pins the same contract for
 * universities, whose command carries department scope alongside it and whose managed roles differ.
 * The case that matters most is the JSON boundary: an omitted property must not erase a stored name.
 */
@SuppressWarnings("unchecked")
class UniversityStaffDisplayNameIT extends AbstractPhase3IT {

    // ---------------------------------------------------------------- creation

    @Test
    @DisplayName("A pre-B5 create request still works and leaves the display name null")
    void preB5CreateStillWorks() {
        Fixture fixture = universityWithAdmin("b5u-legacy");
        String email = uniqueEmail("b5u-legacy-coord");

        ResponseEntity<Map> response = authorizedPost(staffPath(fixture), fixture.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123",
                        "role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of(fixture.departmentId().toString())));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).doesNotContainKey("displayName");
        assertThat(response.getBody().get("email")).isEqualTo(email);
    }

    @Test
    @DisplayName("A display name supplied at creation is normalised and returned")
    void displayNameAtCreationIsStored() {
        Fixture fixture = universityWithAdmin("b5u-create");

        ResponseEntity<Map> response = authorizedPost(staffPath(fixture), fixture.adminToken(),
                createBody(fixture, uniqueEmail("b5u-named"), "DEPARTMENT_COORDINATOR", "  Fatima   Omar  "));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("displayName")).isEqualTo("Fatima Omar");
    }

    // ---------------------------------------------------------------- command semantics

    @Test
    @DisplayName("A value sets the name and an explicit null clears it")
    void valueSetsAndExplicitNullClears() {
        Fixture fixture = universityWithAdmin("b5u-set-clear");
        String membershipId = createStaff(fixture, "DEPARTMENT_COORDINATOR", null);

        ResponseEntity<Map> named = postJson(displayNamePath(fixture, membershipId), fixture.adminToken(),
                "{\"displayName\":\"Fatima Omar\"}");
        assertThat(named.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(named.getBody().get("displayName")).isEqualTo("Fatima Omar");

        ResponseEntity<Map> cleared = postJson(displayNamePath(fixture, membershipId), fixture.adminToken(),
                "{\"displayName\":null}");
        assertThat(cleared.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cleared.getBody()).doesNotContainKey("displayName");
        // The membership itself is untouched by a display-name command.
        assertThat(cleared.getBody().get("role")).isEqualTo("DEPARTMENT_COORDINATOR");
    }

    @Test
    @DisplayName("A blank display name clears")
    void blankClears() {
        Fixture fixture = universityWithAdmin("b5u-blank");
        String membershipId = createStaff(fixture, "DEPARTMENT_COORDINATOR", "Fatima Omar");

        ResponseEntity<Map> blank = postJson(displayNamePath(fixture, membershipId), fixture.adminToken(),
                "{\"displayName\":\"   \"}");

        assertThat(blank.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(blank.getBody()).doesNotContainKey("displayName");
    }

    /**
     * The reason this command's field is presence-aware: a plain String cannot tell {} from
     * {"displayName": null}, so an empty payload would silently erase a stored name.
     */
    @Test
    @DisplayName("An empty payload is rejected and preserves the existing display name")
    void emptyPayloadIsRejectedAndPreservesTheName() {
        Fixture fixture = universityWithAdmin("b5u-empty");
        String membershipId = createStaff(fixture, "DEPARTMENT_COORDINATOR", "Fatima Omar");

        ResponseEntity<Map> response =
                postJson(displayNamePath(fixture, membershipId), fixture.adminToken(), "{}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
        assertThat(staffById(fixture, membershipId).get("displayName")).isEqualTo("Fatima Omar");
    }

    @Test
    @DisplayName("A missing request body is rejected and preserves the existing display name")
    void missingBodyIsRejectedAndPreservesTheName() {
        Fixture fixture = universityWithAdmin("b5u-nobody");
        String membershipId = createStaff(fixture, "DEPARTMENT_COORDINATOR", "Fatima Omar");

        ResponseEntity<Map> response =
                postJson(displayNamePath(fixture, membershipId), fixture.adminToken(), "");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(staffById(fixture, membershipId).get("displayName")).isEqualTo("Fatima Omar");
    }

    // ---------------------------------------------------------------- write boundary

    @Test
    @DisplayName("Both managed university roles may be named")
    void bothManagedUniversityRolesMayBeNamed() {
        Fixture fixture = universityWithAdmin("b5u-roles");

        for (String role : List.of("DEPARTMENT_COORDINATOR", "UNIVERSITY_SUPERVISOR")) {
            String membershipId = createStaff(fixture, role, null);
            ResponseEntity<Map> response = postJson(displayNamePath(fixture, membershipId), fixture.adminToken(),
                    "{\"displayName\":\"Named " + role + "\"}");
            assertThat(response.getBody().get("displayName")).isEqualTo("Named " + role);
        }
    }

    /** A UNIVERSITY_ADMIN is a self-registered founder — their global name is not writable here. */
    @Test
    @DisplayName("A founder admin's own membership cannot be renamed through the staff route")
    void founderAdminCannotBeRenamed() {
        Fixture fixture = universityWithAdmin("b5u-founder");
        String adminMembershipId = staffByRole(fixture, "UNIVERSITY_ADMIN");

        ResponseEntity<Map> response = postJson(displayNamePath(fixture, adminMembershipId), fixture.adminToken(),
                "{\"displayName\":\"Renamed Founder\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    @DisplayName("University A cannot rename University B's staff")
    void crossTenantRenameIsRefused() {
        Fixture universityA = universityWithAdmin("b5u-tenant-a");
        Fixture universityB = universityWithAdmin("b5u-tenant-b");
        String membershipB = createStaff(universityB, "DEPARTMENT_COORDINATOR", "Original Name");

        ResponseEntity<Map> throughA = postJson(displayNamePath(universityA, membershipB), universityA.adminToken(),
                "{\"displayName\":\"Hijacked\"}");
        assertThat(throughA.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<Map> throughB = postJson(displayNamePath(universityB, membershipB), universityA.adminToken(),
                "{\"displayName\":\"Hijacked\"}");
        assertThat(throughB.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(staffById(universityB, membershipB).get("displayName")).isEqualTo("Original Name");
    }

    @Test
    @DisplayName("Anonymous callers cannot rename staff")
    void anonymousCannotRename() {
        Fixture fixture = universityWithAdmin("b5u-anon");
        String membershipId = createStaff(fixture, "DEPARTMENT_COORDINATOR", "Fatima Omar");

        ResponseEntity<Map> response = restTemplate.exchange(
                url(displayNamePath(fixture, membershipId)), HttpMethod.POST,
                new org.springframework.http.HttpEntity<>("{\"displayName\":\"Hijacked\"}", jsonHeaders()), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(staffById(fixture, membershipId).get("displayName")).isEqualTo("Fatima Omar");
    }

    // ---------------------------------------------------------------- helpers

    private record Fixture(UUID universityId, UUID departmentId, String adminToken) {
    }

    private Fixture universityWithAdmin(String prefix) {
        UUID universityId = insertVerifiedUniversity(uniqueName("B5U " + prefix));
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS-" + UUID.randomUUID());

        String adminEmail = uniqueEmail(prefix);
        register(adminEmail, "Password123");
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN");

        return new Fixture(universityId, departmentId, adminToken);
    }

    private String staffPath(Fixture fixture) {
        return "/api/v1/universities/" + fixture.universityId() + "/staff";
    }

    private String displayNamePath(Fixture fixture, String membershipId) {
        return staffPath(fixture) + "/" + membershipId + "/display-name";
    }

    private Map<String, Object> createBody(Fixture fixture, String email, String role, String displayName) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("password", "Password123");
        body.put("confirmPassword", "Password123");
        body.put("role", role);
        body.put("departmentIds", List.of(fixture.departmentId().toString()));
        if (displayName != null) {
            body.put("displayName", displayName);
        }
        return body;
    }

    private String createStaff(Fixture fixture, String role, String displayName) {
        ResponseEntity<Map> response = authorizedPost(staffPath(fixture), fixture.adminToken(),
                createBody(fixture, uniqueEmail("b5u-staff"), role, displayName));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return (String) response.getBody().get("membershipId");
    }

    private Map<String, Object> staffById(Fixture fixture, String membershipId) {
        return staffList(fixture).stream()
                .filter(staff -> membershipId.equals(staff.get("membershipId")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("membership " + membershipId + " not found"));
    }

    private String staffByRole(Fixture fixture, String role) {
        return staffList(fixture).stream()
                .filter(staff -> role.equals(staff.get("role")))
                .map(staff -> (String) staff.get("membershipId"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no membership with role " + role));
    }

    private List<Map<String, Object>> staffList(Fixture fixture) {
        return restTemplate.exchange(
                url(staffPath(fixture)), HttpMethod.GET,
                new org.springframework.http.HttpEntity<>(bearer(fixture.adminToken())), List.class).getBody();
    }

    /** POST with a hand-written body, so {} and an explicit null are distinguishable on the wire. */
    private ResponseEntity<Map> postJson(String path, String token, String json) {
        return restTemplate.exchange(url(path), HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(json, bearer(token)), Map.class);
    }

    private org.springframework.http.HttpHeaders bearer(String token) {
        org.springframework.http.HttpHeaders headers = jsonHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private org.springframework.http.HttpHeaders jsonHeaders() {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        return headers;
    }
}
