package com.fursadhub.candidacy.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only recruitment history for one candidacy (CLAUDE.md section 51 — never silently
 * overwrite meaningful history). Rows are inserted and never updated or deleted, so the full
 * story of how a candidate moved through the pipeline (including a source merge to BOTH) survives
 * every later status change.
 *
 * <p>{@code actorUserId} is null for system-derived events such as lazy offer expiry, which no
 * human triggers.
 */
@Entity
@Table(name = "candidacy_events")
public class CandidacyEvent {

    @Id
    private UUID id;

    @Column(name = "candidacy_id", nullable = false)
    private UUID candidacyId;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private CandidacyStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 30)
    private CandidacyStatus toStatus;

    @Column(length = 500)
    private String metadata;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected CandidacyEvent() {
    }

    public static CandidacyEvent record(
            UUID candidacyId, String eventType, UUID actorUserId, CandidacyStatus fromStatus, CandidacyStatus toStatus,
            String metadata) {
        CandidacyEvent event = new CandidacyEvent();
        event.id = UUID.randomUUID();
        event.candidacyId = candidacyId;
        event.eventType = eventType;
        event.actorUserId = actorUserId;
        event.fromStatus = fromStatus;
        event.toStatus = toStatus;
        event.metadata = metadata;
        event.occurredAt = Instant.now();
        return event;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidacyId() {
        return candidacyId;
    }

    public String getEventType() {
        return eventType;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public CandidacyStatus getFromStatus() {
        return fromStatus;
    }

    public CandidacyStatus getToStatus() {
        return toStatus;
    }

    public String getMetadata() {
        return metadata;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
