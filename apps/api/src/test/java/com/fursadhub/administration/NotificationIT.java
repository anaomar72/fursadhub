package com.fursadhub.administration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * In-app notifications (CLAUDE.md sections 55-56).
 *
 * <p>Two properties matter here. First, notifications are strictly the recipient's — there is no
 * route that reads someone else's. Second, they are stored as a type code plus parameters rather than
 * rendered prose, which is what lets the same row render in English or Somali; a test that only
 * checked "a notification exists" would not notice that regressing.
 */
class NotificationIT extends AbstractPhase7IT {

    @Test
    @DisplayName("A notification is stored as a type code and parameters, never as rendered text")
    void notificationsCarryCodesNotProse() {
        InternshipFixture fixture = createActiveInternship("notif-code");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);

        ResponseEntity<Map> created = createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1);
        requireOk(created, "Create weekly log");
        String logId = (String) created.getBody().get("id");
        requireOk(authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null),
                "Submit");
        requireOk(authorizedPost("/api/v1/weekly-logs/" + logId + "/return",
                fixture.universitySupervisor().token(), Map.of("comment", "Please expand section 2.")),
                "Return for changes");

        ResponseEntity<Map> notifications = authorizedGet("/api/v1/me/notifications", fixture.studentToken());
        requireOk(notifications, "List notifications");

        List<?> content = (List<?>) notifications.getBody().get("content");
        assertThat(content).isNotEmpty();
        Map<?, ?> first = (Map<?, ?>) content.get(0);

        assertThat(first.get("type")).isEqualTo("WEEKLY_LOG_RETURNED");
        assertThat(((Map<?, ?>) first.get("payload")).get("weekNumber")).isEqualTo(1);
        // No rendered message field at all — the wording lives in the frontend translation files.
        assertThat(first.containsKey("message")).isFalse();
        // And the supervisor's actual comment is never copied into the notification.
        assertThat(first.toString()).doesNotContain("Please expand section 2");
    }

    @Test
    @DisplayName("A notification links to a relative in-app path, never an absolute URL")
    void linksAreRelative() {
        InternshipFixture fixture = createActiveInternship("notif-link");

        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);
        reviewWeek(fixture, 1);

        ResponseEntity<Map> notifications = authorizedGet("/api/v1/me/notifications", fixture.studentToken());
        requireOk(notifications, "List");
        List<?> content = (List<?>) notifications.getBody().get("content");

        assertThat(content).allSatisfy(entry -> {
            Object link = ((Map<?, ?>) entry).get("linkPath");
            if (link != null) {
                assertThat((String) link).startsWith("/").doesNotStartWith("//");
            }
        });
    }

    @Test
    @DisplayName("Unread count falls as notifications are read, and read-all clears it")
    void unreadCountTracksReads() {
        InternshipFixture fixture = createActiveInternship("notif-unread");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);
        reviewWeek(fixture, 1);
        reviewWeek(fixture, 2);

        assertThat(unreadCount(fixture.studentToken())).isGreaterThanOrEqualTo(2);

        ResponseEntity<Map> list = authorizedGet("/api/v1/me/notifications?unreadOnly=true", fixture.studentToken());
        requireOk(list, "List unread");
        List<?> content = (List<?>) list.getBody().get("content");
        String firstId = (String) ((Map<?, ?>) content.get(0)).get("id");

        long before = unreadCount(fixture.studentToken());
        requireOk(authorizedPost("/api/v1/me/notifications/" + firstId + "/read", fixture.studentToken(), null),
                "Mark read");
        assertThat(unreadCount(fixture.studentToken())).isEqualTo(before - 1);

        requireOk(authorizedPost("/api/v1/me/notifications/read-all", fixture.studentToken(), null), "Read all");
        assertThat(unreadCount(fixture.studentToken())).isZero();
    }

    @Test
    @DisplayName("Marking a notification read twice keeps the original timestamp")
    void markReadIsIdempotent() {
        InternshipFixture fixture = createActiveInternship("notif-idem");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);
        reviewWeek(fixture, 1);

        ResponseEntity<Map> list = authorizedGet("/api/v1/me/notifications", fixture.studentToken());
        requireOk(list, "List");
        String id = (String) ((Map<?, ?>) ((List<?>) list.getBody().get("content")).get(0)).get("id");

        requireOk(authorizedPost("/api/v1/me/notifications/" + id + "/read", fixture.studentToken(), null),
                "First read");
        String firstReadAt = readAtOf(UUID.fromString(id));
        requireOk(authorizedPost("/api/v1/me/notifications/" + id + "/read", fixture.studentToken(), null),
                "Second read");

        assertThat(readAtOf(UUID.fromString(id))).isEqualTo(firstReadAt);
    }

    @Test
    @DisplayName("A user cannot read or mark another user's notification")
    void notificationsAreStrictlyPerUser() {
        InternshipFixture fixture = createActiveInternship("notif-isolate");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);
        reviewWeek(fixture, 1);

        ResponseEntity<Map> studentList = authorizedGet("/api/v1/me/notifications", fixture.studentToken());
        requireOk(studentList, "Student list");
        String studentNotificationId =
                (String) ((Map<?, ?>) ((List<?>) studentList.getBody().get("content")).get(0)).get("id");

        String outsider = registerVerifiedAndLogin("notif-outsider");

        // Their own list is empty — no route exposes anyone else's.
        ResponseEntity<Map> outsiderList = authorizedGet("/api/v1/me/notifications", outsider);
        requireOk(outsiderList, "Outsider list");
        assertThat((List<?>) outsiderList.getBody().get("content")).isEmpty();

        // And guessing an id gets a 404, not a 403 — a 403 would confirm the id exists.
        ResponseEntity<Map> attempt = authorizedPost(
                "/api/v1/me/notifications/" + studentNotificationId + "/read", outsider, null);
        assertThat(attempt.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(errorCode(attempt)).isEqualTo("NOTIFICATION_NOT_FOUND");
    }

    @Test
    @DisplayName("Unauthenticated callers cannot read notifications")
    void notificationsRequireAuthentication() {
        assertThat(unauthenticatedGet("/api/v1/me/notifications").getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("A newly enqueued email is due immediately and carries no backoff yet")
    void outboxMessagesStartDue() {
        String email = uniqueEmail(emailPrefix("outbox-user"));
        register(email, "Password123");

        Integer due = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM email_outbox WHERE to_email = ? AND next_attempt_at <= now()",
                Integer.class, email);

        assertThat(due).isGreaterThanOrEqualTo(1);
    }

    private String readAtOf(UUID notificationId) {
        return jdbcTemplate.queryForObject(
                "SELECT read_at::text FROM notifications WHERE id = ?", String.class, notificationId);
    }
}
