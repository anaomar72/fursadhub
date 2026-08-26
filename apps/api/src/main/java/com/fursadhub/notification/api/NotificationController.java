package com.fursadhub.notification.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.api.PageResponse;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * The caller's own notifications (CLAUDE.md sections 12, 55).
 *
 * <p>Every route is rooted at {@code /me}: the recipient is always the authenticated subject, taken
 * from the JWT and never from a path or body parameter. There is no route that lists another user's
 * notifications, for an administrator or anyone else.
 */
@RestController
@RequestMapping("/api/v1/me/notifications")
public class NotificationController {

    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public NotificationController(NotificationService notificationService, ObjectMapper objectMapper) {
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public PageResponse<NotificationResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<Notification> page = notificationService.list(currentUserId(jwt), unreadOnly, capPageSize(pageable));
        return PageResponse.from(page, notification -> NotificationResponse.from(notification, objectMapper));
    }

    /** Drives the unread badge, which polls this far more often than it loads the list itself. */
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("unreadCount", notificationService.unreadCount(currentUserId(jwt)));
    }

    @PostMapping("/{notificationId}/read")
    public MessageResponse markRead(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID notificationId) {
        notificationService.markRead(currentUserId(jwt), notificationId);
        return new MessageResponse("Notification marked as read.");
    }

    @PostMapping("/read-all")
    public MessageResponse markAllRead(@AuthenticationPrincipal Jwt jwt) {
        notificationService.markAllRead(currentUserId(jwt));
        return new MessageResponse("All notifications marked as read.");
    }

    /** Sorting is fixed (newest first) in the repository, so only the page size needs capping here. */
    private Pageable capPageSize(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), MAX_PAGE_SIZE));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
