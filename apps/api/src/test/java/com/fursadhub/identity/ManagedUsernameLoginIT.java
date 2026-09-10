package com.fursadhub.identity;

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
 * Backend Phase B5.5 — username authentication for institution-managed staff.
 *
 * <p>The properties worth protecting are the transition ones. A managed account with a username
 * authenticates ONLY by username; its email stops working as a credential, and does so silently, so
 * the response never reveals that the address belongs to a managed account. Self-service accounts
 * and legacy managed accounts are untouched.
 */
@SuppressWarnings("unchecked")
class ManagedUsernameLoginIT extends AbstractPhase3IT {

    // ---------------------------------------------------------------- new managed staff

    @Test
    @DisplayName("A new organization recruiter logs in by username, and their email no longer works")
    void organizationStaffLogInByUsernameAndNotByEmail() {
        Fixture fixture = organizationWithAdmin("b55-org");
        String email = uniqueEmail("b55-recruiter");
        String username = uniqueUsername();
        createOrganizationStaff(fixture, email, username, "RECRUITER");

        assertThat(loginWithUsername(username, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> byEmail = loginWithEmail(email, "Password123");
        assertThat(byEmail.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        // Generic: the response must not disclose that this address is a username-enabled account.
        assertThat(byEmail.getBody().get("code")).isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    @DisplayName("A new university coordinator logs in by username, and their email no longer works")
    void universityStaffLogInByUsernameAndNotByEmail() {
        UniversityFixture fixture = universityWithAdmin("b55-uni");
        String email = uniqueEmail("b55-coordinator");
        String username = uniqueUsername();
        createUniversityStaff(fixture, email, username, "DEPARTMENT_COORDINATOR");

        assertThat(loginWithUsername(username, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginWithEmail(email, "Password123").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /** Authentication identity changed; authorization did not. The subject is still the user id. */
    @Test
    @DisplayName("Username login yields the same immutable user id and the same role")
    void usernameLoginPreservesIdentityAndAuthorization() {
        Fixture fixture = organizationWithAdmin("b55-jwt");
        String email = uniqueEmail("b55-jwt-recruiter");
        String username = uniqueUsername();
        String membershipId = createOrganizationStaff(fixture, email, username, "RECRUITER");

        String token = tokenFrom(loginWithUsername(username, "Password123"));
        Map<String, Object> me = authorizedGet("/api/v1/me", token).getBody();

        assertThat(me.get("id")).isEqualTo(userIdOf(email).toString());
        assertThat(me.get("email")).isEqualTo(email);
        assertThat(memberById(fixture, membershipId).get("role")).isEqualTo("RECRUITER");
    }

    @Test
    @DisplayName("Usernames are case-insensitive at login")
    void usernameLoginIsCaseInsensitive() {
        Fixture fixture = organizationWithAdmin("b55-case");
        String username = uniqueUsername();
        createOrganizationStaff(fixture, uniqueEmail("b55-case-staff"), username, "RECRUITER");

        assertThat(loginWithUsername(username.toUpperCase(java.util.Locale.ROOT), "Password123").getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- self-service unchanged

    @Test
    @DisplayName("Self-service accounts keep logging in by email, exactly as before")
    void selfServiceEmailLoginIsUnchanged() {
        String email = uniqueEmail("b55-self-service");
        register(email, "Password123");

        assertThat(loginWithEmail(email, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
        // And a self-service account has no username to log in with.
        assertThat(loginWithUsername("nosuchusername", "Password123").getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("An organization founder admin keeps email login")
    void founderAdminEmailLoginIsUnchanged() {
        Fixture fixture = organizationWithAdmin("b55-founder");

        assertThat(loginWithEmail(fixture.adminEmail(), "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- legacy transition

    /**
     * The migration path end to end: a managed account provisioned before B5.5 has no username, logs
     * in by email, and keeps doing so until its tenant admin assigns one — at which point it moves to
     * username authentication permanently.
     */
    @Test
    @DisplayName("A legacy managed account transitions from email to username login")
    void legacyManagedAccountTransitions() {
        Fixture fixture = organizationWithAdmin("b55-legacy");
        String email = uniqueEmail("b55-legacy-staff");
        String membershipId = createOrganizationStaff(fixture, email, uniqueUsername(), "RECRUITER");

        // Return the account to its pre-B5.5 shape: a managed account with no username.
        jdbcTemplate.update("UPDATE users SET username = NULL WHERE email = ?", email);

        assertThat(loginWithEmail(email, "Password123").getStatusCode())
                .as("a legacy managed account must not be locked out")
                .isEqualTo(HttpStatus.OK);

        String username = uniqueUsername();
        ResponseEntity<Map> assigned = assignUsername(fixture, membershipId, username);
        assertThat(assigned.getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(loginWithUsername(username, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginWithEmail(email, "Password123").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // The membership was not disturbed by a credential change.
        assertThat(memberById(fixture, membershipId).get("role")).isEqualTo("RECRUITER");
    }

    @Test
    @DisplayName("A username cannot be renamed once assigned")
    void usernameIsImmutable() {
        Fixture fixture = organizationWithAdmin("b55-immutable");
        String username = uniqueUsername();
        String membershipId = createOrganizationStaff(fixture, uniqueEmail("b55-immutable-staff"), username, "RECRUITER");

        // Re-sending the same username is an idempotent no-op.
        assertThat(assignUsername(fixture, membershipId, username).getStatusCode()).isEqualTo(HttpStatus.OK);
        // A different one is refused.
        ResponseEntity<Map> renamed = assignUsername(fixture, membershipId, uniqueUsername());
        assertThat(renamed.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(renamed.getBody().get("code")).isEqualTo("USERNAME_IMMUTABLE");

        assertThat(loginWithUsername(username, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- uniqueness

    @Test
    @DisplayName("A duplicate username is refused, including a case variant and across tenants")
    void duplicateUsernamesAreRefused() {
        Fixture organizationA = organizationWithAdmin("b55-dup-a");
        Fixture organizationB = organizationWithAdmin("b55-dup-b");
        String username = uniqueUsername();
        createOrganizationStaff(organizationA, uniqueEmail("b55-dup-first"), username, "RECRUITER");

        ResponseEntity<Map> sameTenant = createOrganizationStaffRaw(
                organizationA, uniqueEmail("b55-dup-second"), username, "RECRUITER");
        assertThat(sameTenant.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(sameTenant.getBody().get("code")).isEqualTo("USERNAME_ALREADY_EXISTS");

        // A different institution cannot take it either — uniqueness is global, because login
        // happens before any tenant is known.
        ResponseEntity<Map> crossTenant = createOrganizationStaffRaw(
                organizationB, uniqueEmail("b55-dup-cross"), username.toUpperCase(java.util.Locale.ROOT), "RECRUITER");
        assertThat(crossTenant.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(crossTenant.getBody().get("code")).isEqualTo("USERNAME_ALREADY_EXISTS");
    }

    /** The database constraint is the authority when two admins submit the same username at once. */
    @Test
    @DisplayName("Concurrent creation of the same username yields exactly one account")
    void concurrentDuplicateCreationYieldsOneAccount() throws Exception {
        Fixture fixture = organizationWithAdmin("b55-race");
        String username = uniqueUsername();

        int attempts = 4;
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(attempts);
        java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);
        List<java.util.concurrent.Future<HttpStatus>> results = new java.util.ArrayList<>();
        for (int index = 0; index < attempts; index++) {
            String email = uniqueEmail("b55-race-" + index);
            results.add(pool.submit(() -> {
                start.await();
                return (HttpStatus) createOrganizationStaffRaw(fixture, email, username, "RECRUITER").getStatusCode();
            }));
        }
        start.countDown();

        int created = 0;
        for (java.util.concurrent.Future<HttpStatus> result : results) {
            HttpStatus status = result.get(30, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(status)
                    .as("a losing race must be a controlled conflict, never a 500")
                    .isIn(HttpStatus.CREATED, HttpStatus.CONFLICT);
            if (status == HttpStatus.CREATED) {
                created++;
            }
        }
        pool.shutdown();

        assertThat(created).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username)).isEqualTo(1);
    }


    /**
     * The legacy-assignment race, which is a different code path from creation: two accounts that
     * ALREADY exist with a null username concurrently claim the same canonical value.
     *
     * <p>Creation could in principle be decided by the service's existence pre-check; this cannot,
     * because both callers read null before either writes. The database UNIQUE constraint is what
     * settles it, and the flush inside the service is what turns the loser into a controlled
     * {@code USERNAME_ALREADY_EXISTS} rather than a commit-time failure that would escape the
     * translator as a 500.
     *
     * <p>Case variants are raced deliberately: {@code Ahmed} and {@code ahmed} are one identity.
     */
    @Test
    @DisplayName("Two legacy accounts racing for one username leave exactly one owner")
    void concurrentLegacyAssignmentLeavesOneOwner() throws Exception {
        Fixture fixture = organizationWithAdmin("b55-assign-race");
        String emailA = uniqueEmail("b55-race-a");
        String emailB = uniqueEmail("b55-race-b");
        String membershipA = createOrganizationStaff(fixture, emailA, uniqueUsername(), "RECRUITER");
        String membershipB = createOrganizationStaff(fixture, emailB, uniqueUsername(), "RECRUITER");

        // Return both to the pre-B5.5 shape: managed accounts with no username.
        jdbcTemplate.update("UPDATE users SET username = NULL WHERE email IN (?, ?)", emailA, emailB);

        String canonical = uniqueUsername();
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);

        // Same canonical identity, submitted in different cases.
        java.util.concurrent.Future<ResponseEntity<Map>> first = pool.submit(() -> {
            start.await();
            return assignUsername(fixture, membershipA, canonical);
        });
        java.util.concurrent.Future<ResponseEntity<Map>> second = pool.submit(() -> {
            start.await();
            return assignUsername(fixture, membershipB, canonical.toUpperCase(java.util.Locale.ROOT));
        });
        start.countDown();

        List<ResponseEntity<Map>> responses =
                List.of(first.get(30, java.util.concurrent.TimeUnit.SECONDS),
                        second.get(30, java.util.concurrent.TimeUnit.SECONDS));
        pool.shutdown();

        long succeeded = responses.stream().filter(r -> r.getStatusCode() == HttpStatus.OK).count();
        long conflicted = responses.stream().filter(r -> r.getStatusCode() == HttpStatus.CONFLICT).count();

        assertThat(succeeded).as("exactly one assignment may win").isEqualTo(1);
        assertThat(conflicted).as("the loser must get a controlled conflict, never a 500").isEqualTo(1);
        responses.stream()
                .filter(r -> r.getStatusCode() == HttpStatus.CONFLICT)
                .forEach(r -> assertThat(r.getBody().get("code")).isEqualTo("USERNAME_ALREADY_EXISTS"));

        // Exactly one row owns the canonical username, and the loser is still null.
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, canonical)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email IN (?, ?) AND username IS NULL", Integer.class,
                emailA, emailB)).isEqualTo(1);

        // Neither membership was disturbed by the credential attempt.
        assertThat(memberById(fixture, membershipA).get("role")).isEqualTo("RECRUITER");
        assertThat(memberById(fixture, membershipB).get("role")).isEqualTo("RECRUITER");
    }
    // ---------------------------------------------------------------- login contract boundary

    @Test
    @DisplayName("Exactly one identifier must be supplied")
    void loginRequiresExactlyOneIdentifier() {
        Fixture fixture = organizationWithAdmin("b55-contract");
        String username = uniqueUsername();
        String email = uniqueEmail("b55-contract-staff");
        createOrganizationStaff(fixture, email, username, "RECRUITER");

        // Both supplied — ambiguity is rejected, never resolved by precedence.
        assertThat(loginJson("{\"email\":\"" + email + "\",\"username\":\"" + username
                + "\",\"password\":\"Password123\"}").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // Neither supplied.
        assertThat(loginJson("{\"password\":\"Password123\"}").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // Explicit nulls.
        assertThat(loginJson("{\"email\":null,\"username\":null,\"password\":\"Password123\"}").getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // Blank identifiers.
        assertThat(loginJson("{\"username\":\"   \",\"password\":\"Password123\"}").getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // Empty object and missing body.
        assertThat(loginJson("{}").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(loginJson("").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // Password still required.
        assertThat(loginJson("{\"username\":\"" + username + "\"}").getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(loginJson("{\"username\":\"" + username + "\",\"password\":\"\"}").getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    /** A malformed username must not report a validation error — that would leak the syntax rules. */
    @Test
    @DisplayName("An unknown or malformed username is a generic credential failure")
    void unknownAndMalformedUsernamesAreGeneric() {
        for (String candidate : List.of("nosuchuser", "ahmed..hassan", "-nope", "ahmed@example.com")) {
            ResponseEntity<Map> response = loginWithUsername(candidate, "Password123");
            assertThat(response.getStatusCode()).as("%s", candidate).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(response.getBody().get("code")).isEqualTo("INVALID_CREDENTIALS");
        }
    }

    // ---------------------------------------------------------------- creation validation

    @Test
    @DisplayName("Managed staff cannot be created without an acceptable username")
    void creationRequiresAValidUsername() {
        Fixture fixture = organizationWithAdmin("b55-invalid");

        for (String invalid : List.of("ab", "-ahmed", "ahmed-", "ahmed..hassan", "ahmed hassan", "ahmed@x", "أحمد")) {
            ResponseEntity<Map> response =
                    createOrganizationStaffRaw(fixture, uniqueEmail("b55-inv"), invalid, "RECRUITER");
            assertThat(response.getStatusCode()).as("username %s must be rejected", invalid)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }

        // Omitted and blank are refused by request validation.
        Map<String, Object> withoutUsername = new LinkedHashMap<>();
        withoutUsername.put("email", uniqueEmail("b55-nousername"));
        withoutUsername.put("password", "Password123");
        withoutUsername.put("confirmPassword", "Password123");
        withoutUsername.put("role", "RECRUITER");
        assertThat(authorizedPost(membersPath(fixture), fixture.adminToken(), withoutUsername).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ---------------------------------------------------------------- credential reset

    @Test
    @DisplayName("A credential reset tells the admin the username to log in with")
    void credentialResetReturnsTheLoginIdentifier() {
        Fixture fixture = organizationWithAdmin("b55-reset");
        String username = uniqueUsername();
        String membershipId = createOrganizationStaff(fixture, uniqueEmail("b55-reset-staff"), username, "RECRUITER");

        Map<String, Object> credential = authorizedPost(
                membersPath(fixture) + "/" + membershipId + "/reset-password", fixture.adminToken(), Map.of()).getBody();

        assertThat(credential.get("username")).isEqualTo(username);
        assertThat(credential).containsKey("temporaryPassword");
        assertThat(credential).containsKey("email");

        // The new password works through the username path.
        assertThat(loginWithUsername(username, (String) credential.get("temporaryPassword")).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- write boundary

    @Test
    @DisplayName("A founder admin cannot be given a username, and tenants cannot cross")
    void usernameAssignmentRespectsTheManagedStaffBoundary() {
        Fixture organizationA = organizationWithAdmin("b55-boundary-a");
        Fixture organizationB = organizationWithAdmin("b55-boundary-b");
        String membershipB = createOrganizationStaff(
                organizationB, uniqueEmail("b55-boundary-staff"), uniqueUsername(), "RECRUITER");

        // The founder's own membership is not an assignable managed role.
        String adminMembership = memberByRole(organizationA, "ORGANIZATION_ADMIN");
        ResponseEntity<Map> founder = assignUsername(organizationA, adminMembership, uniqueUsername());
        assertThat(founder.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(founder.getBody().get("code")).isEqualTo("STAFF_ROLE_NOT_ASSIGNABLE");

        // Another tenant's membership is not reachable.
        assertThat(assignUsername(organizationA, membershipB, uniqueUsername()).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("The username assignment payload boundary rejects empty input")
    void usernameAssignmentRejectsEmptyInput() {
        Fixture fixture = organizationWithAdmin("b55-payload");
        String email = uniqueEmail("b55-payload-staff");
        String membershipId = createOrganizationStaff(fixture, email, uniqueUsername(), "RECRUITER");
        // Return it to the pre-B5.5 shape so an assignment is actually possible.
        jdbcTemplate.update("UPDATE users SET username = NULL WHERE email = ?", email);

        String path = membersPath(fixture) + "/" + membershipId + "/username";
        for (String body : List.of("{}", "{\"username\":null}", "{\"username\":\"\"}", "{\"username\":\"   \"}", "")) {
            assertThat(postJson(path, fixture.adminToken(), body).getStatusCode())
                    .as("body %s must be rejected", body)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        }

        // None of those attempts assigned anything — there is no clear operation, so an absent value
        // can never be mistaken for one.
        assertThat(jdbcTemplate.queryForObject(
                "SELECT username FROM users WHERE email = ?", String.class, email)).isNull();
        // And the account still logs in by email, exactly as a legacy managed account should.
        assertThat(loginWithEmail(email, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- helpers

    private record Fixture(UUID organizationId, String adminToken, String adminEmail) {
    }

    private record UniversityFixture(UUID universityId, UUID departmentId, String adminToken) {
    }

    private Fixture organizationWithAdmin(String prefix) {
        String adminEmail = uniqueEmail(prefix + "-admin");
        register(adminEmail, "Password123");
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B55 " + prefix));
        return new Fixture(organizationId, adminToken, adminEmail);
    }

    private UniversityFixture universityWithAdmin(String prefix) {
        UUID universityId = insertVerifiedUniversity(uniqueName("B55U " + prefix));
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS-" + UUID.randomUUID());
        String adminEmail = uniqueEmail(prefix);
        register(adminEmail, "Password123");
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN");
        return new UniversityFixture(universityId, departmentId, adminToken);
    }

    private String membersPath(Fixture fixture) {
        return "/api/v1/organizations/" + fixture.organizationId() + "/members";
    }

    private String createOrganizationStaff(Fixture fixture, String email, String username, String role) {
        ResponseEntity<Map> response = createOrganizationStaffRaw(fixture, email, username, role);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return (String) response.getBody().get("membershipId");
    }

    private ResponseEntity<Map> createOrganizationStaffRaw(Fixture fixture, String email, String username, String role) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("password", "Password123");
        body.put("confirmPassword", "Password123");
        body.put("username", username);
        body.put("role", role);
        return authorizedPost(membersPath(fixture), fixture.adminToken(), body);
    }

    private void createUniversityStaff(UniversityFixture fixture, String email, String username, String role) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("password", "Password123");
        body.put("confirmPassword", "Password123");
        body.put("username", username);
        body.put("role", role);
        body.put("departmentIds", List.of(fixture.departmentId().toString()));
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + fixture.universityId() + "/staff", fixture.adminToken(), body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private ResponseEntity<Map> assignUsername(Fixture fixture, String membershipId, String username) {
        return authorizedPost(membersPath(fixture) + "/" + membershipId + "/username", fixture.adminToken(),
                Map.of("username", username));
    }

    private Map<String, Object> memberById(Fixture fixture, String membershipId) {
        return members(fixture).stream()
                .filter(member -> membershipId.equals(member.get("membershipId")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("membership not found"));
    }

    private String memberByRole(Fixture fixture, String role) {
        return members(fixture).stream()
                .filter(member -> role.equals(member.get("role")))
                .map(member -> (String) member.get("membershipId"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no membership with role " + role));
    }

    private List<Map<String, Object>> members(Fixture fixture) {
        return restTemplate.exchange(url(membersPath(fixture)), HttpMethod.GET,
                new org.springframework.http.HttpEntity<>(bearer(fixture.adminToken())), List.class).getBody();
    }

    private ResponseEntity<Map> loginWithEmail(String email, String password) {
        return loginJson("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}");
    }

    private ResponseEntity<Map> loginWithUsername(String username, String password) {
        return loginJson("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}");
    }

    /** Hand-written JSON so absent, null and blank identifiers are all expressible on the wire. */
    private ResponseEntity<Map> loginJson(String json) {
        return restTemplate.exchange(url("/api/v1/auth/login"), HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(json, jsonHeaders()), Map.class);
    }

    private ResponseEntity<Map> postJson(String path, String token, String json) {
        return restTemplate.exchange(url(path), HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(json, bearer(token)), Map.class);
    }

    private String tokenFrom(ResponseEntity<Map> loginResponse) {
        return (String) loginResponse.getBody().get("accessToken");
    }

    private String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
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
