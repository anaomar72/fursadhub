package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EmailVerificationIT extends AbstractIdentityIT {

    @Test
    void verificationSucceedsAndActivatesAccount() {
        String email = uniqueEmail("verify-success");
        register(email, "Password123");
        String token = latestTokenFor(email);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/email/verify"), Map.of("token", token), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void expiredVerificationTokenIsRejected() {
        String email = uniqueEmail("verify-expired");
        register(email, "Password123");
        String token = latestTokenFor(email);
        expireEmailVerificationToken(token);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/email/verify"), Map.of("token", token), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_TOKEN_EXPIRED");
    }

    @Test
    void verificationTokenReplayIsRejected() {
        String email = uniqueEmail("verify-replay");
        register(email, "Password123");
        String token = latestTokenFor(email);

        ResponseEntity<Map> first = restTemplate.postForEntity(
                url("/api/v1/auth/email/verify"), Map.of("token", token), Map.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> replay = restTemplate.postForEntity(
                url("/api/v1/auth/email/verify"), Map.of("token", token), Map.class);

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(replay.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_TOKEN_INVALID");
    }

    @Test
    void invalidVerificationTokenIsRejected() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/email/verify"), Map.of("token", "not-a-real-token"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_VERIFICATION_TOKEN_INVALID");
    }

    @Test
    void resendIssuesANewTokenAndIsRateLimited() {
        String email = uniqueEmail("verify-resend");
        register(email, "Password123");

        for (int i = 0; i < 5; i++) {
            ResponseEntity<Map> ok = restTemplate.postForEntity(
                    url("/api/v1/auth/email/resend"), Map.of("email", email), Map.class);
            assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        ResponseEntity<Map> rateLimited = restTemplate.postForEntity(
                url("/api/v1/auth/email/resend"), Map.of("email", email), Map.class);

        assertThat(rateLimited.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(rateLimited.getBody().get("code")).isEqualTo("RATE_LIMITED");
    }

    @Test
    void resendForUnknownEmailDoesNotLeakExistence() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/email/resend"), Map.of("email", uniqueEmail("verify-unknown")), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
