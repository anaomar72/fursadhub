package com.fursadhub.administration.api;

import com.fursadhub.common.audit.AuditEvent;

import java.time.Instant;
import java.util.UUID;

/**
 * One audit event.
 *
 * <p>Passed through as stored. FursadHub never writes passwords, tokens, Authorization headers,
 * storage keys or document content into audit metadata (CLAUDE.md section 68), so there is nothing
 * to redact on the way out — the safety is at the write site, where it belongs.
 */
public record AuditEventResponse(
        UUID id,
        Instant occurredAt,
        String eventType,
        UUID userId,
        String ipAddress,
        String userAgent,
        String metadata) {

    public static AuditEventResponse from(AuditEvent event) {
        return new AuditEventResponse(
                event.getId(),
                event.getOccurredAt(),
                event.getEventType(),
                event.getUserId(),
                event.getIpAddress(),
                event.getUserAgent(),
                event.getMetadata());
    }
}
