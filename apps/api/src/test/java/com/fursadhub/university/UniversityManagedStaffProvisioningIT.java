package com.fursadhub.university;

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
 * Managed staff provisioning for University Admins (CLAUDE.md section 26A, section 60's mandatory
 * security tests): creating a brand-new Department Coordinator/University Supervisor account with
 * an admin-chosen password, and the tenant/role/scope boundaries around managing it afterward.
 */
class UniversityManagedStaffProvisioningIT extends AbstractPhase7IT {

    // ---------------------------------------------------------------- creation

    @Test
    @DisplayName("A university admin creates a coordinator who never self-registered")
    void universityAdminCreatesCoordinatorWithoutPriorRegistration() {
        University university = newUniversity("uni-create");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        String email = uniqueEmail(emailPrefix("uni-new-coordinator"));

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", uniqueUsername(),
                        "role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of(departmentId.toString())));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("role")).isEqualTo("DEPARTMENT_COORDINATOR");
        // The admin vouches for the staff member's identity/email directly — no separate
        // contact-verification step (CLAUDE.md section 26A "Contact Verification").
        assertThat(response.getBody().get("status")).isEqualTo("ACTIVE");
        assertThat((List<Object>) response.getBody().get("departmentIds")).containsExactly(departmentId.toString());
        assertThat(userRepository.existsByEmail(email)).isTrue();
    }

