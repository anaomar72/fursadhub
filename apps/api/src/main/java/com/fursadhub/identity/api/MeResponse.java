package com.fursadhub.identity.api;

import java.time.Instant;
import java.util.UUID;

public record MeResponse(
        UUID id,
        String email,
        String status,
        String preferredLocale,
        Instant emailVerifiedAt) {
}
