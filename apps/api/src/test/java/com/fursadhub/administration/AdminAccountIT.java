package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Account suspension and reactivation (Phase 7 "Admin: account suspension").
 *
 * <p>The point these tests defend is that suspension actually STOPS someone. A status flip that left
 * the refresh cookie working would give the suspended account another thirty days, so the session
 * revocation is asserted as carefully as the status change.
 */
class AdminAccountIT extends AbstractPhase7IT {

    @Test
    @DisplayName("Suspending an account revokes its refresh sessions in the same transaction")
    void suspensionRevokesSessions() {
        Staff admin = superAdmin("acct-admin");

        String email = uniqueEmail(emailPrefix("suspend-target"));
        registerVerifiedUser(email);
        String rawRefreshToken = loginAndExtractRawRefreshToken(email, "Password123");
        UUID targetUserId = userIdOf(email);

        assertThat(countActiveRefreshTokens(targetUserId)).isEqualTo(1);

        requireOk(authorizedPost("/api/v1/admin/users/" + targetUserId + "/suspend", admin.token(),
                Map.of("reason", "Abuse report")), "Suspend");

        assertThat(userStatus(targetUserId)).isEqualTo("SUSPENDED");
        assertThat(countActiveRefreshTokens(targetUserId)).isZero();

        // The refresh cookie they still hold is now worthless.
        assertThat(refreshWith(rawRefreshToken).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        // And they cannot simply log in again.
        assertThat(login(email, "Password123").getStatusCode()).isNotEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("A suspended user is notified in-app and by email")
    void suspensionNotifiesTheAccountHolder() {
        Staff admin = superAdmin("notify-admin");
        String email = uniqueEmail(emailPrefix("notify-target"));
        registerVerifiedUser(email);
        UUID targetUserId = userIdOf(email);

        requireOk(authorizedPost("/api/v1/admin/users/" + targetUserId + "/suspend", admin.token(),
                Map.of("reason", "Internal note that must not be sent")), "Suspend");

        assertThat(countNotifications(targetUserId, "ACCOUNT_SUSPENDED")).isEqualTo(1);

        // The internal reason stays internal — it is audit metadata, not something the account holder
        // is told, because it may concern an investigation.
        assertThat(emailOutboxRepository.findByToEmailOrderByCreatedAtDesc(email))
                .noneMatch(message -> message.getBody().contains("Internal note that must not be sent"));
    }

    @Test
    @DisplayName("Suspending twice is idempotent")
    void repeatedSuspensionIsIdempotent() {
        Staff admin = superAdmin("idem-admin");
        String email = uniqueEmail(emailPrefix("idem-target"));
        registerVerifiedUser(email);
        UUID targetUserId = userIdOf(email);

        String path = "/api/v1/admin/users/" + targetUserId + "/suspend";
        requireOk(authorizedPost(path, admin.token(), Map.of("reason", "First")), "First suspend");
        requireOk(authorizedPost(path, admin.token(), Map.of("reason", "Second")), "Second suspend");

        assertThat(userStatus(targetUserId)).isEqualTo("SUSPENDED");
        // One suspension, one notification — the second call changed nothing.
        assertThat(countNotifications(targetUserId, "ACCOUNT_SUSPENDED")).isEqualTo(1);
    }

    @Test
    @DisplayName("Reactivation restores an email-verified account to ACTIVE and lets it log in")
    void reactivationRestoresAccess() {
        Staff admin = superAdmin("react-admin");
        String email = uniqueEmail(emailPrefix("react-target"));
        registerVerifiedUser(email);
        UUID targetUserId = userIdOf(email);

        requireOk(authorizedPost("/api/v1/admin/users/" + targetUserId + "/suspend", admin.token(),
                Map.of("reason", "Mistake")), "Suspend");
        requireOk(authorizedPost("/api/v1/admin/users/" + targetUserId + "/reactivate", admin.token(), null),
                "Reactivate");

        assertThat(userStatus(targetUserId)).isEqualTo("ACTIVE");
        assertThat(login(email, "Password123").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(countNotifications(targetUserId, "ACCOUNT_REACTIVATED")).isEqualTo(1);
    }

    @Test
    @DisplayName("Reactivating an account that never verified its email returns it to PENDING, not ACTIVE")
    void reactivationCannotSkipEmailVerification() {
        Staff admin = superAdmin("pending-admin");
        String email = uniqueEmail(emailPrefix("pending-target"));
        // Registered but deliberately never verified.
        register(email, "Password123");
        UUID targetUserId = userIdOf(email);

        requireOk(authorizedPost("/api/v1/admin/users/" + targetUserId + "/suspend", admin.token(),
                Map.of("reason", "Suspicious signup")), "Suspend");
        requireOk(authorizedPost("/api/v1/admin/users/" + targetUserId + "/reactivate", admin.token(), null),
                "Reactivate");

        assertThat(userStatus(targetUserId)).isEqualTo("PENDING_CONTACT_VERIFICATION");
    }

    @Test
    @DisplayName("An admin cannot suspend their own account")
    void adminCannotSuspendSelf() {
        Staff admin = superAdmin("self-suspend");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/users/" + admin.userId() + "/suspend", admin.token(), Map.of("reason", "Oops"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("CANNOT_SUSPEND_SELF");
        assertThat(userStatus(admin.userId())).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Account search filters by email fragment and status")
    void searchFiltersAccounts() {
        Staff admin = superAdmin("search-admin");
        String email = uniqueEmail(emailPrefix("findme"));
        registerVerifiedUser(email);

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/admin/users?query=" + email + "&status=ACTIVE", admin.token());

        requireOk(response, "Search users");
        assertThat((java.util.List<?>) response.getBody().get("content")).hasSize(1);
    }

    @Test
    @DisplayName("The admin account listing never exposes password hashes")
    void listingCarriesNoSecrets() {
        Staff admin = superAdmin("nosecret-admin");

        ResponseEntity<Map> response = authorizedGet("/api/v1/admin/users?query=" + admin.email(), admin.token());

        requireOk(response, "Search users");
        assertThat(response.getBody().toString())
                .doesNotContain("passwordHash")
                .doesNotContain("password_hash");
    }
}
