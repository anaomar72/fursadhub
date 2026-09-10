package com.fursadhub.organization;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Managed staff provisioning for Organization Admins (CLAUDE.md section 26A, section 60's
 * mandatory security tests): creating a brand-new Recruiter/Organization Supervisor account with
 * an admin-chosen password, and the tenant/role boundaries around managing it afterward. Mirrors
 * {@code UniversityManagedStaffProvisioningIT} with no department-scope concept.
 */
class OrganizationManagedStaffProvisioningIT extends AbstractPhase7IT {

    // ---------------------------------------------------------------- creation

    @Test
    @DisplayName("An organization admin creates a recruiter who never self-registered")
    void organizationAdminCreatesRecruiterWithoutPriorRegistration() {
        Organization organization = newOrganization("org-create");
        String email = uniqueEmail(emailPrefix("org-new-recruiter"));

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", uniqueUsername(), "role", "RECRUITER"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("role")).isEqualTo("RECRUITER");
        // The admin vouches for the staff member's identity/email directly — no separate
        // contact-verification step (CLAUDE.md section 26A "Contact Verification").
        assertThat(response.getBody().get("status")).isEqualTo("ACTIVE");
        assertThat(userRepository.existsByEmail(email)).isTrue();
    }

    @Test
    @DisplayName("The new staff account logs in immediately, without verifying its email")
    void createdStaffLogsInImmediatelyWithoutVerification() {
        Organization organization = newOrganization("org-login");
        String email = uniqueEmail(emailPrefix("org-login-recruiter"));
        String username = uniqueUsername();

        requireOk(authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", username, "role", "RECRUITER")),
                "Create recruiter");

        // Backend Phase B5.5: a managed account authenticates by username, not by its email.
        String staffToken = loginByUsernameAndExtractAccessToken(username, "Password123");
        assertThat(staffToken).isNotBlank();
        assertThat(authorizedGet("/api/v1/me", staffToken).getBody().get("status")).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Public self-registration never produces a managed staff role")
    void publicRegistrationCannotProduceManagedStaffRole() {
        String email = uniqueEmail(emailPrefix("org-public-reg"));
        registerVerifiedUser(email);

        Integer membershipCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM organization_memberships WHERE user_id = ?", Integer.class, userIdOf(email));

        assertThat(membershipCount).isZero();
    }

    // ---------------------------------------------------------------- password handling

    @Test
    @DisplayName("Password and confirmation must match")
    void createRejectsPasswordConfirmationMismatch() {
        Organization organization = newOrganization("org-mismatch");

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("org-mismatch-staff")), "password", "Password123",
                        "confirmPassword", "Password124", "username", uniqueUsername(), "role", "RECRUITER"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("STAFF_PASSWORD_CONFIRMATION_MISMATCH");
    }

