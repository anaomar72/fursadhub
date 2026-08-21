package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LoginIT extends AbstractIdentityIT {

    @Test
    void validLoginReturnsAccessTokenAndSetsRefreshCookie() {
        String email = uniqueEmail("login-valid");
        register(email, "Password123");

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
}
