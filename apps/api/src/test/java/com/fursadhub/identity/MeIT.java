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
        registerAndVerify(email, "Password123");
        String accessToken = loginAndExtractAccessToken(email, "Password123");

        ResponseEntity<Map> response = getMe(accessToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("email")).isEqualTo(email);
        // Previously asserted PENDING_CONTACT_VERIFICATION: an unverified account could sign in, which
        // CLAUDE.md section 13 forbids. Only a verified, ACTIVE account can reach /me now.
        assertThat(response.getBody().get("status")).isEqualTo("ACTIVE");
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
        registerAndVerify(email, "Password123");
        String accessToken = loginAndExtractAccessToken(email, "Password123");

        ResponseEntity<Map> response = getMe(accessToken + "tampered");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
