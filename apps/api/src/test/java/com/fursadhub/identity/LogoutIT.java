package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LogoutIT extends AbstractIdentityIT {

    @Test
    void logoutRevokesTheSessionSoRefreshFails() {
        String email = uniqueEmail("logout-single");
        register(email, "Password123");
        String rawRefreshToken = loginAndExtractRawRefreshToken(email, "Password123");

        ResponseEntity<Map> logout = logoutWith(rawRefreshToken);
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> refreshAfterLogout = refreshWith(rawRefreshToken);
        assertThat(refreshAfterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutIsIdempotentForAMissingCookie() {
        ResponseEntity<Map> logout = logoutWith("not-a-real-refresh-token");
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void logoutAllRevokesEverySessionForTheUser() {
        String email = uniqueEmail("logout-all");
        register(email, "Password123");

        String rawRefreshTokenSessionOne = loginAndExtractRawRefreshToken(email, "Password123");
        ResponseEntity<Map> secondLogin = login(email, "Password123");
        String accessTokenSessionTwo = (String) secondLogin.getBody().get("accessToken");
        String rawRefreshTokenSessionTwo = extractRawRefreshTokenFromSetCookie(
                secondLogin.getHeaders().get(org.springframework.http.HttpHeaders.SET_COOKIE));

        ResponseEntity<Map> logoutAll = logoutAllWith(accessTokenSessionTwo, rawRefreshTokenSessionTwo);
        assertThat(logoutAll.getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(refreshWith(rawRefreshTokenSessionOne).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(refreshWith(rawRefreshTokenSessionTwo).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutAllRequiresAuthentication() {
        ResponseEntity<Map> response = restTemplate.postForEntity(url("/api/v1/auth/logout-all"), null, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
