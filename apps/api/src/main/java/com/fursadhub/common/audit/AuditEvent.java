package com.fursadhub.common.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only security/business audit trail (CLAUDE.md section 51). Never updated after
 * insert, and never carries secrets/tokens — only safe identifiers and event metadata.
 */
@Entity
@Table(name = "audit_events")
public class AuditEvent {

    @Id
    private UUID id;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "metadata")
    private String metadata;

    protected AuditEvent() {
    }

    public AuditEvent(UUID id, Instant occurredAt, String eventType, UUID userId, String ipAddress, String userAgent, String metadata) {
        this.id = id;
        this.occurredAt = occurredAt;
        this.eventType = eventType;
        this.userId = userId;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.metadata = metadata;
    }

    public UUID getId() {
        return id;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getEventType() {
        return eventType;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getMetadata() {
        return metadata;
    }
}
