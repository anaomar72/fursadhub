package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B5.6 — Super-Admin provisioning of managed verification officers.
 *
 * <p>Two properties carry the weight here, and both are about who may be TOUCHED rather than who may
 * call:
 *
 * <ol>
 *   <li><strong>Super Admin is never a target.</strong> Assigning a username switches an account from
 *       email login to username login, so doing it to the platform's root account would silently
 *       change how the recovery identity authenticates. The refusal must hold even when that account
 *       ALSO holds {@code VERIFICATION_OFFICER} — the dual-role case, which a naive "is this an
 *       officer" check would wave straight through.
 *   <li><strong>{@code SUPER_ADMIN} is not provisionable.</strong> The request has no role field at
 *       all, so the test worth writing is that submitting one changes nothing.
 * </ol>
 */
@SuppressWarnings("unchecked")
class PlatformVerificationOfficerIT extends AbstractPhase7IT {

    private static final AtomicInteger USERNAME_SEQUENCE = new AtomicInteger();
    private static final String OFFICERS = "/api/v1/admin/verification-officers";

    // ---------------------------------------------------------------- provisioning

    @Test
    @DisplayName("A provisioned officer signs in by username, and their email is not a credential")
    void aProvisionedOfficerSignsInByUsername() {
        Staff root = superAdmin("b56-root");
        String username = uniqueUsername();
        String email = uniqueEmail(emailPrefix("b56-officer"));

        ResponseEntity<Map> created = createOfficer(root.token(), "Amina Yusuf Cali", username, email);

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody().get("username")).isEqualTo(username);
        assertThat(created.getBody().get("displayName")).isEqualTo("Amina Yusuf Cali");
        assertThat(created.getBody().get("role")).isEqualTo("VERIFICATION_OFFICER");
        assertThat(created.getBody().get("status")).isEqualTo("ACTIVE");

