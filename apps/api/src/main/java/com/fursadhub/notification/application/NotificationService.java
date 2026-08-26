package com.fursadhub.notification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.notification.domain.Notification;
import com.fursadhub.notification.domain.NotificationRepository;
import com.fursadhub.notification.domain.NotificationType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The single entry point for notifying a user (CLAUDE.md section 55).
 *
 * <p>Both channels are written inside the CALLER's transaction: the in-app row and the outbox row
 * commit or roll back with the business action that caused them. Neither one sends anything — the
 * scheduled {@code EmailOutboxDispatcher} delivers mail afterwards, on its own — so a business
 * transaction never depends on SMTP being reachable. That is the whole point of the outbox pattern
 * and the reason no queue broker is involved (and none may be introduced).
 *
 * <p>Reads are strictly self-service: every query takes the authenticated caller's own id, and no
 * endpoint anywhere accepts a user id from the browser (CLAUDE.md section 12). There is no
 * "notifications for user X" method for an administrator to reach through.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notifications;
    private final EmailOutboxService outbox;
    private final ObjectMapper objectMapper;

    public NotificationService(
            NotificationRepository notifications, EmailOutboxService outbox, ObjectMapper objectMapper) {
        this.notifications = notifications;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    /** In-app only. */
    public Notification notify(UUID userId, NotificationType type, Map<String, Object> payload, String linkPath) {
        return notify(userId, type, payload, linkPath, null);
    }

    /**
     * Creates the in-app notification and, when {@code email} is supplied and the type has an email
     * template, also enqueues the matching transactional email.
     *
     * @param email the recipient address, or {@code null} for in-app only. Passing an address for a
     *              type with no template is not an error: the user still gets the in-app
     *              notification, which is the channel that is always present.
     */
    @Transactional
    public Notification notify(
            UUID userId, NotificationType type, Map<String, Object> payload, String linkPath, String email) {
        Notification notification = notifications.save(
                Notification.of(userId, type, toJson(payload), linkPath));

        if (email != null && !email.isBlank()) {
            NotificationEmailTemplates.forType(type, payload)
                    .ifPresent(template -> outbox.enqueue(email, template.subject(), template.body()));
        }
        return notification;
    }

    // ---------------------------------------------------------------- self-service reads

    @Transactional(readOnly = true)
    public Page<Notification> list(UUID userId, boolean unreadOnly, Pageable pageable) {
        return unreadOnly
                ? notifications.findUnreadByUserId(userId, pageable)
                : notifications.findByUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notifications.countUnreadByUserId(userId);
    }

    /**
     * Marks one notification read.
     *
     * <p>Ownership is checked against the authenticated caller, and a notification belonging to
     * someone else returns 404 rather than 403 — a 403 would confirm that the id exists, which is
     * enough to enumerate other people's notifications.
     */
    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        Notification notification = notifications.findById(notificationId)
                .filter(candidate -> candidate.getUserId().equals(userId))
                .orElseThrow(() -> new ApiException(
                        "NOTIFICATION_NOT_FOUND", HttpStatus.NOT_FOUND, "No such notification."));
        notification.markRead();
        notifications.save(notification);
    }

    @Transactional
    public int markAllRead(UUID userId) {
        List<Notification> unread = notifications.findUnreadForUpdate(userId);
        unread.forEach(notification -> {
            notification.markRead();
            notifications.save(notification);
        });
        return unread.size();
    }

    /**
     * Serializes the translation parameters.
     *
     * <p>Falls back to an empty object rather than throwing: a notification that renders with a
     * generic message is a far better outcome than a business transaction rolled back because one
     * payload value would not serialize.
     */
    private String toJson(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize notification payload — storing an empty one", e);
            return "{}";
        }
    }
}
