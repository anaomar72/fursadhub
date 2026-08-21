package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetIT extends AbstractIdentityIT {

    @Test
    void resetSucceedsAndAllowsLoginWithNewPassword() {
        String email = uniqueEmail("reset-success");
        register(email, "OldPassword123");

        ResponseEntity<Map> forgot = restTemplate.postForEntity(url("/api/v1/auth/password/forgot"), Map.of("email", email), Map.class);
        assertThat(forgot.getStatusCode()).isEqualTo(HttpStatus.OK);

        String token = latestTokenFor(email);
        ResponseEntity<Map> reset = restTemplate.postForEntity(
                url("/api/v1/auth/password/reset"), Map.of("token", token, "newPassword", "NewPassword456"), Map.class);
        assertThat(reset.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> loginWithNewPassword = login(email, "NewPassword456");
        assertThat(loginWithNewPassword.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> loginWithOldPassword = login(email, "OldPassword123");
        assertThat(loginWithOldPassword.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void resetRevokesExistingRefreshSessions() {
        String email = uniqueEmail("reset-revokes-sessions");
        register(email, "OldPassword123");
        String rawRefreshToken = loginAndExtractRawRefreshToken(email, "OldPassword123");

        restTemplate.postForEntity(url("/api/v1/auth/password/forgot"), Map.of("email", email), Map.class);
        String token = latestTokenFor(email);
        restTemplate.postForEntity(url("/api/v1/auth/password/reset"), Map.of("token", token, "newPassword", "NewPassword456"), Map.class);

        assertThat(refreshWith(rawRefreshToken).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void expiredResetTokenIsRejected() {
        String email = uniqueEmail("reset-expired");
        register(email, "OldPassword123");
        restTemplate.postForEntity(url("/api/v1/auth/password/forgot"), Map.of("email", email), Map.class);
        String token = latestTokenFor(email);
        expirePasswordResetToken(token);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/password/reset"), Map.of("token", token, "newPassword", "NewPassword456"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("PASSWORD_RESET_TOKEN_EXPIRED");
    }

    @Test
    void resetTokenReplayIsRejected() {
        String email = uniqueEmail("reset-replay");
        register(email, "OldPassword123");
        restTemplate.postForEntity(url("/api/v1/auth/password/forgot"), Map.of("email", email), Map.class);
        String token = latestTokenFor(email);

        ResponseEntity<Map> first = restTemplate.postForEntity(
                url("/api/v1/auth/password/reset"), Map.of("token", token, "newPassword", "NewPassword456"), Map.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> replay = restTemplate.postForEntity(
                url("/api/v1/auth/password/reset"), Map.of("token", token, "newPassword", "AnotherPassword789"), Map.class);

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(replay.getBody().get("code")).isEqualTo("PASSWORD_RESET_TOKEN_INVALID");
    }

    @Test
    void forgotPasswordForUnknownEmailDoesNotLeakExistence() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/password/forgot"), Map.of("email", uniqueEmail("reset-unknown")), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
