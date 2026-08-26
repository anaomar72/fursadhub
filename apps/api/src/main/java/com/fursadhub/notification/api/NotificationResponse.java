package com.fursadhub.notification.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fursadhub.notification.domain.Notification;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * One notification, as the frontend consumes it.
 *
 * <p>There is no rendered {@code message} field, on purpose. The client renders {@code type} through
 * its own translation files using {@code payload} as the interpolation parameters, which is what
 * lets the same notification read in English or Somali depending on the viewer
 * (CLAUDE.md section 56).
 */
public record NotificationResponse(
        UUID id,
        String type,
        Map<String, Object> payload,
        String linkPath,
        Instant readAt,
        Instant createdAt) {

    @SuppressWarnings("unchecked")
    public static NotificationResponse from(Notification notification, ObjectMapper objectMapper) {
        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(notification.getPayload(), Map.class);
        } catch (JsonProcessingException e) {
            // A payload that will not parse must not take the whole list down; the client falls back
            // to the type's generic wording when the parameters it expects are absent.
            payload = Map.of();
        }
        return new NotificationResponse(
                notification.getId(),
                notification.getNotificationType().name(),
                payload,
                notification.getLinkPath(),
                notification.getReadAt(),
                notification.getCreatedAt());
    }
}
