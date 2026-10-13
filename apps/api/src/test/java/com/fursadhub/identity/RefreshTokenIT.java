package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenIT extends AbstractIdentityIT {

    @Test
    void refreshSucceedsAndRotatesTheToken() {
        String email = uniqueEmail("refresh-success");
        registerAndVerify(email, "Password123");
        String firstCookie = loginAndExtractRawRefreshToken(email, "Password123");

        ResponseEntity<Map> response = refreshWith(firstCookie);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("accessToken")).isNotNull();
        String rotatedCookie = extractRawRefreshTokenFromSetCookie(response.getHeaders().get(HttpHeaders.SET_COOKIE));
        assertThat(rotatedCookie).isNotEqualTo(firstCookie);
    }

    @Test
    void refreshReplayIsDetectedAndRevokesTheFamily() {
        String email = uniqueEmail("refresh-replay");
        registerAndVerify(email, "Password123");
        String firstCookie = loginAndExtractRawRefreshToken(email, "Password123");

        ResponseEntity<Map> rotated = refreshWith(firstCookie);
        assertThat(rotated.getStatusCode()).isEqualTo(HttpStatus.OK);
        String rotatedCookie = extractRawRefreshTokenFromSetCookie(rotated.getHeaders().get(HttpHeaders.SET_COOKIE));

        ResponseEntity<Map> replay = refreshWith(firstCookie);
        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(replay.getBody().get("code")).isEqualTo("REFRESH_TOKEN_REUSE_DETECTED");

        ResponseEntity<Map> rotatedNowRevokedToo = refreshWith(rotatedCookie);
        assertThat(rotatedNowRevokedToo.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void expiredRefreshTokenIsRejected() {
        String email = uniqueEmail("refresh-expired");
        registerAndVerify(email, "Password123");
        String cookie = loginAndExtractRawRefreshToken(email, "Password123");
        expireRefreshTokenCookie(cookie);

        ResponseEntity<Map> response = refreshWith(cookie);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().get("code")).isEqualTo("REFRESH_TOKEN_INVALID");
    }

    @Test
    void missingRefreshCookieIsRejected() {
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/api/v1/auth/refresh"), null, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().get("code")).isEqualTo("REFRESH_TOKEN_INVALID");
    }

    @Test
    void sessionHeldByAnUnverifiedAccountCannotBeRefreshed() {
        // Reproduces a session minted before email verification was enforced at login: sign in as a
        // verified account, then return the account to PENDING_CONTACT_VERIFICATION.
        String email = uniqueEmail("refresh-pending");
        registerAndVerify(email, "Password123");
        String cookie = loginAndExtractRawRefreshToken(email, "Password123");
        jdbcTemplate.update(
                "UPDATE users SET status = 'PENDING_CONTACT_VERIFICATION', email_verified_at = NULL WHERE email = ?", email);

        ResponseEntity<Map> response = refreshWith(cookie);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("EMAIL_NOT_VERIFIED");
        assertThat(response.getBody()).doesNotContainKey("accessToken");
        // Not rotated: the presented token is still the only one in its family, and presenting it
        // again is refused the same way rather than being treated as a replay.
        Integer tokens = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM refresh_tokens r JOIN users u ON u.id = r.user_id WHERE u.email = ?",
                Integer.class, email);
        assertThat(tokens).isEqualTo(1);
        assertThat(refreshWith(cookie).getBody().get("code")).isEqualTo("EMAIL_NOT_VERIFIED");
    }
}
