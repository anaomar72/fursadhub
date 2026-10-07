package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
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

    /**
     * The multi-tab race: another tab's refresh rotates the cookie a moment before this tab's logout
     * arrives carrying the now-rotated token. The logout must still end the session — including the
     * successor the refresh just issued — or that successor stays valid for its full lifetime.
     */
    @Test
    void logoutWithAJustRotatedTokenStillEndsTheSessionItBelongsTo() {
        String email = uniqueEmail("logout-rotated");
        register(email, "Password123");
        String original = loginAndExtractRawRefreshToken(email, "Password123");

        ResponseEntity<Map> refresh = refreshWith(original);
        assertThat(refresh.getStatusCode()).isEqualTo(HttpStatus.OK);
        String successor = extractRawRefreshTokenFromSetCookie(
                refresh.getHeaders().get(org.springframework.http.HttpHeaders.SET_COOKIE));

        assertThat(logoutWith(original).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(refreshWith(successor).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutEndsOnlyItsOwnSessionNotTheUsersOtherSessions() {
        String email = uniqueEmail("logout-scope");
        register(email, "Password123");
        String sessionOne = loginAndExtractRawRefreshToken(email, "Password123");
        String sessionTwo = loginAndExtractRawRefreshToken(email, "Password123");

        assertThat(logoutWith(sessionOne).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(refreshWith(sessionOne).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(refreshWith(sessionTwo).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    /** The clearing cookie must match the issuing cookie's name/path, or the browser keeps the old one. */
    @Test
    void logoutClearsTheRefreshCookieWithTheAttributesItWasSetWith() {
        String email = uniqueEmail("logout-cookie");
        register(email, "Password123");
        String rawRefreshToken = loginAndExtractRawRefreshToken(email, "Password123");

        ResponseEntity<Map> logout = logoutWith(rawRefreshToken);

        List<String> setCookie = logout.getHeaders().get(org.springframework.http.HttpHeaders.SET_COOKIE);
        assertThat(setCookie).singleElement().satisfies(cookie -> assertThat(cookie)
                .startsWith("fh_refresh_token=;")
                .contains("Path=/api/v1/auth")
                .contains("Max-Age=0")
                .contains("HttpOnly")
                .contains("SameSite=Lax"));
    }

    @Test
    void logoutIsIdempotentForAnAlreadyEndedSession() {
        String email = uniqueEmail("logout-twice");
        register(email, "Password123");
        String rawRefreshToken = loginAndExtractRawRefreshToken(email, "Password123");

        assertThat(logoutWith(rawRefreshToken).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(logoutWith(rawRefreshToken).getStatusCode()).isEqualTo(HttpStatus.OK);
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
