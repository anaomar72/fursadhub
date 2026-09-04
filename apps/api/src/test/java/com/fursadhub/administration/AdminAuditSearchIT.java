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
 * The audit console's search, exercised as a SUPER_ADMIN who is actually allowed to run it.
 *
 * <p>{@link PlatformAuthorizationIT} already covers who is refused. What it could not catch is that
 * the query itself was broken for the one role permitted to run it: the previous
 * {@code (:param IS NULL OR column = :param)} JPQL sent untyped NULL binds, and PostgreSQL rejected
 * them with {@code could not determine data type of parameter $5}. Every call returned 500, so the
 * whole audit trail (CLAUDE.md section 51) was unreachable while the authorization tests stayed
 * green. These cases assert the search RUNS and FILTERS, not merely that it is guarded.
 */
class AdminAuditSearchIT extends AbstractPhase7IT {

    @Test
    @DisplayName("Audit search returns results with no filters at all")
    void searchWithoutFilters() {
        Staff admin = superAdmin("audit-nofilter");

        ResponseEntity<Map> response = authorizedGet("/api/v1/admin/audit-events", admin.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        // Registering and logging the admin in has already written audit rows, so this is never empty.
        assertThat((List<?>) response.getBody().get("content")).isNotEmpty();
    }

    @Test
    @DisplayName("Each optional filter works on its own")
    void eachFilterIndependently() {
        Staff admin = superAdmin("audit-filters");

        assertThat(authorizedGet("/api/v1/admin/audit-events?page=0&size=5", admin.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedGet("/api/v1/admin/audit-events?eventType=LOGIN_SUCCESS", admin.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedGet("/api/v1/admin/audit-events?userId=" + admin.userId(), admin.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedGet(
                "/api/v1/admin/audit-events?from=2020-01-01T00:00:00Z", admin.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedGet(
                "/api/v1/admin/audit-events?to=2100-01-01T00:00:00Z", admin.token()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("All filters together still run, and every row matches the event type asked for")
    void allFiltersTogetherAndFilteringIsReal() {
        Staff admin = superAdmin("audit-combined");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/admin/audit-events?eventType=LOGIN_SUCCESS&userId=" + admin.userId()
                        + "&from=2020-01-01T00:00:00Z&to=2100-01-01T00:00:00Z&page=0&size=50",
                admin.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
        // The filter must actually narrow, not just be accepted and ignored.
        assertThat(content).isNotEmpty();
        assertThat(content).allSatisfy(row -> {
            assertThat(row.get("eventType")).isEqualTo("LOGIN_SUCCESS");
            assertThat(row.get("userId")).isEqualTo(admin.userId().toString());
        });
    }

    @Test
    @DisplayName("A filter that matches nothing returns an empty page, not an error")
    void filterMatchingNothing() {
        Staff admin = superAdmin("audit-empty");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/admin/audit-events?userId=" + UUID.randomUUID(), admin.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>) response.getBody().get("content")).isEmpty();
    }

    @Test
    @DisplayName("Newest events come first")
    void newestFirst() {
        Staff admin = superAdmin("audit-order");

        ResponseEntity<Map> response = authorizedGet("/api/v1/admin/audit-events?page=0&size=20", admin.token());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
        List<String> occurredAt = content.stream().map(row -> (String) row.get("occurredAt")).toList();
        assertThat(occurredAt).isSortedAccordingTo(java.util.Comparator.reverseOrder());
    }
}
