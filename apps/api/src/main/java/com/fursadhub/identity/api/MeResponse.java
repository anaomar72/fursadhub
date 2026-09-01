package com.fursadhub.identity.api;

import java.time.Instant;
import java.util.UUID;

public record MeResponse(
        UUID id,
        String email,
        String status,
        String preferredLocale,
        Instant emailVerifiedAt,
        /** A flag, not a file id — the picture is fetched through its own audited route (CLAUDE.md section 47). */
        boolean hasAvatar) {
}
