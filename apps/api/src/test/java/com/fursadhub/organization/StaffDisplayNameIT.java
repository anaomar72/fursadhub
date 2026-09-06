package com.fursadhub.organization;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B5 — display identity for managed institution staff.
 *
 * <p>The behaviour worth protecting here is the WRITE BOUNDARY. A tenant admin may name their own
 * managed staff and nobody else: not another tenant's staff, not a founder admin (whose account may
 * span several tenants and may also be a student), and not an arbitrary user id.
 *
 * <p>Also pins that B5 is authentication-neutral and additive: a client sending the pre-B5 request
 * body still works, and email is still returned everywhere it was before.
 */
@SuppressWarnings("unchecked")
class StaffDisplayNameIT extends AbstractPhase7IT {

    // ---------------------------------------------------------------- creation

    @Test
    @DisplayName("A pre-B5 create request still works and leaves the display name null")
    void preB5CreateRequestStillWorksWithNullDisplayName() {
        Organization organization = newOrganization("b5-legacy");
        String email = uniqueEmail(emailPrefix("b5-legacy-recruiter"));

        // Exactly the pre-B5 body: no displayName.
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", uniqueUsername(),
                        "role", "RECRUITER"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        // non_null serialization omits an unset display name entirely; email is untouched.
        assertThat(response.getBody()).doesNotContainKey("displayName");
        assertThat(response.getBody().get("email")).isEqualTo(email);
    }