        assertThat(loginByUsername(username, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
        // The address is contact information, not a credential — and the refusal reveals nothing.
        assertThat(login(email, "Password123").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /**
     * The account is usable the moment it is created: no verification email, no pending state. This
     * is the CLAUDE.md section 26A managed-staff exception applied to platform staff — the Super
     * Admin typed the address and is vouching for it.
     */
    @Test
    @DisplayName("A provisioned officer is ACTIVE immediately, with no contact-verification step")
    void aProvisionedOfficerIsActiveImmediately() {
        Staff root = superAdmin("b56-active");
        String email = uniqueEmail(emailPrefix("b56-active-officer"));

        createOfficer(root.token(), "Xasan Cabdi", uniqueUsername(), email);

        assertThat(userStatus(userIdOf(email))).isEqualTo("ACTIVE");
    }

    /**
     * The response is the whole surface a provisioning client sees, so it is the place a credential
     * would leak from. The admin typed the password; returning it would add exposure without adding
     * information.
     */
    @Test
    @DisplayName("The provisioning response carries no password, hash or token")
    void theProvisioningResponseCarriesNoCredentialMaterial() {
        Staff root = superAdmin("b56-secret");

        Map<String, Object> body = createOfficer(
                root.token(), "Faduma Cali", uniqueUsername(), uniqueEmail(emailPrefix("b56-secret-officer")))
                .getBody();

        assertThat(body.keySet())
                .containsExactlyInAnyOrder("userId", "displayName", "username", "email", "role", "status");
        assertThat(body).doesNotContainKeys(
                "password", "confirmPassword", "temporaryPassword", "passwordHash", "accessToken");
    }

    @Test
    @DisplayName("The new officer gets reviewer authority only — not Super Admin authority")
    void theNewOfficerReceivesReviewerAuthorityOnly() {
        Staff root = superAdmin("b56-authority");
        String username = uniqueUsername();
        createOfficer(root.token(), "Nuur Maxamed", username, uniqueEmail(emailPrefix("b56-authority-officer")));
        String officerToken = loginByUsernameAndExtractAccessToken(username, "Password123");

        // Reviewer surface: reachable.
        assertThat(authorizedGetList("/api/v1/admin/verification-escalations", officerToken).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        // Super-Admin surfaces: refused. Provisioning is not self-replicating.
        assertThat(createOfficerRaw(officerToken, "Escalation", uniqueUsername(),
                uniqueEmail(emailPrefix("b56-escalation"))).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(grantPlatformRole(officerToken, root.userId(), "VERIFICATION_OFFICER").getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    /**
     * The request record has no {@code role} component, so an escalation attempt cannot even be
     * expressed. Jackson ignores the extra property and the server assigns VERIFICATION_OFFICER —
     * this proves the ignoring is what actually happens rather than what is assumed.
     */
    @Test
    @DisplayName("Submitting a SUPER_ADMIN role field does not provision a Super Admin")
    void aSubmittedRoleFieldIsNotHonoured() {
        Staff root = superAdmin("b56-escalate");
        String email = uniqueEmail(emailPrefix("b56-escalate-officer"));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("displayName", "Would Be Root");
        body.put("username", uniqueUsername());
        body.put("email", email);
        body.put("password", "Password123");
        body.put("confirmPassword", "Password123");
        body.put("role", "SUPER_ADMIN");

        ResponseEntity<Map> response = authorizedPost(OFFICERS, root.token(), body);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("role")).isEqualTo("VERIFICATION_OFFICER");
        assertThat(activeRoles(userIdOf(email))).containsExactly("VERIFICATION_OFFICER");
    }

    // ---------------------------------------------------------------- duplicate identity

    /**
     * The near-miss that matters: a duplicate email and a duplicate username arrive as the same
     * exception type from the same insert. An admin told "that username is taken" when the EMAIL
     * collided will change the username, retry, and fail again learning nothing.
     */
    @Test
    @DisplayName("A duplicate email is its own error, not a taken username")
    void aDuplicateEmailIsNotReportedAsATakenUsername() {
        Staff root = superAdmin("b56-dupe");
        String email = uniqueEmail(emailPrefix("b56-dupe-officer"));
        createOfficer(root.token(), "First Officer", uniqueUsername(), email);

        String rejectedUsername = uniqueUsername();
        ResponseEntity<Map> collision = createOfficerRaw(root.token(), "Second Officer", rejectedUsername, email);

        assertThat(collision.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(collision.getBody().get("code")).isEqualTo("PLATFORM_ACCOUNT_EMAIL_ALREADY_EXISTS");
        // The rejected attempt left nothing behind — in particular it did not burn its username,
        // which would otherwise be permanently unavailable to the person who eventually gets it.
        assertThat(countUsersWithUsername(rejectedUsername)).isZero();
        assertThat(countGrantsForEmail(email)).as("the existing account gained no second grant").isOne();
    }

    @Test
    @DisplayName("A duplicate username is reported as a taken username")
    void aDuplicateUsernameIsReportedAsSuch() {
        Staff root = superAdmin("b56-dupe-username");
        String username = uniqueUsername();
        createOfficer(root.token(), "First Officer", username, uniqueEmail(emailPrefix("b56-dupe-u1")));

        String rejectedEmail = uniqueEmail(emailPrefix("b56-dupe-u2"));
        ResponseEntity<Map> collision = createOfficerRaw(root.token(), "Second Officer", username, rejectedEmail);

        assertThat(collision.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(collision.getBody().get("code")).isEqualTo("USERNAME_ALREADY_EXISTS");
        // Nothing of the rejected attempt survives: no user, and no grant that would make one
        // privileged. The username still belongs to exactly its one legitimate owner.
        assertThat(countUsersWithEmail(rejectedEmail)).isZero();
        assertThat(countGrantsForEmail(rejectedEmail)).isZero();
        assertThat(countUsersWithUsername(username)).isOne();
    }

    /**
     * The database constraint, not the service pre-check, is the authority when two Super Admins
     * submit the same username at once. A losing race must be a controlled conflict — never a 500,
     * which is what a violation surfacing at COMMIT rather than at the flush would produce.
     */
    @Test
    @DisplayName("Concurrent provisioning of the same username yields exactly one officer")
    void concurrentProvisioningYieldsExactlyOneOfficer() throws Exception {
        Staff root = superAdmin("b56-race");
        String username = uniqueUsername();

        int attempts = 4;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<HttpStatus>> results = new ArrayList<>();
        for (int index = 0; index < attempts; index++) {
            String email = uniqueEmail(emailPrefix("b56-race-" + index));
            results.add(pool.submit(() -> {
                start.await();
                return (HttpStatus) createOfficerRaw(root.token(), "Racer", username, email).getStatusCode();
            }));
        }
        start.countDown();

        int created = 0;
        for (Future<HttpStatus> result : results) {
            HttpStatus status = result.get(30, TimeUnit.SECONDS);
            assertThat(status)
                    .as("a losing race must be a controlled conflict, never a 500")
                    .isIn(HttpStatus.CREATED, HttpStatus.CONFLICT);
            if (status == HttpStatus.CREATED) {
                created++;
            }
        }
        pool.shutdown();

        assertThat(created).isEqualTo(1);
        assertThat(countUsersWithUsername(username)).isOne();
        // And exactly one grant: a loser that rolled back its user but kept its grant would leave a
        // privileged row pointing at nothing.
        assertThat(countActiveGrantsForUsername(username)).isOne();
    }

    @Test
    @DisplayName("A mistyped password confirmation is refused before any account exists")
    void aMistypedConfirmationCreatesNothing() {
        Staff root = superAdmin("b56-confirm");
        String email = uniqueEmail(emailPrefix("b56-confirm-officer"));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("displayName", "Typo Victim");
        body.put("username", uniqueUsername());
        body.put("email", email);
        body.put("password", "Password123");
        body.put("confirmPassword", "Password124");

        ResponseEntity<Map> response = authorizedPost(OFFICERS, root.token(), body);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("PLATFORM_ACCOUNT_PASSWORD_CONFIRMATION_MISMATCH");
        assertThat(countUsersWithEmail(email)).isZero();
    }

    /**
     * Provisioning writes a user, a username and a role grant. A rejected request must leave none of
     * them — a privileged account with no working credential, or a credential with no grant, would be
     * invisible until someone tried to use it.
     */
    @Test
    @DisplayName("A failed provisioning leaves no half-created account behind")
    void aFailedProvisioningLeavesNoOrphan() {
        Staff root = superAdmin("b56-atomic");
        String takenUsername = uniqueUsername();
        createOfficer(root.token(), "Incumbent", takenUsername, uniqueEmail(emailPrefix("b56-atomic-first")));

        String orphanEmail = uniqueEmail(emailPrefix("b56-atomic-orphan"));
        assertThat(createOfficerRaw(root.token(), "Orphan", takenUsername, orphanEmail).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        assertThat(countUsersWithEmail(orphanEmail)).isZero();
        assertThat(countGrantsForEmail(orphanEmail)).isZero();
        // A rolled-back transaction must not poison the connection for the next request: the same
        // Super Admin provisions successfully straight afterwards.
        String recoveredEmail = uniqueEmail(emailPrefix("b56-atomic-recovered"));
        assertThat(createOfficerRaw(root.token(), "Recovered", uniqueUsername(), recoveredEmail).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);
        assertThat(countGrantsForEmail(recoveredEmail)).isOne();
    }

    // ---------------------------------------------------------------- root protection

    /**
     * Backend Phase B5.6 section 12. A Super Admin holding ONLY that role is refused, and — the part
     * that matters — their email still authenticates afterwards, which is the damage the refusal
     * exists to prevent.
     */
    @Test
    @DisplayName("A Super Admin cannot be given a username, and their email login still works")
    void aSuperAdminCannotBeGivenAUsername() {
        Staff root = superAdmin("b56-protect-root");
        Staff otherRoot = superAdmin("b56-protect-target");

        ResponseEntity<Map> refused = assignUsername(root.token(), otherRoot.userId(), uniqueUsername());

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(refused.getBody().get("code")).isEqualTo("PLATFORM_ROOT_ACCOUNT_PROTECTED");
        assertThat(usernameOf(otherRoot.userId())).isNull();
        assertThat(login(otherRoot.email(), "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    /**
     * Backend Phase B5.6 section 1 — the dual-role case, and the reason the root check is separate
     * from the officer check rather than an {@code else} branch of it. This account genuinely IS a
     * verification officer; every mutation must still refuse it because it is ALSO root.
     */
    @Test
    @DisplayName("An account holding both roles is refused every managed-identity mutation")
    void aDualRoleSuperAdminIsRefusedEveryMutation() {
        Staff root = superAdmin("b56-dual-root");
        Staff dual = superAdmin("b56-dual-target");
        requireOk(grantPlatformRole(root.token(), dual.userId(), "VERIFICATION_OFFICER"), "Grant officer role");
        assertThat(activeRoles(dual.userId())).containsExactlyInAnyOrder("SUPER_ADMIN", "VERIFICATION_OFFICER");

        ResponseEntity<Map> username = assignUsername(root.token(), dual.userId(), uniqueUsername());
        assertThat(username.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(username.getBody().get("code")).isEqualTo("PLATFORM_ROOT_ACCOUNT_PROTECTED");

        ResponseEntity<Map> reset = resetCredentials(root.token(), dual.userId());
        assertThat(reset.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(reset.getBody().get("code")).isEqualTo("PLATFORM_ROOT_ACCOUNT_PROTECTED");

        // Nothing changed: the root account still authenticates exactly as it did.
        assertThat(usernameOf(dual.userId())).isNull();
        assertThat(login(dual.email(), "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("A Super Admin cannot reset their own credentials through the officer endpoint")
    void aSuperAdminCannotResetTheirOwnCredentialsHere() {
        Staff root = superAdmin("b56-self");

        ResponseEntity<Map> refused = resetCredentials(root.token(), root.userId());

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(refused.getBody().get("code")).isEqualTo("PLATFORM_ROOT_ACCOUNT_PROTECTED");
        assertThat(login(root.email(), "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("An ordinary user who is not an officer cannot be managed here")
    void aNonOfficerIsNotAManagedTarget() {
        Staff root = superAdmin("b56-outsider-root");
        String outsiderEmail = uniqueEmail(emailPrefix("b56-outsider"));
        registerVerifiedUser(outsiderEmail);

        ResponseEntity<Map> refused = assignUsername(root.token(), userIdOf(outsiderEmail), uniqueUsername());

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(refused.getBody().get("code")).isEqualTo("PLATFORM_ACCOUNT_NOT_MANAGED");
    }

    // ---------------------------------------------------------------- username assignment

    /**
     * The migration path for officers granted the role before Backend Phase B5.6. Assignment is
     * one-way and once: after it, the email is no longer a credential.
     */
    @Test
    @DisplayName("A legacy officer can be given a username once, and it cannot then be changed")
    void aLegacyOfficerReceivesAUsernameOnce() {
        Staff root = superAdmin("b56-legacy-root");
        Staff legacy = verificationOfficer("b56-legacy");
        assertThat(usernameOf(legacy.userId())).isNull();
        assertThat(login(legacy.email(), "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);

        String username = uniqueUsername();
        ResponseEntity<Map> assigned = assignUsername(root.token(), legacy.userId(), username);
        assertThat(assigned.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(assigned.getBody().get("username")).isEqualTo(username);

        assertThat(loginByUsername(username, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(login(legacy.email(), "Password123").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // Re-sending the same value is idempotent; a different one is refused.
        assertThat(assignUsername(root.token(), legacy.userId(), username.toUpperCase(Locale.ROOT)).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        ResponseEntity<Map> changed = assignUsername(root.token(), legacy.userId(), uniqueUsername());
        assertThat(changed.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(changed.getBody().get("code")).isEqualTo("USERNAME_IMMUTABLE");
    }

    @Test
    @DisplayName("A username already taken by anyone is refused for an officer")
    void anAlreadyTakenUsernameIsRefused() {
        Staff root = superAdmin("b56-taken-root");
        String taken = uniqueUsername();
        createOfficer(root.token(), "Incumbent", taken, uniqueEmail(emailPrefix("b56-taken-first")));
        Staff legacy = verificationOfficer("b56-taken-legacy");

        ResponseEntity<Map> refused = assignUsername(root.token(), legacy.userId(), taken);

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(refused.getBody().get("code")).isEqualTo("USERNAME_ALREADY_EXISTS");
        assertThat(usernameOf(legacy.userId())).isNull();
    }

    // ---------------------------------------------------------------- display name

    /**
     * The legacy migration path: an officer granted the role before Backend Phase B5.6 has no name at
     * all, and would otherwise show in the console as a bare email address permanently. Nothing is
     * derived automatically — a Super Admin types it.
     */
    @Test
    @DisplayName("A Super Admin sets a name on a legacy officer who has none")
    void aLegacyOfficerCanBeGivenAName() {
        Staff root = superAdmin("b56-name-root");
        Staff legacy = verificationOfficer("b56-name-legacy");
        assertThat(displayNameOf(legacy.userId())).isNull();

        ResponseEntity<Map> named = changeDisplayName(root.token(), legacy.userId(), "Ahmed Hassan");

        assertThat(named.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(named.getBody().get("displayName")).isEqualTo("Ahmed Hassan");
        assertThat(displayNameOf(legacy.userId())).isEqualTo("Ahmed Hassan");
        // Setting a name is not a migration: it changes nothing about how they sign in.
        assertThat(usernameOf(legacy.userId())).isNull();
        assertThat(login(legacy.email(), "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("A name typed wrongly at creation can be corrected")
    void anExistingNameCanBeReplaced() {
        Staff root = superAdmin("b56-name-replace-root");
        String email = uniqueEmail(emailPrefix("b56-name-replace"));
        createOfficer(root.token(), "Ahmed Hasan", uniqueUsername(), email);
        UUID officerId = userIdOf(email);

        assertThat(changeDisplayName(root.token(), officerId, "Ahmed Hassan").getStatusCode())
                .isEqualTo(HttpStatus.OK);

        assertThat(displayNameOf(officerId)).isEqualTo("Ahmed Hassan");
    }

    /**
     * Normalization is {@code DisplayNamePolicy}, unchanged from Backend Phase B5: Unicode-friendly,
     * internal whitespace collapsed. Somali and Arabic names are ordinary input, not edge cases.
     */
    @Test
    @DisplayName("Names are normalized, and non-ASCII names are ordinary input")
    void namesAreNormalized() {
        Staff root = superAdmin("b56-name-normal-root");
        Staff officer = verificationOfficer("b56-name-normal");

        changeDisplayName(root.token(), officer.userId(), "  Cabdi-Raxmaan   Cali  ");
        assertThat(displayNameOf(officer.userId())).isEqualTo("Cabdi-Raxmaan Cali");

        changeDisplayName(root.token(), officer.userId(), "أحمد حسن");
        assertThat(displayNameOf(officer.userId())).isEqualTo("أحمد حسن");
    }

    /**
     * Every way of sending no name is the same 400. Unlike the institution command (Backend Phase
     * B5), {@code {}} does NOT mean "clear" here — there is no clear operation, so an omitted
     * property is simply a malformed command.
     */
    @Test
    @DisplayName("Every no-name payload is rejected, and the existing name survives")
    void everyEmptyNamePayloadIsRejected() {
        Staff root = superAdmin("b56-name-empty-root");
        Staff officer = verificationOfficer("b56-name-empty");
        changeDisplayName(root.token(), officer.userId(), "Faduma Cali");

        String path = OFFICERS + "/" + officer.userId() + "/display-name";
        // Hand-written JSON so absent, explicit null and blank are all expressible on the wire.
        for (String payload : List.of(
                "{}",
                "{\"displayName\":null}",
                "{\"displayName\":\"\"}",
                "{\"displayName\":\"   \"}",
                "{\"displayName\":\"\\t\\n\"}",
                // Non-breaking spaces only: passes @NotBlank, caught by DisplayNamePolicy.
                "{\"displayName\":\"\\u00a0\\u00a0\"}")) {
            ResponseEntity<Map> response = postJson(path, root.token(), payload);
            assertThat(response.getStatusCode()).as("payload %s", payload).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("code")).as("payload %s", payload).isEqualTo("VALIDATION_FAILED");
        }

        // A missing body entirely.
        assertThat(authorizedPost(path, root.token(), null).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(displayNameOf(officer.userId())).as("nothing was erased").isEqualTo("Faduma Cali");
    }

    @Test
    @DisplayName("Only a Super Admin can change an officer's name")
    void onlySuperAdminsCanChangeAName() {
        Staff root = superAdmin("b56-name-auth-root");
        String victimEmail = uniqueEmail(emailPrefix("b56-name-auth-victim"));
        createOfficer(root.token(), "Original Name", uniqueUsername(), victimEmail);
        UUID victimId = userIdOf(victimEmail);

        // Another verification officer — reviewer authority is not provisioning authority.
        String peerUsername = uniqueUsername();
        createOfficer(root.token(), "Peer Officer", peerUsername, uniqueEmail(emailPrefix("b56-name-auth-peer")));
        String peerToken = loginByUsernameAndExtractAccessToken(peerUsername, "Password123");
        assertThat(changeDisplayName(peerToken, victimId, "Renamed By Peer").getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        // A tenant admin — being an ORGANIZATION_ADMIN carries no platform authority whatsoever.
        String tenantToken = registerVerifiedAndLogin(emailPrefix("b56-name-auth-tenant"));
        createOrganization(tenantToken, "B5.6 Tenant Company");
        assertThat(changeDisplayName(tenantToken, victimId, "Renamed By Tenant").getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        // Anonymous.
        assertThat(unauthenticatedPost(
                OFFICERS + "/" + victimId + "/display-name", Map.of("displayName", "Renamed By Nobody"))
                .getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(displayNameOf(victimId)).isEqualTo("Original Name");
    }

    /**
     * The third B5.6 mutation joins the root protection. A dual-role account is refused here for the
     * same reason as the other two: it is ALSO super admin, and the officer grant does not earn it an
     * exemption.
     */
    @Test
    @DisplayName("A dual-role root account's name cannot be changed here")
    void aDualRoleRootNameIsProtected() {
        Staff root = superAdmin("b56-name-dual-root");
        Staff dual = superAdmin("b56-name-dual-target");
        requireOk(grantPlatformRole(root.token(), dual.userId(), "VERIFICATION_OFFICER"), "Grant officer role");
        String before = displayNameOf(dual.userId());

        ResponseEntity<Map> refused = changeDisplayName(root.token(), dual.userId(), "Renamed Root");

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(refused.getBody().get("code")).isEqualTo("PLATFORM_ROOT_ACCOUNT_PROTECTED");
        assertThat(displayNameOf(dual.userId())).isEqualTo(before);
    }

    /**
     * Root protection is checked before the payload, so a protected account answers identically
     * whether the name sent was valid or not — the response cannot be used to probe it.
     */
    @Test
    @DisplayName("A protected account answers the same whether the name sent was valid")
    void rootProtectionPrecedesPayloadValidation() {
        Staff root = superAdmin("b56-name-order-root");
        Staff otherRoot = superAdmin("b56-name-order-target");

        ResponseEntity<Map> withBlankName = postJson(
                OFFICERS + "/" + otherRoot.userId() + "/display-name", root.token(),
                "{\"displayName\":\"\\u00a0\"}");

        assertThat(withBlankName.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(withBlankName.getBody().get("code")).isEqualTo("PLATFORM_ROOT_ACCOUNT_PROTECTED");
    }

    @Test
    @DisplayName("A non-officer account's name cannot be changed here")
    void aNonOfficerNameCannotBeChanged() {
        Staff root = superAdmin("b56-name-outsider-root");
        String outsiderEmail = uniqueEmail(emailPrefix("b56-name-outsider"));
        registerVerifiedUser(outsiderEmail);

        ResponseEntity<Map> refused = changeDisplayName(root.token(), userIdOf(outsiderEmail), "Not An Officer");

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(refused.getBody().get("code")).isEqualTo("PLATFORM_ACCOUNT_NOT_MANAGED");
    }

    // ---------------------------------------------------------------- credential reset

    @Test
    @DisplayName("A reset issues a working temporary password and revokes every existing session")
    void aResetIssuesAWorkingPasswordAndRevokesSessions() {
        Staff root = superAdmin("b56-reset-root");
        String username = uniqueUsername();
        String email = uniqueEmail(emailPrefix("b56-reset-officer"));
        createOfficer(root.token(), "Reset Me", username, email);
        UUID officerId = userIdOf(email);
        loginByUsernameAndExtractAccessToken(username, "Password123");
        assertThat(countActiveRefreshTokens(officerId)).isPositive();

        ResponseEntity<Map> reset = resetCredentials(root.token(), officerId);

        assertThat(reset.getStatusCode()).isEqualTo(HttpStatus.OK);
        // Checked BEFORE this test signs in again, or it would be counting the session it just made.
        // Without this half, a reset would lock nobody out for another thirty days.
        assertThat(countActiveRefreshTokens(officerId)).isZero();

        Map<String, Object> credential = reset.getBody();
        // Deliberately NOT TemporaryCredentialResponse: a platform officer has no membership.
        assertThat(credential.keySet())
                .containsExactlyInAnyOrder("userId", "username", "email", "temporaryPassword");
        assertThat(credential.get("username")).isEqualTo(username);

        String temporary = (String) credential.get("temporaryPassword");
        assertThat(temporary).isNotBlank();
        assertThat(loginByUsername(username, temporary).getStatusCode()).isEqualTo(HttpStatus.OK);
        // The old password is genuinely dead.
        assertThat(loginByUsername(username, "Password123").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /** CLAUDE.md section 68: the plaintext exists in exactly one response and nowhere else. */
    @Test
    @DisplayName("The temporary password is never written to the audit trail")
    void theTemporaryPasswordIsNeverAudited() {
        Staff root = superAdmin("b56-audit-root");
        String email = uniqueEmail(emailPrefix("b56-audit-officer"));
        createOfficer(root.token(), "Audited", uniqueUsername(), email);
        UUID officerId = userIdOf(email);

        String temporary = (String) resetCredentials(root.token(), officerId).getBody().get("temporaryPassword");

        Integer leaked = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_events WHERE metadata LIKE ?", Integer.class, "%" + temporary + "%");
        assertThat(leaked).isZero();
        assertThat(auditMetadataFor("PLATFORM_ACCOUNT_CREDENTIAL_RESET")).contains(officerId.toString());
    }

    @Test
    @DisplayName("An officer still on email login is told to assign a username first")
    void anEmailLoginOfficerCannotBeReset() {
        Staff root = superAdmin("b56-noreset-root");
        Staff legacy = verificationOfficer("b56-noreset");

        ResponseEntity<Map> refused = resetCredentials(root.token(), legacy.userId());

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(refused.getBody().get("code")).isEqualTo("PLATFORM_ACCOUNT_NOT_USERNAME_MANAGED");
    }

    @Test
    @DisplayName("One verification officer cannot reset another's credentials")
    void anOfficerCannotResetAnotherOfficer() {
        Staff root = superAdmin("b56-peer-root");
        String victimEmail = uniqueEmail(emailPrefix("b56-peer-victim"));
        createOfficer(root.token(), "Victim", uniqueUsername(), victimEmail);
        String attackerUsername = uniqueUsername();
        createOfficer(root.token(), "Attacker", attackerUsername, uniqueEmail(emailPrefix("b56-peer-attacker")));
        String attackerToken = loginByUsernameAndExtractAccessToken(attackerUsername, "Password123");

        assertThat(resetCredentials(attackerToken, userIdOf(victimEmail)).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(assignUsername(attackerToken, userIdOf(victimEmail), uniqueUsername()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- listing

    @Test
    @DisplayName("The officer list shows managed officers and excludes Super Admins")
    void theOfficerListExcludesSuperAdmins() {
        Staff root = superAdmin("b56-list-root");
        Staff dual = superAdmin("b56-list-dual");
        requireOk(grantPlatformRole(root.token(), dual.userId(), "VERIFICATION_OFFICER"), "Grant officer role");
        String email = uniqueEmail(emailPrefix("b56-list-officer"));
        createOfficer(root.token(), "Listed Officer", uniqueUsername(), email);

        List<Map<String, Object>> officers = authorizedGetList(OFFICERS, root.token()).getBody();

        List<Object> userIds = officers.stream().map(officer -> officer.get("userId")).toList();
        assertThat(userIds).contains(userIdOf(email).toString());
        assertThat(userIds).doesNotContain(root.userId().toString(), dual.userId().toString());
        assertThat(officers).allSatisfy(officer ->
                assertThat(officer).doesNotContainKeys("password", "passwordHash", "temporaryPassword"));
    }

    @Test
    @DisplayName("An unauthenticated caller reaches none of the officer endpoints")
    void unauthenticatedCallersAreRejected() {
        assertThat(unauthenticatedGet(OFFICERS).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ---------------------------------------------------------------- helpers

    private ResponseEntity<Map> createOfficer(String token, String displayName, String username, String email) {
        ResponseEntity<Map> response = createOfficerRaw(token, displayName, username, email);
        requireOk(response, "Create verification officer");
        return response;
    }

    private ResponseEntity<Map> createOfficerRaw(String token, String displayName, String username, String email) {
        return authorizedPost(OFFICERS, token, Map.of(
                "displayName", displayName,
                "username", username,
                "email", email,
                "password", "Password123",
                "confirmPassword", "Password123"));
    }

    private ResponseEntity<Map> assignUsername(String token, UUID userId, String username) {
        return authorizedPost(OFFICERS + "/" + userId + "/username", token, Map.of("username", username));
    }

    private ResponseEntity<Map> resetCredentials(String token, UUID userId) {
        return authorizedPost(OFFICERS + "/" + userId + "/reset-password", token, Map.of());
    }

    private ResponseEntity<Map> changeDisplayName(String token, UUID userId, String displayName) {
        return authorizedPost(
                OFFICERS + "/" + userId + "/display-name", token, Map.of("displayName", displayName));
    }

    /** Hand-written JSON so absent, explicit null and blank names are all expressible on the wire. */
    private ResponseEntity<Map> postJson(String path, String token, String json) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), HttpMethod.POST, new HttpEntity<>(json, headers), Map.class);
    }

    private String usernameOf(UUID userId) {
        return jdbcTemplate.queryForObject("SELECT username FROM users WHERE id = ?", String.class, userId);
    }

    private String displayNameOf(UUID userId) {
        return jdbcTemplate.queryForObject("SELECT display_name FROM users WHERE id = ?", String.class, userId);
    }

    private int countUsersWithUsername(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM users WHERE username = ?", Integer.class, username);
        return count == null ? 0 : count;
    }

    /** Active platform grants belonging to the account with this email — zero if no such account. */
    private int countGrantsForEmail(String email) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_admins p JOIN users u ON u.id = p.user_id"
                        + " WHERE u.email = ? AND p.revoked_at IS NULL",
                Integer.class, email.toLowerCase(Locale.ROOT));
        return count == null ? 0 : count;
    }

    private int countActiveGrantsForUsername(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_admins p JOIN users u ON u.id = p.user_id"
                        + " WHERE u.username = ? AND p.revoked_at IS NULL",
                Integer.class, username);
        return count == null ? 0 : count;
    }

    private int countUsersWithEmail(String email) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM users WHERE email = ?", Integer.class, email.toLowerCase(Locale.ROOT));
        return count == null ? 0 : count;
    }

    private List<String> activeRoles(UUID userId) {
        return jdbcTemplate.queryForList(
                "SELECT role FROM platform_admins WHERE user_id = ? AND revoked_at IS NULL", String.class, userId);
    }

    private String auditMetadataFor(String eventType) {
        return jdbcTemplate.queryForObject(
                "SELECT metadata FROM audit_events WHERE event_type = ? ORDER BY occurred_at DESC LIMIT 1",
                String.class, eventType);
    }

    /** Canonical form only — {@link com.fursadhub.identity.domain.UsernamePolicy} rejects anything else. */
    private String uniqueUsername() {
        return "b56officer" + USERNAME_SEQUENCE.incrementAndGet() + "x"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
