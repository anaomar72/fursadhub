package com.fursadhub.administration.api;

import com.fursadhub.administration.domain.PlatformAdmin;

import java.time.Instant;
import java.util.UUID;

/** One platform-role grant, including revoked ones — the console shows history, not just the present. */
public record PlatformAdminResponse(
        UUID id,
        UUID userId,
        String email,
        String role,
        Instant grantedAt,
        Instant revokedAt,
        boolean active) {

    public static PlatformAdminResponse from(PlatformAdmin admin, String email) {
        return new PlatformAdminResponse(
                admin.getId(),
                admin.getUserId(),
                email,
                admin.getRole().name(),
                admin.getGrantedAt(),
                admin.getRevokedAt(),
                admin.isActive());
    }
}
