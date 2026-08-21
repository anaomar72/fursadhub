package com.fursadhub.identity.api;

import com.fursadhub.common.config.CookieProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Builds the HttpOnly refresh-token cookie (CLAUDE.md section 17). Scoped to the auth path only
 * so it is never sent to unrelated API routes, SameSite=Lax (our own frontend/backend are
 * same-site even across ports/subdomains) plus explicit Origin validation in
 * {@link AuthController} for defense in depth (CLAUDE.md section 21).
 */
@Component
public class RefreshCookieFactory {

    public static final String COOKIE_NAME = "fh_refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final CookieProperties properties;

    public RefreshCookieFactory(CookieProperties properties) {
        this.properties = properties;
    }

    public ResponseCookie build(String rawToken, Instant expiresAt) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(COOKIE_NAME, rawToken)
                .httpOnly(true)
                .secure(properties.secure())
                .sameSite("Lax")
                .path(COOKIE_PATH)
                .maxAge(Duration.between(Instant.now(), expiresAt));
        if (properties.domain() != null && !properties.domain().isBlank()) {
            builder.domain(properties.domain());
        }
        return builder.build();
    }

    public ResponseCookie clear() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(properties.secure())
                .sameSite("Lax")
                .path(COOKIE_PATH)
                .maxAge(Duration.ZERO);
        if (properties.domain() != null && !properties.domain().isBlank()) {
            builder.domain(properties.domain());
        }
        return builder.build();
    }
}
