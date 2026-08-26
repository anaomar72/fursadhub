package com.fursadhub.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One in-app notification for one user (CLAUDE.md section 55).
 *
 * <p>Stored as a type code plus a JSON parameter object rather than as finished text. That is what
 * makes CLAUDE.md section 56 work here: the wording lives in the frontend translation files, so the
 * same row renders in English for one reader and Somali for another, and re-renders correctly if the
 * wording is revised later. Storing "Week 3 of your internship log has been returned" would freeze
 * one language into the database at write time.
 *
 * <p>The payload carries only safe scalars — a week number, an attempt number, an organization name.
 * Never log content, review comments, report text, or anything derived from a token
 * (CLAUDE.md section 68).
 */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 60)
    private NotificationType notificationType;

    @Column(nullable = false)
    private String payload;

    /**
     * Relative in-app path, e.g. {@code /student/placements/{id}/weekly-logs}. Relative is enforced
     * by a CHECK constraint as well as here, so a notification can never navigate off-platform.
     */
    @Column(name = "link_path", length = 512)
    private String linkPath;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Notification() {
    }

    public static Notification of(UUID userId, NotificationType type, String payloadJson, String linkPath) {
        Notification notification = new Notification();
        notification.id = UUID.randomUUID();
        notification.userId = userId;
        notification.notificationType = type;
        notification.payload = payloadJson == null || payloadJson.isBlank() ? "{}" : payloadJson;
        notification.linkPath = linkPath;
        notification.createdAt = Instant.now();
        return notification;
    }

    /** Idempotent: marking an already-read notification read again keeps the original timestamp. */
    public void markRead() {
        if (readAt == null) {
            this.readAt = Instant.now();
        }
    }

    public boolean isRead() {
        return readAt != null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public NotificationType getNotificationType() {
        return notificationType;
    }

    public String getPayload() {
        return payload;
    }

    public String getLinkPath() {
        return linkPath;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