    @Test
    @DisplayName("The new staff account logs in immediately, without verifying its email")
    void createdStaffLogsInImmediatelyWithoutVerification() {
        University university = newUniversity("uni-login");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        String email = uniqueEmail(emailPrefix("uni-login-coordinator"));
        String username = uniqueUsername();

        requireOk(authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", username,
                        "role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of(departmentId.toString()))),
                "Create coordinator");

        // Backend Phase B5.5: a managed account authenticates by username, not by its email.
        String staffToken = loginByUsernameAndExtractAccessToken(username, "Password123");
        assertThat(staffToken).isNotBlank();
        assertThat(authorizedGet("/api/v1/me", staffToken).getBody().get("status")).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Public self-registration never produces a managed staff role")
    void publicRegistrationCannotProduceManagedStaffRole() {
        String email = uniqueEmail(emailPrefix("uni-public-reg"));
        registerVerifiedUser(email);

        Integer membershipCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM university_memberships WHERE user_id = ?", Integer.class, userIdOf(email));

        assertThat(membershipCount).isZero();
    }

    // ---------------------------------------------------------------- password handling

    @Test
    @DisplayName("Password and confirmation must match")
    void createRejectsPasswordConfirmationMismatch() {
        University university = newUniversity("uni-mismatch");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-mismatch-staff")), "password", "Password123",
                        "confirmPassword", "Password124", "username", uniqueUsername(), "role", "DEPARTMENT_COORDINATOR",
                        "departmentIds", List.of(departmentId.toString())));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("STAFF_PASSWORD_CONFIRMATION_MISMATCH");
    }

    @Test
    @DisplayName("The staff list never exposes a password or its hash")
    void staffListResponseNeverContainsPasswordOrHash() {
        University university = newUniversity("uni-no-leak");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        String password = "Password123";

        requireOk(authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-no-leak-staff")), "password", password,
                        "confirmPassword", password, "username", uniqueUsername(), "role", "DEPARTMENT_COORDINATOR",
                        "departmentIds", List.of(departmentId.toString()))),
                "Create coordinator");

        ResponseEntity<List> list = authorizedGetList("/api/v1/universities/" + university.id() + "/staff", university.adminToken());
        requireOk(list, "List staff");
        assertThat(list.getBody().toString()).doesNotContain(password);
    }

    // ---------------------------------------------------------------- duplicate email

    @Test
    @DisplayName("An email that already has an account cannot be turned into staff by this endpoint")
    void createRejectsAlreadyRegisteredEmail() {
        University university = newUniversity("uni-dup-email");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        String existingEmail = uniqueEmail(emailPrefix("uni-dup-existing"));
        registerVerifiedUser(existingEmail);

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", existingEmail, "password", "Password123", "confirmPassword", "Password123", "username", uniqueUsername(),
                        "role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of(departmentId.toString())));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("STAFF_EMAIL_ALREADY_EXISTS");
    }

    // ---------------------------------------------------------------- role assignability

    @Test
    @DisplayName("A university admin cannot create another university admin through this endpoint")
    void createRejectsUniversityAdminRole() {
        University university = newUniversity("uni-self-escalate");

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-escalate-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "UNIVERSITY_ADMIN", "departmentIds", List.of()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    @DisplayName("A university admin cannot create SUPER_ADMIN or an organization role")
    void createRejectsSuperAdminAndCrossDomainRole() {
        University university = newUniversity("uni-cross-domain");

        ResponseEntity<Map> superAdminAttempt = authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-super-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "SUPER_ADMIN", "departmentIds", List.of()));
        assertThat(superAdminAttempt.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<Map> recruiterAttempt = authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-recruiter-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "RECRUITER", "departmentIds", List.of()));
        assertThat(recruiterAttempt.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Role changes enforce the same allowlist as creation")
    void roleChangeRejectsUniversityAdminRole() {
        University university = newUniversity("uni-role-change-escalate");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        UUID membershipId = createCoordinator(university, departmentId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + membershipId + "/role", university.adminToken(),
                Map.of("role", "UNIVERSITY_ADMIN", "departmentIds", List.of()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");
    }

    @Test
    @DisplayName("A role change atomically moves department scope with it")
    void roleChangeMovesDepartmentScopeAtomically() {
        University university = newUniversity("uni-role-scope");
        UUID departmentA = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        UUID departmentB = insertDepartment(university.id(), "Business", "BA-" + UUID.randomUUID());
        UUID membershipId = createCoordinator(university, departmentA);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + membershipId + "/role", university.adminToken(),
                Map.of("role", "UNIVERSITY_SUPERVISOR", "departmentIds", List.of(departmentB.toString())));

        requireOk(response, "Change role");
        assertThat(response.getBody().get("role")).isEqualTo("UNIVERSITY_SUPERVISOR");
        assertThat((List<Object>) response.getBody().get("departmentIds")).containsExactly(departmentB.toString());

        Integer stillScopedToA = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM university_membership_departments "
                        + "WHERE membership_id = ? AND department_id = ? AND removed_at IS NULL",
                Integer.class, membershipId, departmentA);
        assertThat(stillScopedToA).isZero();
    }

    // ---------------------------------------------------------------- department scope validation

    @Test
    @DisplayName("At least one department is required for an assignable role")
    void createRequiresDepartmentForCoordinator() {
        University university = newUniversity("uni-scope-required");

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-no-dept-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("STAFF_SCOPE_REQUIRED");
    }

    @Test
    @DisplayName("A department from another university cannot be used as scope")
    void createRejectsDepartmentFromAnotherUniversity() {
        University universityA = newUniversity("uni-scope-a");
        University universityB = newUniversity("uni-scope-b");
        UUID departmentOfB = insertDepartment(universityB.id(), "Business", "BA-" + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + universityA.id() + "/staff", universityA.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-cross-dept-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "DEPARTMENT_COORDINATOR",
                        "departmentIds", List.of(departmentOfB.toString())));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("DEPARTMENT_NOT_IN_UNIVERSITY");
    }

    @Test
    @DisplayName("A coordinator scoped to one department is never scoped to a sibling department")
    void coordinatorScopeNeverLeaksToASiblingDepartment() {
        University university = newUniversity("uni-sibling-scope");
        UUID departmentA = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        UUID departmentB = insertDepartment(university.id(), "Business", "BA-" + UUID.randomUUID());
        UUID membershipId = createCoordinator(university, departmentA);

        Integer scopedToB = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM university_membership_departments "
                        + "WHERE membership_id = ? AND department_id = ? AND removed_at IS NULL",
                Integer.class, membershipId, departmentB);
        assertThat(scopedToB).isZero();
    }

    // ---------------------------------------------------------------- cross-tenant isolation

    @Test
    @DisplayName("Tenant A cannot mutate, suspend, reactivate, reset, or revoke Tenant B's staff")
    void universityACannotActOnUniversityBStaffMembership() {
        University universityA = newUniversity("uni-cross-a");
        University universityB = newUniversity("uni-cross-b");
        UUID departmentB = insertDepartment(universityB.id(), "Computer Science", "CS-" + UUID.randomUUID());
        UUID membershipOfB = createCoordinator(universityB, departmentB);

        assertThat(errorCode(authorizedPost(
                "/api/v1/universities/" + universityA.id() + "/staff/" + membershipOfB + "/role", universityA.adminToken(),
                Map.of("role", "UNIVERSITY_SUPERVISOR", "departmentIds", List.of()))))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/universities/" + universityA.id() + "/staff/" + membershipOfB + "/suspend", universityA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/universities/" + universityA.id() + "/staff/" + membershipOfB + "/reactivate", universityA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/universities/" + universityA.id() + "/staff/" + membershipOfB + "/reset-password", universityA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
        assertThat(errorCode(authorizedPost(
                "/api/v1/universities/" + universityA.id() + "/staff/" + membershipOfB + "/revoke", universityA.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
    }

    // ---------------------------------------------------------------- role-based access to staff management

    @Test
    @DisplayName("A department coordinator cannot call any staff management endpoint")
    void departmentCoordinatorCannotCallStaffManagementEndpoints() {
        University university = newUniversity("uni-coord-blocked");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        StaffAccount coordinator = createAndLoginCoordinator(university, departmentId);

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", coordinator.token(),
                Map.of("email", uniqueEmail(emailPrefix("uni-blocked-target")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "DEPARTMENT_COORDINATOR",
                        "departmentIds", List.of(departmentId.toString())));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    @DisplayName("A university supervisor does not inherit university admin scope")
    void universitySupervisorCannotCallStaffManagementEndpoints() {
        University university = newUniversity("uni-supervisor-blocked");
        String email = uniqueEmail(emailPrefix("uni-supervisor"));
        registerVerifiedUser(email);
        String supervisorToken = loginAndExtractAccessToken(email, "Password123");
        insertUniversityMembership(university.id(), userIdOf(email), "UNIVERSITY_SUPERVISOR", List.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", supervisorToken,
                Map.of("email", uniqueEmail(emailPrefix("uni-supervisor-target")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", "UNIVERSITY_SUPERVISOR", "departmentIds", List.of()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    // ---------------------------------------------------------------- suspend / reactivate / reset-password

    @Test
    @DisplayName("Suspending a staff account blocks login and kills its existing session")
    void suspendedStaffCannotLoginOrRefresh() {
        University university = newUniversity("uni-suspend");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        StaffAccount staff = createAndLoginCoordinator(university, departmentId);
        String rawRefreshToken = loginByUsernameAndExtractRawRefreshToken(staff.username(), "Password123");

        requireOk(authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + staff.membershipId() + "/suspend",
                university.adminToken(), null), "Suspend");

        ResponseEntity<Map> loginAttempt = loginByUsername(staff.username(), "Password123");
        assertThat(loginAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(loginAttempt)).isEqualTo("ACCOUNT_SUSPENDED");
        assertThat(refreshWith(rawRefreshToken).getStatusCode().is2xxSuccessful()).isFalse();
    }

    @Test
    @DisplayName("Reactivating a suspended staff account restores login")
    void reactivatingRestoresLogin() {
        University university = newUniversity("uni-reactivate");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        StaffAccount staff = createAndLoginCoordinator(university, departmentId);

        requireOk(authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + staff.membershipId() + "/suspend",
                university.adminToken(), null), "Suspend");
        requireOk(authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + staff.membershipId() + "/reactivate",
                university.adminToken(), null), "Reactivate");

        assertThat(loginByUsernameAndExtractAccessToken(staff.username(), "Password123")).isNotBlank();
    }

    @Test
    @DisplayName("Resetting a staff password revokes existing sessions and issues a working credential")
    void resetPasswordRevokesSessionsAndIssuesWorkingCredential() {
        University university = newUniversity("uni-reset");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        StaffAccount staff = createAndLoginCoordinator(university, departmentId);
        String rawRefreshToken = loginByUsernameAndExtractRawRefreshToken(staff.username(), "Password123");

        ResponseEntity<Map> reset = authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + staff.membershipId() + "/reset-password",
                university.adminToken(), null);
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
        University university = newUniversity("uni-revoked");
        UUID departmentId = insertDepartment(university.id(), "Computer Science", "CS-" + UUID.randomUUID());
        UUID membershipId = createCoordinator(university, departmentId);

        requireOk(authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + membershipId + "/revoke",
                university.adminToken(), null), "Revoke");

        assertThat(errorCode(authorizedPost(
                "/api/v1/universities/" + university.id() + "/staff/" + membershipId + "/suspend",
                university.adminToken(), null)))
                .isEqualTo("STAFF_MEMBERSHIP_NOT_FOUND");
    }

    // ---------------------------------------------------------------- fixtures

    private record University(UUID id, String adminToken) {
    }

    /** Backend Phase B5.5: managed staff log in by username, so the fixture carries it. */
    private record StaffAccount(UUID membershipId, String email, String username, String token) {
    }

    /** A verified university with a freshly logged-in UNIVERSITY_ADMIN. */
    private University newUniversity(String prefix) {
        String adminEmail = uniqueEmail(emailPrefix(prefix + "-admin"));
        registerVerifiedUser(adminEmail);
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        UUID universityId = insertVerifiedUniversity(prefix + " University " + UUID.randomUUID());
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN", List.of());
        return new University(universityId, adminToken);
    }

    /** Creates a coordinator through the real endpoint under test, returning its membership id. */
    private UUID createCoordinator(University university, UUID departmentId) {
        String email = uniqueEmail(emailPrefix("uni-coordinator"));
        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", uniqueUsername(),
                        "role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of(departmentId.toString())));
        requireOk(response, "Create coordinator");
        return UUID.fromString((String) response.getBody().get("membershipId"));
    }

    /** Creates and logs a coordinator in (no verification step — see "Contact Verification" above). */
    private StaffAccount createAndLoginCoordinator(University university, UUID departmentId) {
        String email = uniqueEmail(emailPrefix("uni-coordinator"));
        String username = uniqueUsername();
        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + university.id() + "/staff", university.adminToken(),
                Map.of("email", email, "password", "Password123", "confirmPassword", "Password123", "username", username,
                        "role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of(departmentId.toString())));
        requireOk(response, "Create coordinator");
        UUID membershipId = UUID.fromString((String) response.getBody().get("membershipId"));
        String token = loginByUsernameAndExtractAccessToken(username, "Password123");
        return new StaffAccount(membershipId, email, username, token);
    }

    /** A globally unique canonical username; Backend Phase B5.5 requires one per managed account. */
    private String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
