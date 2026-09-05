package com.fursadhub.administration.api;

import com.fursadhub.administration.application.PlatformAccountService;
import com.fursadhub.identity.domain.User;

import java.util.UUID;

/**
 * One managed verification officer as the admin console sees them (Backend Phase B5.6).
 *
 * <p>Non-secret identity and account state only. There is no password field, no password hash, no
 * token and no reset material — not even nulled-out ones — because a DTO cannot leak a value it has
 * no room for (CLAUDE.md section 26A "Super Admin Visibility").
 *
 * <p>{@code username} is null for an officer granted the role before Backend Phase B5.6, who still
 * signs in with their email. That null is what the console keys the "assign username" action on, so
 * it is a meaningful part of the contract rather than missing data.
 */
public record VerificationOfficerResponse(
        UUID userId,
        String displayName,
        String username,
        String email,
        String role,
        String status) {

    public static VerificationOfficerResponse from(PlatformAccountService.PlatformAccount account) {
        User user = account.user();
        return new VerificationOfficerResponse(
                user.getId(),
                user.getDisplayName(),
                user.getUsername(),
                user.getEmail(),
                account.role().name(),
                user.getStatus().name());
    }
}