    @Test
    @DisplayName("The member list never exposes a password or its hash")
    void memberListResponseNeverContainsPasswordOrHash() {
        Organization organization = newOrganization("org-no-leak");
        String password = "Password123";

        requireOk(authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("org-no-leak-staff")), "password", password,
                        "confirmPassword", password, "username", uniqueUsername(), "role", "RECRUITER")),
                "Create recruiter");

        ResponseEntity<List> list = authorizedGetList("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken());
        requireOk(list, "List members");
        assertThat(list.getBody().toString()).doesNotContain(password);
    }

    // ---------------------------------------------------------------- duplicate email

    @Test
    @DisplayName("An email that already has an account cannot be turned into staff by this endpoint")
    void createRejectsAlreadyRegisteredEmail() {
        Organization organization = newOrganization("org-dup-email");
        String existingEmail = uniqueEmail(emailPrefix("org-dup-existing"));
        registerVerifiedUser(existingEmail);

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", existingEmail, "password", "Password123", "confirmPassword", "Password123", "username", uniqueUsername(), "role", "RECRUITER"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("STAFF_EMAIL_ALREADY_EXISTS");
    }

    // ---------------------------------------------------------------- role assignability

    @Test
    @DisplayName("An organization admin cannot create another organization admin through this endpoint")
    void createRejectsOrganizationAdminRole() {
        Organization organization = newOrganization("org-self-escalate");

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("org-escalate-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "ORGANIZATION_ADMIN"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    @DisplayName("An organization admin cannot create SUPER_ADMIN or a university role")
    void createRejectsSuperAdminAndCrossDomainRole() {
        Organization organization = newOrganization("org-cross-domain");

        ResponseEntity<Map> superAdminAttempt = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("org-super-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "SUPER_ADMIN"));
        assertThat(superAdminAttempt.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<Map> coordinatorAttempt = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("org-coordinator-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "DEPARTMENT_COORDINATOR"));
        assertThat(coordinatorAttempt.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Role changes enforce the same allowlist as creation")
    void roleChangeRejectsOrganizationAdminRole() {
        Organization organization = newOrganization("org-role-change-escalate");
        UUID membershipId = createRecruiter(organization);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/role", organization.adminToken(),
                Map.of("role", "ORGANIZATION_ADMIN"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    @DisplayName("A role change between the two assignable roles succeeds")
    void roleChangeBetweenAssignableRolesSucceeds() {
        Organization organization = newOrganization("org-role-change");
        UUID membershipId = createRecruiter(organization);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/role", organization.adminToken(),
                Map.of("role", "ORGANIZATION_SUPERVISOR"));

        requireOk(response, "Change role");
        assertThat(response.getBody().get("role")).isEqualTo("ORGANIZATION_SUPERVISOR");
    }

    // ---------------------------------------------------------------- cross-tenant isolation

    @Test
    @DisplayName("Tenant A cannot mutate, suspend, reactivate, reset, or revoke Tenant B's staff")
    void organizationACannotActOnOrganizationBStaffMembership() {
        Organization organizationA = newOrganization("org-cross-a");
        Organization organizationB = newOrganization("org-cross-b");
        UUID membershipOfB = createRecruiter(organizationB);

        assertThat(errorCode(authorizedPost(
                "/api/v1/organizations/" + organizationA.id() + "/members/" + membershipOfB + "/role", organizationA.adminToken(),
                Map.of("role", "ORGANIZATION_SUPERVISOR"))))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/organizations/" + organizationA.id() + "/members/" + membershipOfB + "/suspend", organizationA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/organizations/" + organizationA.id() + "/members/" + membershipOfB + "/reactivate", organizationA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/organizations/" + organizationA.id() + "/members/" + membershipOfB + "/reset-password", organizationA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/organizations/" + organizationA.id() + "/members/" + membershipOfB + "/revoke", organizationA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
    }

    // ---------------------------------------------------------------- role-based access to staff management

    @Test
    @DisplayName("A recruiter cannot call any organization-admin-only staff management endpoint")
    void recruiterCannotCallMemberManagementEndpoints() {
        Organization organization = newOrganization("org-recruiter-blocked");
        StaffAccount recruiter = createAndLoginRecruiter(organization);

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", recruiter.token(),
                Map.of("email", uniqueEmail(emailPrefix("org-blocked-target")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "RECRUITER"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    @DisplayName("An organization supervisor does not inherit organization admin scope")
    void organizationSupervisorCannotCallMemberManagementEndpoints() {
        Organization organization = newOrganization("org-supervisor-blocked");
        String email = uniqueEmail(emailPrefix("org-supervisor"));
        registerVerifiedUser(email);
        String supervisorToken = loginAndExtractAccessToken(email, "Password123");
        insertOrganizationMembership(organization.id(), userIdOf(email), "ORGANIZATION_SUPERVISOR");

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", supervisorToken,
                Map.of("email", uniqueEmail(emailPrefix("org-supervisor-target")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "ORGANIZATION_SUPERVISOR"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    // ---------------------------------------------------------------- suspend / reactivate / reset-password

    @Test
    @DisplayName("Suspending a staff account blocks login and kills its existing session")
    void suspendedStaffCannotLoginOrRefresh() {
        Organization organization = newOrganization("org-suspend");
        StaffAccount staff = createAndLoginRecruiter(organization);
        String rawRefreshToken = loginByUsernameAndExtractRawRefreshToken(staff.username(), "Password123");

        requireOk(authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + staff.membershipId() + "/suspend",
                organization.adminToken(), null), "Suspend");

        ResponseEntity<Map> loginAttempt = loginByUsername(staff.username(), "Password123");
        assertThat(loginAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(loginAttempt)).isEqualTo("ACCOUNT_SUSPENDED");
        assertThat(refreshWith(rawRefreshToken).getStatusCode().is2xxSuccessful()).isFalse();
    }

    @Test
    @DisplayName("Reactivating a suspended staff account restores login")
    void reactivatingRestoresLogin() {
        Organization organization = newOrganization("org-reactivate");
        StaffAccount staff = createAndLoginRecruiter(organization);

        requireOk(authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + staff.membershipId() + "/suspend",
                organization.adminToken(), null), "Suspend");
        requireOk(authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + staff.membershipId() + "/reactivate",
                organization.adminToken(), null), "Reactivate");

        assertThat(loginByUsernameAndExtractAccessToken(staff.username(), "Password123")).isNotBlank();
    }

    @Test
    @DisplayName("Resetting a staff password revokes existing sessions and issues a working credential")
    void resetPasswordRevokesSessionsAndIssuesWorkingCredential() {
        Organization organization = newOrganization("org-reset");
        StaffAccount staff = createAndLoginRecruiter(organization);
        String rawRefreshToken = loginByUsernameAndExtractRawRefreshToken(staff.username(), "Password123");

        ResponseEntity<Map> reset = authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + staff.membershipId() + "/reset-password",
                organization.adminToken(), null);
        requireOk(reset, "Reset password");
        String temporaryPassword = (String) reset.getBody().get("temporaryPassword");
        assertThat(temporaryPassword).isNotBlank();

        assertThat(refreshWith(rawRefreshToken).getStatusCode().is2xxSuccessful()).isFalse();
        assertThat(loginByUsername(staff.username(), "Password123").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(loginByUsernameAndExtractAccessToken(staff.username(), temporaryPassword)).isNotBlank();
    }

    @Test
    @DisplayName("A revoked membership can no longer be managed")
    void revokedMembershipIsNoLongerManageable() {
        Organization organization = newOrganization("org-revoked");
        UUID membershipId = createRecruiter(organization);

        requireOk(authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/revoke",
                organization.adminToken(), null), "Revoke");

        assertThat(errorCode(authorizedPost(
                "/api/v1/organizations/" + organization.id() + "/members/" + membershipId + "/suspend",
                organization.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
    }

    // ---------------------------------------------------------------- fixtures

    private record Organization(UUID id, String adminToken) {
    }

    /** Backend Phase B5.5: managed staff log in by username, so the fixture carries it. */
    private record StaffAccount(UUID membershipId, String email, String username, String token) {
    }

    /** A verified organization with a freshly logged-in ORGANIZATION_ADMIN (the real create-organization endpoint auto-assigns it). */
    private Organization newOrganization(String prefix) {
        String adminToken = registerVerifiedAndLogin(emailPrefix(prefix + "-admin"));
        UUID organizationId = createVerifiedOrganization(adminToken, prefix + " Org " + UUID.randomUUID());
        return new Organization(organizationId, adminToken);
    }

    /** Creates a recruiter through the real endpoint under test, returning its membership id. */
    private UUID createRecruiter(Organization organization) {
        String email = uniqueEmail(emailPrefix("org-recruiter"));
        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", uniqueUsername(), "role", "RECRUITER"));
        requireOk(response, "Create recruiter");
        return UUID.fromString((String) response.getBody().get("membershipId"));
    }

    /** Creates and logs a recruiter in (no verification step — see "Contact Verification" above). */
    private StaffAccount createAndLoginRecruiter(Organization organization) {
        String email = uniqueEmail(emailPrefix("org-recruiter"));
        String username = uniqueUsername();
        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organization.id() + "/members", organization.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", username, "role", "RECRUITER"));
        requireOk(response, "Create recruiter");
        UUID membershipId = UUID.fromString((String) response.getBody().get("membershipId"));
        String token = loginByUsernameAndExtractAccessToken(username, "Password123");
        return new StaffAccount(membershipId, email, username, token);
    }

    /** A globally unique canonical username; Backend Phase B5.5 requires one per managed account. */
    private String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
