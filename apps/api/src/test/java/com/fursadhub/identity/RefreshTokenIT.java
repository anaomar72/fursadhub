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
        register(email, "Password123");
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
        register(email, "Password123");
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
        register(email, "Password123");
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
}
