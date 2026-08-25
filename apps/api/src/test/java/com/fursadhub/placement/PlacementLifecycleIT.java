package com.fursadhub.placement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The placement lifecycle over real HTTP (CLAUDE.md section 39/54).
 *
 * <p>These tests care about three things: that each transition is an explicit command with no
 * status-mutation back door, that CANCELLED and TERMINATED stay distinct, and that a student's
 * availability is released by the terminal states — which is a property of the derived model, not of
 * a flag somebody remembered to update.
 */
class PlacementLifecycleIT extends AbstractPhase5IT {

    // ---------------------------------------------------------------- happy path

    @Test
    void acceptedOfferProducesPlannedPlacementVisibleToBothSides() {
        PlacementFixture fixture = createPlacement("happy");

        assertThat(placementStatus(fixture.placementId())).isEqualTo("PLANNED");

        ResponseEntity<Map> studentView = authorizedGet(
                "/api/v1/students/me/placements/" + fixture.placementId(), fixture.student().accessToken());
        assertThat(studentView.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(studentView.getBody().get("status")).isEqualTo("PLANNED");

        ResponseEntity<Map> recruiterView = authorizedGet(
                "/api/v1/placements/" + fixture.placementId(), fixture.recruiterToken());
        assertThat(recruiterView.getStatusCode()).isEqualTo(HttpStatus.OK);
        // The academic context travels with the placement itself.
        assertThat(recruiterView.getBody().get("universityId")).isEqualTo(fixture.universityId().toString());
        assertThat(recruiterView.getBody().get("departmentId")).isEqualTo(fixture.departmentId().toString());
    }

    @Test
    void recruiterStartsPlacementAndStampsStartedAt() {
        PlacementFixture fixture = createPlacement("start");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/start", fixture.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("ACTIVE");
        assertThat(response.getBody().get("startedAt")).isNotNull();
        assertThat(placementStatus(fixture.placementId())).isEqualTo("ACTIVE");
    }

    @Test
    void activePlacementCanRequestCompletion() {
        PlacementFixture fixture = createPlacement("request-completion");
        startPlacement(fixture);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/request-completion", fixture.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("COMPLETION_PENDING");
        assertThat(response.getBody().get("completionRequestedAt")).isNotNull();
    }

    /**
     * COMPLETED must not be reachable over HTTP in Phase 5 — it is gated on the Phase 6 requirement
     * checks, and an endpoint shipped early would let callers skip rules that do not exist yet.
     *
     * <p>The assertion is that the call does not succeed and the state does not move, rather than a
     * specific 404: FursadHub's global handler currently maps every unmatched route to
     * {@code INTERNAL_ERROR} 500 (its catch-all {@code Exception} handler swallows Spring's
     * {@code NoResourceFoundException}). That is a pre-existing, API-wide gap unrelated to
     * placements, so this test pins the behaviour that matters here instead of encoding the wart.
     */
    @Test
    void thereIsNoCompleteEndpointYet() {
        PlacementFixture fixture = createPlacement("no-complete");
        startPlacement(fixture);
        authorizedPost("/api/v1/placements/" + fixture.placementId() + "/request-completion",
                fixture.recruiterToken(), null);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/complete", fixture.recruiterToken(), null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isFalse();
        assertThat(placementStatus(fixture.placementId())).isEqualTo("COMPLETION_PENDING");
    }

    // ---------------------------------------------------------------- cancel vs terminate

    @Test
    void plannedPlacementCanBeCancelledWithReason() {
        PlacementFixture fixture = createPlacement("cancel");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/cancel", fixture.recruiterToken(),
                Map.of("reason", "Position withdrawn before the start date."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("CANCELLED");
        assertThat(response.getBody().get("cancellationReason"))
                .isEqualTo("Position withdrawn before the start date.");
        assertThat(response.getBody().get("cancelledAt")).isNotNull();
    }

    @Test
    void cancelAcceptsAnAbsentBody() {
        PlacementFixture fixture = createPlacement("cancel-no-body");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/cancel", fixture.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("CANCELLED");
        assertThat(response.getBody().get("cancellationReason")).isNull();
    }

    /** A placement that has begun ended EARLY; it was not "never started". The two are not aliases. */
    @Test
    void activePlacementCannotBeCancelled() {
        PlacementFixture fixture = createPlacement("cancel-active");
        startPlacement(fixture);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/cancel", fixture.recruiterToken(),
                Map.of("reason", "changed our mind"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("PLACEMENT_INVALID_TRANSITION");
        assertThat(placementStatus(fixture.placementId())).isEqualTo("ACTIVE");
    }

    @Test
    void plannedPlacementCannotBeTerminated() {
        PlacementFixture fixture = createPlacement("terminate-planned");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/terminate", fixture.recruiterToken(),
                Map.of("reason", "dropped out"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("PLACEMENT_INVALID_TRANSITION");
        assertThat(placementStatus(fixture.placementId())).isEqualTo("PLANNED");
    }

    @Test
    void activePlacementCanBeTerminated() {
        PlacementFixture fixture = createPlacement("terminate");
        startPlacement(fixture);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/terminate", fixture.recruiterToken(),
                Map.of("reason", "Student withdrew in week 3."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("TERMINATED");
        assertThat(response.getBody().get("terminationReason")).isEqualTo("Student withdrew in week 3.");
        assertThat(response.getBody().get("terminatedAt")).isNotNull();
    }

    @Test
    void cancelledPlacementCannotBeStartedAgain() {
        PlacementFixture fixture = createPlacement("revive");
        authorizedPost("/api/v1/placements/" + fixture.placementId() + "/cancel", fixture.recruiterToken(), null);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/start", fixture.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(placementStatus(fixture.placementId())).isEqualTo("CANCELLED");
    }

    // ---------------------------------------------------------------- idempotency and concurrency

    @Test
    void repeatedStartIsASafeNoOp() {
        PlacementFixture fixture = createPlacement("repeat-start");
        startPlacement(fixture);

        ResponseEntity<Map> second = authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/start", fixture.recruiterToken(), null);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody().get("status")).isEqualTo("ACTIVE");
        // The repeat must not have logged a second PLACEMENT_STARTED event.
        assertThat(countAuditEventsFor("PLACEMENT_STARTED", fixture.placementId())).isEqualTo(1);
    }

    /** Two simultaneous starts are serialized by SELECT ... FOR UPDATE; neither may corrupt state. */
    @Test
    void concurrentStartsLeaveExactlyOneStartedPlacement() throws Exception {
        PlacementFixture fixture = createPlacement("concurrent-start");

        int threads = 4;
        CyclicBarrier barrier = new CyclicBarrier(threads);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Callable<ResponseEntity<Map>>> calls = java.util.Collections.nCopies(threads, () -> {
                barrier.await(10, TimeUnit.SECONDS);
                return authorizedPost(
                        "/api/v1/placements/" + fixture.placementId() + "/start", fixture.recruiterToken(), null);
            });

            List<Future<ResponseEntity<Map>>> futures = pool.invokeAll(calls);
            for (Future<ResponseEntity<Map>> future : futures) {
                assertThat(future.get(20, TimeUnit.SECONDS).getStatusCode()).isEqualTo(HttpStatus.OK);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(placementStatus(fixture.placementId())).isEqualTo("ACTIVE");
        assertThat(countAuditEventsFor("PLACEMENT_STARTED", fixture.placementId())).isEqualTo(1);
    }

    // ---------------------------------------------------------------- derived availability

    /**
     * Availability is DERIVED from a live placement, not stored as a flag. Terminating therefore
     * frees the student immediately, and the partial unique index that blocks a second live
     * placement stops blocking — with no bookkeeping in between that could drift.
     */
    @Test
    void terminatingReleasesTheStudentForANewPlacement() {
        PlacementFixture fixture = createPlacement("availability");
        startPlacement(fixture);

        assertThat(countPlacementsForStudent(fixture.student().userId())).isEqualTo(1);

        authorizedPost("/api/v1/placements/" + fixture.placementId() + "/terminate", fixture.recruiterToken(),
                Map.of("reason", "ended early"));

        assertThat(placementStatus(fixture.placementId())).isEqualTo("TERMINATED");

        // The student can now take a second placement at a different organization.
        UUID secondPlacementId = secondPlacementFor(fixture);
        assertThat(placementStatus(secondPlacementId)).isEqualTo("PLANNED");
        assertThat(countPlacementsForStudent(fixture.student().userId())).isEqualTo(2);
    }

    /**
     * A live placement still blocks a second one — the release above is not a loosening.
     *
     * <p>The refusal lands at APPLICATION time rather than at acceptance: an occupied student is not
     * available to enter a new pipeline at all, so Phase 4 stops them at the front door with
     * {@code STUDENT_NOT_AVAILABLE} instead of letting them accumulate a candidacy and an offer that
     * could never be accepted. Asserting the earliest refusal is what actually pins the behaviour.
     */
    @Test
    void livePlacementStillBlocksASecondApplication() {
        PlacementFixture fixture = createPlacement("still-blocked");
        startPlacement(fixture);

        String recruiterToken = registerVerifiedAndLogin(
                emailPrefix("blocked-org-" + UUID.randomUUID().toString().substring(0, 6)));
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Blocked Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiterToken, opportunityId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/applications", fixture.student().accessToken(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("STUDENT_NOT_AVAILABLE");
        assertThat(countPlacementsForStudent(fixture.student().userId())).isEqualTo(1);
    }

    // ---------------------------------------------------------------- helpers

    /** Runs the whole publish/apply/offer/accept flow again for the SAME student at a new org. */
    private UUID secondPlacementFor(PlacementFixture fixture) {
        ResponseEntity<Map> accepted = attemptSecondAcceptance(fixture);
        if (!accepted.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Second acceptance failed: " + accepted.getBody());
        }
        Map<String, Object> placement = (Map<String, Object>) accepted.getBody().get("placement");
        return UUID.fromString((String) placement.get("id"));
    }

    private ResponseEntity<Map> attemptSecondAcceptance(PlacementFixture fixture) {
        String recruiterToken = registerVerifiedAndLogin(
                emailPrefix("second-org-" + UUID.randomUUID().toString().substring(0, 6)));
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Second Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiterToken, opportunityId);

        ResponseEntity<Map> applied = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/applications", fixture.student().accessToken(), Map.of());
        if (applied.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Second application failed: " + applied.getBody());
        }
        UUID candidacyId = UUID.fromString((String) applied.getBody().get("id"));

        ResponseEntity<Map> offered = authorizedPost(
                "/api/v1/candidacies/" + candidacyId + "/offer", recruiterToken,
                Map.of(
                        "startDate", java.time.LocalDate.now().plusMonths(2).toString(),
                        "endDate", java.time.LocalDate.now().plusMonths(5).toString(),
                        "responseDeadline", java.time.LocalDate.now().plusWeeks(2).toString(),
                        "location", "Mogadishu",
                        "details", "Second internship."));
        if (offered.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Second offer failed: " + offered.getBody());
        }
        UUID offerId = UUID.fromString((String) offered.getBody().get("id"));

        return authorizedPost("/api/v1/offers/" + offerId + "/accept", fixture.student().accessToken(), null);
    }

    private int countAuditEventsFor(String eventType, UUID placementId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_events WHERE event_type = ? AND metadata LIKE ?",
                Integer.class, eventType, "%placementId=" + placementId + "%");
        return count == null ? 0 : count;
    }
}