    @Test
    @DisplayName("A display name supplied at creation is normalised and returned")
    void displayNameSuppliedAtCreationIsStored() {
        Organization organization = newOrganization("b5-create");
        String email = uniqueEmail(emailPrefix("b5-named-recruiter"));

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                createBody(email, "RECRUITER", "  Ahmed   Hassan  "));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("displayName")).isEqualTo("Ahmed Hassan");
        assertThat(response.getBody().get("email")).isEqualTo(email);
    }

    /** Nothing is ever derived from the email address. */
    @Test
    @DisplayName("A blank display name stores null rather than deriving one from the email")
    void blankDisplayNameStoresNullAndNeverDerivesFromEmail() {
        Organization organization = newOrganization("b5-blank");
        String email = uniqueEmail(emailPrefix("ahmed.hassan"));

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                createBody(email, "RECRUITER", "   "));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).doesNotContainKey("displayName");
    }

    @Test
    @DisplayName("A display name containing a line break is rejected")
    void aDisplayNameWithControlCharactersIsRejected() {
        Organization organization = newOrganization("b5-invalid");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                createBody(uniqueEmail(emailPrefix("b5-invalid")), "RECRUITER", "Ahmed\nHassan"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    // ---------------------------------------------------------------- update

    @Test
    @DisplayName("An organization admin sets, replaces and clears their own staff's display name")
    void adminSetsReplacesAndClearsDisplayName() {
        Organization organization = newOrganization("b5-update");
        String membershipId = createMember(organization, "RECRUITER", null);

        Map<String, Object> named = changeDisplayName(organization, membershipId, "Ahmed Hassan").getBody();
        assertThat(named.get("displayName")).isEqualTo("Ahmed Hassan");

        Map<String, Object> renamed = changeDisplayName(organization, membershipId, "Fatima Omar").getBody();
        assertThat(renamed.get("displayName")).isEqualTo("Fatima Omar");

        // Explicit null clears it, and the staff member remains fully intact.
        ResponseEntity<Map> cleared = authorizedPostJson(
                "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/display-name",
                organization.adminToken(), "{\"displayName\":null}");
        assertThat(cleared.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cleared.getBody()).doesNotContainKey("displayName");
        assertThat(cleared.getBody().get("role")).isEqualTo("RECRUITER");
        assertThat(cleared.getBody().get("status")).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Both managed organization roles may be named")
    void bothManagedOrganizationRolesMayBeNamed() {
        Organization organization = newOrganization("b5-roles");

        for (String role : List.of("RECRUITER", "ORGANIZATION_SUPERVISOR")) {
            String membershipId = createMember(organization, role, null);
            assertThat(changeDisplayName(organization, membershipId, "Named " + role).getBody().get("displayName"))
                    .isEqualTo("Named " + role);
        }
    }

    // ---------------------------------------------------------------- empty-payload safety

    /**
     * The JSON boundary that matters for a mutation command: an OMITTED property must not mean
     * "clear". A plain String field cannot tell {} from {"displayName": null} — Jackson yields null
     * for both — so an empty payload would silently erase a stored name.
     */
    @Test
    @DisplayName("An empty payload is rejected and preserves the existing display name")
    void anEmptyPayloadIsRejectedAndPreservesTheName() {
        Organization organization = newOrganization("b5-empty");
        String membershipId = createMember(organization, "RECRUITER", "Ahmed Hassan");

        ResponseEntity<Map> response = authorizedPostJson(displayNamePath(organization, membershipId),
                organization.adminToken(), "{}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
        assertThat(memberById(organization, membershipId).get("displayName")).isEqualTo("Ahmed Hassan");
    }

    @Test
    @DisplayName("A missing request body is rejected and preserves the existing display name")
    void aMissingBodyIsRejectedAndPreservesTheName() {
        Organization organization = newOrganization("b5-nobody");
        String membershipId = createMember(organization, "RECRUITER", "Ahmed Hassan");

        ResponseEntity<Map> response = authorizedPostJson(displayNamePath(organization, membershipId),
                organization.adminToken(), "");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(memberById(organization, membershipId).get("displayName")).isEqualTo("Ahmed Hassan");
    }

    @Test
    @DisplayName("A blank display name clears, distinct from an omitted property")
    void blankClearsWhileOmittedIsRejected() {
        Organization organization = newOrganization("b5-blank-clear");
        String membershipId = createMember(organization, "RECRUITER", "Ahmed Hassan");

        ResponseEntity<Map> blank = authorizedPostJson(displayNamePath(organization, membershipId),
                organization.adminToken(), "{\"displayName\":\"   \"}");

        assertThat(blank.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(blank.getBody()).doesNotContainKey("displayName");
    }

    // ---------------------------------------------------------------- the write boundary

    /**
     * The core B5 restriction. An ORGANIZATION_ADMIN is a self-registered founder whose account may
     * hold memberships in several tenants and may also be a student — so their user-global display
     * name must not be writable through a tenant's staff-management route, not even their own.
     */
    @Test
    @DisplayName("A founder admin's own membership cannot be renamed through the staff route")
    void aFounderAdminMembershipCannotBeRenamed() {
        Organization organization = newOrganization("b5-founder");
        String adminMembershipId = ownAdminMembershipId(organization);

        ResponseEntity<Map> response = changeDisplayName(organization, adminMembershipId, "Renamed Founder");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    @DisplayName("Organization A cannot rename Organization B's staff")
    void crossTenantRenameIsRefused() {
        Organization organizationA = newOrganization("b5-tenant-a");
        Organization organizationB = newOrganization("b5-tenant-b");
        String membershipB = createMember(organizationB, "RECRUITER", "Original Name");

        // A's admin aims at B's membership id, through A's own route.
        ResponseEntity<Map> throughA = authorizedPost(
                "/api/v1/organizations/" + organizationA.id() + "/members/" + membershipB + "/display-name",
                organizationA.adminToken(), Map.of("displayName", "Hijacked"));
        assertThat(throughA.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // And directly at B's route with A's token.
        ResponseEntity<Map> throughB = authorizedPost(
                "/api/v1/organizations/" + organizationB.id() + "/members/" + membershipB + "/display-name",
                organizationA.adminToken(), Map.of("displayName", "Hijacked"));
        assertThat(throughB.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(memberById(organizationB, membershipB).get("displayName")).isEqualTo("Original Name");
    }

    @Test
    @DisplayName("A recruiter cannot rename anyone, including themselves")
    void managedStaffGainNoRenameAuthority() {
        Organization organization = newOrganization("b5-staff-authority");
        String email = uniqueEmail(emailPrefix("b5-self"));
        String username = uniqueUsername();
        String membershipId = createMemberWithEmail(organization, email, "RECRUITER", "Ahmed Hassan", username);
        // Backend Phase B5.5: managed staff authenticate by username.
        String staffToken = loginByUsernameAndExtractAccessToken(username, "Password123");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/display-name",
                staffToken, Map.of("displayName", "Self Renamed"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(memberById(organization, membershipId).get("displayName")).isEqualTo("Ahmed Hassan");
    }

    // ---------------------------------------------------------------- authentication neutrality

    /**
     * A display name is presentation only. It is not unique, is not a login identifier, and setting
     * one must not disturb authentication in any way.
     */
    @Test
    @DisplayName("Display name is not an authentication identifier")
    void displayNameIsNotAnAuthenticationIdentifier() {
        Organization organization = newOrganization("b5-auth");
        String email = uniqueEmail(emailPrefix("b5-auth-staff"));
        String username = uniqueUsername();
        String membershipId = createMemberWithEmail(organization, email, "RECRUITER", "Ahmed Hassan", username);

        // Login still works, unchanged, after being named — by username, since Backend Phase B5.5.
        assertThat(loginByUsernameAndExtractAccessToken(username, "Password123")).isNotBlank();

        // Two staff members may share the same display name — it carries no uniqueness.
        String secondEmail = uniqueEmail(emailPrefix("b5-auth-twin"));
        String secondMembership = createMemberWithEmail(organization, secondEmail, "RECRUITER", "Ahmed Hassan");
        assertThat(memberById(organization, secondMembership).get("displayName")).isEqualTo("Ahmed Hassan");
        assertThat(memberById(organization, membershipId).get("displayName")).isEqualTo("Ahmed Hassan");

        // And the name is not a credential: it cannot be used in place of the email to log in.
        assertThat(login("Ahmed Hassan", "Password123").getStatusCode()).isNotEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- privacy

    @Test
    @DisplayName("Public institution responses still expose no staff at all")
    void publicResponsesStillExposeNoStaff() {
        Organization organization = newOrganization("b5-public");
        createMember(organization, "RECRUITER", "Ahmed Hassan");

        Map<String, Object> publicDetail =
                unauthenticatedGet("/api/v1/public/organizations/" + organization.id()).getBody();

        assertThat(publicDetail).doesNotContainKeys("members", "staff", "displayName", "email");
        assertThat(publicDetail.toString()).doesNotContain("Ahmed Hassan");
    }

    // ---------------------------------------------------------------- helpers

    private String displayNamePath(Organization organization, String membershipId) {
        return "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/display-name";
    }

    private Map<String, Object> createBody(String email, String role, String displayName) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("password", "Password123");
        body.put("confirmPassword", "Password123");
        body.put("username", uniqueUsername());
        body.put("role", role);
        if (displayName != null) {
            body.put("displayName", displayName);
        }
        return body;
    }

    private String createMember(Organization organization, String role, String displayName) {
        return createMemberWithEmail(organization, uniqueEmail(emailPrefix("b5-member")), role, displayName);
    }

    private String createMemberWithEmail(Organization organization, String email, String role, String displayName) {
        return createMemberWithEmail(organization, email, role, displayName, uniqueUsername());
    }

    private String createMemberWithEmail(
            Organization organization, String email, String role, String displayName, String username) {
        Map<String, Object> body = createBody(email, role, displayName);
        body.put("username", username);
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(), body);
        requireOk(response, "Create member");
        return (String) response.getBody().get("membershipId");
    }

    private ResponseEntity<Map> changeDisplayName(Organization organization, String membershipId, String displayName) {
        return authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/display-name",
                organization.adminToken(), Map.of("displayName", displayName));
    }

    private Map<String, Object> memberById(Organization organization, String membershipId) {
        List<Map<String, Object>> members = authorizedGetList(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken()).getBody();
        return members.stream()
                .filter(member -> membershipId.equals(member.get("membershipId")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("membership " + membershipId + " not found"));
    }

    private String ownAdminMembershipId(Organization organization) {
        return memberByRole(organization, "ORGANIZATION_ADMIN");
    }

    private String memberByRole(Organization organization, String role) {
        List<Map<String, Object>> members = authorizedGetList(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken()).getBody();
        return members.stream()
                .filter(member -> role.equals(member.get("role")))
                .map(member -> (String) member.get("membershipId"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no membership with role " + role));
    }

    private record Organization(UUID id, String adminToken) {
    }

    /** A verified organization with a freshly logged-in ORGANIZATION_ADMIN. */
    private Organization newOrganization(String prefix) {
        String adminToken = registerVerifiedAndLogin(emailPrefix(prefix + "-admin"));
        UUID organizationId = createVerifiedOrganization(adminToken, prefix + " Org " + UUID.randomUUID());
        return new Organization(organizationId, adminToken);
    }

    /**
     * POST with a hand-written JSON body, for the explicit-null case: a Map's null values are
     * stripped by the application's non_null serialization before they leave this test, which would
     * turn "clear the name" into "send nothing".
     */
    private ResponseEntity<Map> authorizedPostJson(String path, String token, String json) {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), org.springframework.http.HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(json, headers), Map.class);
    }

    private String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
