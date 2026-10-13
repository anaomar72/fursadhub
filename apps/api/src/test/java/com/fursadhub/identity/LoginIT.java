package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LoginIT extends AbstractIdentityIT {

    @Test
    void validLoginReturnsAccessTokenAndSetsRefreshCookie() {
        String email = uniqueEmail("login-valid");
        registerAndVerify(email, "Password123");

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", email, "password", "Password123"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("accessToken")).isNotNull();
        assertThat(response.getBody().get("tokenType")).isEqualTo("Bearer");
        assertThat(response.getHeaders().get("Set-Cookie"))
                .anyMatch(cookie -> cookie.startsWith("fh_refresh_token=") && cookie.contains("HttpOnly"));
    }

    @Test
    void invalidPasswordIsRejected() {
        String email = uniqueEmail("login-badpass");
        // Deliberately left unverified: a wrong password must look identical for pending and active
        // accounts, so EMAIL_NOT_VERIFIED can never be used to probe which addresses are registered.
        register(email, "Password123");

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", email, "password", "WrongPassword1"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().get("code")).isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    void unknownEmailIsRejectedWithoutLeakingExistence() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", uniqueEmail("login-unknown"), "password", "Password123"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().get("code")).isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    void suspendedAccountCannotAuthenticate() {
        String email = uniqueEmail("login-suspended");
        register(email, "Password123");
        suspendUser(email);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", email, "password", "Password123"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCOUNT_SUSPENDED");
    }

    @Test
    void pendingAccountWithCorrectPasswordIsRefusedAndReceivesNoSession() {
        String email = uniqueEmail("login-pending");
        register(email, "Password123");

        ResponseEntity<Map> response = login(email, "Password123");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_NOT_VERIFIED");
        assertThat(response.getBody()).doesNotContainKey("accessToken");
        assertThat(response.getHeaders().get(HttpHeaders.SET_COOKIE))
                .as("no refresh cookie may be issued to an unverified account")
                .satisfiesAnyOf(
                        cookies -> assertThat(cookies).isNull(),
                        cookies -> assertThat(cookies).noneMatch(c -> c.startsWith("fh_refresh_token=")));
        Integer liveSessions = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM refresh_tokens r JOIN users u ON u.id = r.user_id WHERE u.email = ?",
                Integer.class, email);
        assertThat(liveSessions).isZero();
        Integer audited = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_events a JOIN users u ON u.id = a.user_id "
                        + "WHERE u.email = ? AND a.event_type = ? AND a.metadata = ?",
                Integer.class, email, "LOGIN_FAILURE", "reason=email_unverified");
        assertThat(audited).isEqualTo(1);
    }

    @Test
    void pendingAccountCanSignInAfterRecoveringThroughANewCode() {
        String email = uniqueEmail("login-recover");
        register(email, "Password123");
        // The original code has lapsed by the time the user comes back to sign in.
        expireEmailVerificationCode(email);
        assertThat(login(email, "Password123").getBody().get("code")).isEqualTo("EMAIL_NOT_VERIFIED");

        assertThat(resendVerification(email).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(verifyEmailCode(email, latestVerificationCodeFor(email)).getStatusCode().is2xxSuccessful()).isTrue();

        ResponseEntity<Map> response = login(email, "Password123");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("accessToken")).isNotNull();
    }
}
