package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MeIT extends AbstractIdentityIT {

    @Test
    void returnsTheCurrentUserWhenAuthenticated() {
        String email = uniqueEmail("me-success");
        register(email, "Password123");
        String accessToken = loginAndExtractAccessToken(email, "Password123");

        ResponseEntity<Map> response = getMe(accessToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("email")).isEqualTo(email);
        assertThat(response.getBody().get("status")).isEqualTo("PENDING_CONTACT_VERIFICATION");
    }

    @Test
    void rejectsUnauthenticatedRequests() {
        ResponseEntity<Map> response = restTemplate.getForEntity(url("/api/v1/me"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().get("code")).isEqualTo("UNAUTHORIZED");
    }

    @Test
    void rejectsATamperedToken() {
        String email = uniqueEmail("me-tampered");
        register(email, "Password123");
        String accessToken = loginAndExtractAccessToken(email, "Password123");

        ResponseEntity<Map> response = getMe(accessToken + "tampered");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
