package com.fursadhub.candidacy;

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
 * The unified-pipeline merge invariant and its concurrency behaviour (CLAUDE.md section 36/54,
 * Phase 4 sections 8/30).
 *
 * <p>These are real end-to-end tests against Testcontainers PostgreSQL with genuinely concurrent
 * HTTP requests — deliberately not mocked, because what is being proven here is the interaction
 * between the advisory lock, the transaction boundaries and the unique constraint.
 */
class CandidacyMergeConcurrencyIT extends AbstractPhase4IT {

    private record HybridSetup(
            String recruiterToken, UUID opportunityId, UUID universityId, UUID departmentId, String coordinatorToken) {
    }

    private HybridSetup hybridSetup() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "HYBRID", Map.of());
        addTarget(recruiterToken, opportunityId, universityId, List.of(departmentId), 10);
        publishOpportunity(recruiterToken, opportunityId);

        String coordinatorEmail = uniqueEmail("coordinator");
        registerVerifiedUser(coordinatorEmail);
        insertUniversityMembership(universityId, userIdOf(coordinatorEmail), "DEPARTMENT_COORDINATOR", List.of(departmentId));
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");

        return new HybridSetup(recruiterToken, opportunityId, universityId, departmentId, coordinatorToken);
    }

    private UUID nominate(HybridSetup setup, UUID studentUserId) {
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + setup.universityId() + "/nominations", setup.coordinatorToken(),
                Map.of("opportunityId", setup.opportunityId().toString(), "studentUserId", studentUserId.toString()));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Nomination failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    private String sourceOf(UUID opportunityId, UUID studentUserId) {
        return jdbcTemplate.queryForObject(
                "SELECT source FROM candidacies WHERE opportunity_id = ? AND student_user_id = ?",
                String.class, opportunityId, studentUserId);
    }

    @Test
    void applicationThenNominationMergesToBoth() {
        HybridSetup setup = hybridSetup();
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.departmentId());

        assertThat(authorizedPost("/api/v1/opportunities/" + setup.opportunityId() + "/applications",
                student.accessToken(), Map.of()).getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(sourceOf(setup.opportunityId(), student.userId())).isEqualTo("SELF_APPLICATION");

        UUID nominationId = nominate(setup, student.userId());
        ResponseEntity<Map> accepted = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/accept", student.accessToken(), null);

        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accepted.getBody().get("source")).isEqualTo("BOTH");
        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isEqualTo(1);
    }

    @Test
    void nominationThenApplicationMergesToBoth() {
        HybridSetup setup = hybridSetup();
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.departmentId());

        UUID nominationId = nominate(setup, student.userId());
        authorizedPost("/api/v1/nominations/" + nominationId + "/accept", student.accessToken(), null);
        assertThat(sourceOf(setup.opportunityId(), student.userId())).isEqualTo("UNIVERSITY_NOMINATION");

        ResponseEntity<Map> applied = authorizedPost(
                "/api/v1/opportunities/" + setup.opportunityId() + "/applications", student.accessToken(), Map.of());

        assertThat(applied.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(applied.getBody().get("source")).isEqualTo("BOTH");
        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isEqualTo(1);
    }

    /**
     * The core race from Phase 4 section 30.1: a self-application and a nomination acceptance issued
     * at the same instant must converge on ONE candidacy with source BOTH — never two rows, and
     * never a spurious unique-constraint error surfacing to a user.
     */
    @Test
    void simultaneousApplicationAndNominationAcceptanceProduceExactlyOneCandidacyWithSourceBoth() throws Exception {
        HybridSetup setup = hybridSetup();
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.departmentId());
        UUID nominationId = nominate(setup, student.userId());

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<ResponseEntity<Map>> application = executor.submit(fireTogether(barrier,
                    () -> authorizedPost("/api/v1/opportunities/" + setup.opportunityId() + "/applications",
                            student.accessToken(), Map.of())));
            Future<ResponseEntity<Map>> consent = executor.submit(fireTogether(barrier,
                    () -> authorizedPost("/api/v1/nominations/" + nominationId + "/accept",
                            student.accessToken(), null)));

            ResponseEntity<Map> applicationResponse = application.get(30, TimeUnit.SECONDS);
            ResponseEntity<Map> consentResponse = consent.get(30, TimeUnit.SECONDS);

            assertThat(applicationResponse.getStatusCode().is2xxSuccessful())
                    .as("self-application should succeed, got %s", applicationResponse.getBody())
                    .isTrue();
            assertThat(consentResponse.getStatusCode().is2xxSuccessful())
                    .as("nomination acceptance should succeed, got %s", consentResponse.getBody())
                    .isTrue();
        } finally {
            executor.shutdownNow();
        }

        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isEqualTo(1);
        assertThat(sourceOf(setup.opportunityId(), student.userId())).isEqualTo("BOTH");
    }

    /** Phase 4 section 30.2: hammering apply must never produce a second candidacy. */
    @Test
    void concurrentRepeatedSelfApplicationsProduceExactlyOneCandidacy() throws Exception {
        HybridSetup setup = hybridSetup();
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.departmentId());

        int attempts = 5;
        CyclicBarrier barrier = new CyclicBarrier(attempts);
        ExecutorService executor = Executors.newFixedThreadPool(attempts);
        try {
            List<Future<ResponseEntity<Map>>> futures = new java.util.ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                futures.add(executor.submit(fireTogether(barrier,
                        () -> authorizedPost("/api/v1/opportunities/" + setup.opportunityId() + "/applications",
                                student.accessToken(), Map.of()))));
            }

            long created = 0;
            for (Future<ResponseEntity<Map>> future : futures) {
                if (future.get(30, TimeUnit.SECONDS).getStatusCode() == HttpStatus.CREATED) {
                    created++;
                }
            }
            assertThat(created).as("exactly one application attempt should be accepted").isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }

        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isEqualTo(1);
    }

    /**
     * A candidacy the recruiter already rejected must not be quietly reopened by a later nomination —
     * the recruiter's decision stands and the history is preserved.
     */
    @Test
    void closedCandidacyIsNotReopenedByLaterNomination() {
        HybridSetup setup = hybridSetup();
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.departmentId());

        authorizedPost("/api/v1/opportunities/" + setup.opportunityId() + "/applications", student.accessToken(), Map.of());
        UUID candidacyId = jdbcTemplate.queryForObject(
                "SELECT id FROM candidacies WHERE opportunity_id = ? AND student_user_id = ?",
                UUID.class, setup.opportunityId(), student.userId());
        authorizedPost("/api/v1/candidacies/" + candidacyId + "/reject", setup.recruiterToken(), null);

        UUID nominationId = nominate(setup, student.userId());
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/accept", student.accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("CANDIDACY_ALREADY_CLOSED");
        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isEqualTo(1);
    }

    /** Appending merge history rather than overwriting it (CLAUDE.md section 51). */
    @Test
    void mergePreservesRecruitmentHistory() {
        HybridSetup setup = hybridSetup();
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.departmentId());

        authorizedPost("/api/v1/opportunities/" + setup.opportunityId() + "/applications", student.accessToken(), Map.of());
        UUID nominationId = nominate(setup, student.userId());
        authorizedPost("/api/v1/nominations/" + nominationId + "/accept", student.accessToken(), null);

        UUID candidacyId = jdbcTemplate.queryForObject(
                "SELECT id FROM candidacies WHERE opportunity_id = ? AND student_user_id = ?",
                UUID.class, setup.opportunityId(), student.userId());

        List<String> eventTypes = jdbcTemplate.queryForList(
                "SELECT event_type FROM candidacy_events WHERE candidacy_id = ? ORDER BY occurred_at",
                String.class, candidacyId);

        assertThat(eventTypes).contains("APPLICATION_SUBMITTED", "SOURCE_MERGED_TO_BOTH");
    }

    /** Releases both callers at the same instant so the requests genuinely overlap. */
    private <T> Callable<T> fireTogether(CyclicBarrier barrier, Callable<T> action) {
        return () -> {
            barrier.await(30, TimeUnit.SECONDS);
            return action.call();
        };
    }
}
