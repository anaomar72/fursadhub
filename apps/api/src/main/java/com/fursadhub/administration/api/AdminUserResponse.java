package com.fursadhub.administration.api;

import com.fursadhub.identity.domain.User;

import java.time.Instant;
import java.util.UUID;

/**
 * An account as the admin console sees it.
 *
 * <p>Carries no password hash and no token material of any kind — only what an administrator needs
 * to identify an account and judge its state (CLAUDE.md section 68).
 */
public record AdminUserResponse(
        UUID id,
        String email,
        String status,
        String preferredLocale,
        Instant emailVerifiedAt,
        Instant createdAt) {

    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getStatus().name(),
                user.getPreferredLocale(),
                user.getEmailVerifiedAt(),
                user.getCreatedAt());
    }
}
