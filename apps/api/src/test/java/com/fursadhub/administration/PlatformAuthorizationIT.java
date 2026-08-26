package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The platform-role boundary (CLAUDE.md sections 23-24).
 *
 * <p>Proves the two things that make platform roles a real boundary rather than a label: an ordinary
 * user reaches nothing, and a grant is re-read from PostgreSQL on every request, so revoking one — or
 * suspending its holder — takes effect immediately rather than when their access token expires.
 */
class PlatformAuthorizationIT extends AbstractPhase7IT {

    @Test
    @DisplayName("An ordinary authenticated user cannot reach any admin endpoint")
    void ordinaryUserIsRefused() {
        String user = registerVerifiedAndLogin("plain-user");

        assertThat(authorizedGet("/api/v1/admin/statistics", user).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/users", user).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/audit-events", user).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/organizations", user).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/privacy-requests", user).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Unauthenticated callers cannot reach admin endpoints")
    void unauthenticatedIsRefused() {
        assertThat(unauthenticatedGet("/api/v1/admin/statistics").getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("/admin/me reports no roles for an ordinary user without refusing the call")
    void adminMeIsOpenButHonest() {
        String user = registerVerifiedAndLogin("probe-user");

        ResponseEntity<Map> response = authorizedGet("/api/v1/admin/me", user);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("platformAdmin")).isEqualTo(false);
        assertThat((java.util.List<?>) response.getBody().get("roles")).isEmpty();
    }

    @Test
    @DisplayName("A VERIFICATION_OFFICER may review institutions but not administer accounts")
    void verificationOfficerAuthorityIsNarrow() {
        Staff officer = verificationOfficer("vofficer");

        // Permitted: institution verification is the whole point of the role. The escalation queue
        // returns a JSON ARRAY, so it is read with the list helper — a Map extractor cannot decode it.
        assertThat(authorizedGet("/api/v1/admin/organizations", officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedGetList("/api/v1/admin/verification-escalations", officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        // Refused: everything that belongs to full platform authority.
        assertThat(authorizedGet("/api/v1/admin/users", officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/audit-events", officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/statistics", officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/platform-roles", officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("A verification officer cannot promote themselves")
    void officerCannotSelfPromote() {
        Staff officer = verificationOfficer("selfpromo");

        ResponseEntity<Map> response = grantPlatformRole(officer.token(), officer.userId(), "SUPER_ADMIN");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(countActivePlatformGrants(officer.userId())).isEqualTo(1);
    }

    @Test
    @DisplayName("A super admin can grant and revoke a platform role, and revocation is immediate")
    void grantAndRevokeTakeEffectImmediately() {
        Staff admin = superAdmin("granter");
        String target = registerVerifiedAndLogin("grantee");
        UUID targetUserId = currentUserId(target);

        ResponseEntity<Map> granted = grantPlatformRole(admin.token(), targetUserId, "VERIFICATION_OFFICER");
        requireOk(granted, "Grant platform role");
        UUID grantId = UUID.fromString((String) granted.getBody().get("id"));

        // Effective at once, on the SAME access token the grantee already held.
        assertThat(authorizedGet("/api/v1/admin/organizations", target).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        requireOk(authorizedPost("/api/v1/admin/platform-roles/" + grantId + "/revoke", admin.token(), null),
                "Revoke platform role");

        // And gone at once — no waiting for the 10-minute access token to expire.
        assertThat(authorizedGet("/api/v1/admin/organizations", target).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(countActivePlatformGrants(targetUserId)).isZero();
    }

    @Test
    @DisplayName("Granting the same role twice is idempotent, not a second grant")
    void repeatedGrantIsIdempotent() {
        Staff admin = superAdmin("dupe-granter");
        String target = registerVerifiedAndLogin("dupe-grantee");
        UUID targetUserId = currentUserId(target);

        ResponseEntity<Map> first = grantPlatformRole(admin.token(), targetUserId, "VERIFICATION_OFFICER");
        ResponseEntity<Map> second = grantPlatformRole(admin.token(), targetUserId, "VERIFICATION_OFFICER");

        requireOk(first, "First grant");
        requireOk(second, "Second grant");
        assertThat(second.getBody().get("id")).isEqualTo(first.getBody().get("id"));
        assertThat(countActivePlatformGrants(targetUserId)).isEqualTo(1);
    }

    @Test
    @DisplayName("The last super admin cannot be revoked")
    void lastSuperAdminIsProtected() {
        Staff admin = superAdmin("lonely-admin");

        // Other tests in this class create their own super admins against the same database, so this
        // one is only "the last" once theirs are closed. Done in SQL because it is SETUP, not the
        // behaviour under test — the revoke below goes through the real endpoint.
        jdbcTemplate.update(
                "UPDATE platform_admins SET revoked_at = now() "
                        + "WHERE role = 'SUPER_ADMIN' AND revoked_at IS NULL AND user_id <> ?",
                admin.userId());

        UUID ownGrantId = ownGrantId(admin.userId());
        ResponseEntity<Map> response =
                authorizedPost("/api/v1/admin/platform-roles/" + ownGrantId + "/revoke", admin.token(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("LAST_SUPER_ADMIN");
        // Still holds the role: without this guard a single mis-click would leave the platform with
        // nobody able to administer it and no supported way back in.
        assertThat(countActivePlatformGrants(admin.userId())).isEqualTo(1);
    }

    @Test
    @DisplayName("A super admin can be revoked while another one remains")
    void superAdminCanBeRevokedWhenAnotherRemains() {
        Staff first = superAdmin("pair-a");
        Staff second = superAdmin("pair-b");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/platform-roles/" + ownGrantId(second.userId()) + "/revoke", first.token(), null);

        requireOk(response, "Revoke second super admin");
        assertThat(countActivePlatformGrants(second.userId())).isZero();
        assertThat(countActivePlatformGrants(first.userId())).isEqualTo(1);
    }

    @Test
    @DisplayName("A suspended platform admin holds no authority")
    void suspendedAdminLosesAuthority() {
        Staff first = superAdmin("suspender");
        Staff second = superAdmin("suspendee");

        assertThat(authorizedGet("/api/v1/admin/statistics", second.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        requireOk(authorizedPost("/api/v1/admin/users/" + second.userId() + "/suspend", first.token(),
                Map.of("reason", "Policy breach")), "Suspend admin");

        assertThat(authorizedGet("/api/v1/admin/statistics", second.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    /**
     * Reads the caller's own grant id straight from SQL. The listing endpoint returns every grant on
     * the platform, and this test only cares about its own.
     */
    private UUID ownGrantId(UUID userId) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM platform_admins WHERE user_id = ? AND revoked_at IS NULL", UUID.class, userId);
    }
}
