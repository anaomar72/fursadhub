package com.fursadhub.internshipmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Genuinely concurrent Phase 6 requests against Testcontainers PostgreSQL (Phase 6 section 27).
 *
 * <p>Every invariant here is backed by a database constraint or a row lock, never by a
 * check-then-insert. These tests fire real simultaneous HTTP requests to prove that: the point is
 * not that the service checks first, but that the database refuses the loser even if the check
 * passed for both.
 */
class InternshipManagementConcurrencyIT extends AbstractPhase6IT {

    private static final int TIMEOUT_SECONDS = 30;

    @Test
    void concurrentWeeklyLogCreationForTheSameWeekProducesExactlyOneLog() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-week");

        List<ResponseEntity<Map>> responses = fireTogether(4,
                () -> createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1));

        assertThat(successes(responses)).as("uk_weekly_logs_placement_week must admit exactly one").isEqualTo(1);
        assertThat(countWeeklyLogs(fixture)).isEqualTo(1);
    }

    @Test
    void concurrentAttendanceForTheSameDateProducesExactlyOneRecord() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-att");

        List<ResponseEntity<Map>> responses = fireTogether(4,
                () -> recordAttendance(fixture.organizationSupervisor().token(), fixture.placementId(),
                        placementStartDate(fixture), "PRESENT"));

        assertThat(successes(responses)).isEqualTo(1);
        Integer records = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM attendance_records WHERE placement_id = ?",
                Integer.class, fixture.placementId());
        assertThat(records).isEqualTo(1);
    }

    @Test
    void concurrentDefenseSchedulingNeverProducesTwoAttemptsWithTheSameNumber() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-defense");

        // Both callers compute "next attempt = 1"; only one may commit it.
        List<ResponseEntity<Map>> responses = fireTogether(4,
                () -> scheduleDefense(fixture.universitySupervisor().token(), fixture.placementId()));

        assertThat(successes(responses)).isEqualTo(1);
        assertThat(countDefenseAttempts(fixture.placementId())).isEqualTo(1);
        Integer distinctNumbers = jdbcTemplate.queryForObject(
                "SELECT count(DISTINCT attempt_number) FROM defense_attempts WHERE placement_id = ?",
                Integer.class, fixture.placementId());
        assertThat(distinctNumbers).isEqualTo(1);
    }

    @Test
    void concurrentEvaluationDraftsProduceExactlyOneEvaluation() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-eval-draft");

        fireTogether(3, () -> authorizedPut(
                "/api/v1/placements/" + fixture.placementId() + "/evaluation",
                fixture.organizationSupervisor().token(), fullEvaluationBody()));

        Integer evaluations = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placement_evaluations WHERE placement_id = ?",
                Integer.class, fixture.placementId());
        assertThat(evaluations).isEqualTo(1);
    }

    @Test
    void repeatedFinalizationLeavesOneFinalEvaluationWithOneAuditEvent() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-eval-final");
        String base = "/api/v1/placements/" + fixture.placementId() + "/evaluation";
        String token = fixture.organizationSupervisor().token();
        authorizedPut(base, token, fullEvaluationBody());
        authorizedPost(base + "/submit", token, null);
        int auditBefore = countAuditEvents("EVALUATION_FINALIZED");

        List<ResponseEntity<Map>> responses =
                fireTogether(4, () -> authorizedPost(base + "/finalize", token, null));

        // Every caller sees FINAL; only the first one actually performed the transition.
        assertThat(responses).allSatisfy(response ->
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK));
        assertThat(countAuditEvents("EVALUATION_FINALIZED")).isEqualTo(auditBefore + 1);
        assertThat(authorizedGet(base, token).getBody()).containsEntry("state", "FINAL");
    }

    @Test
    void repeatedFinalReportApprovalIsAppliedOnce() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-report");
        String base = "/api/v1/placements/" + fixture.placementId() + "/final-report";
        uploadFinalReport(fixture.studentToken(), fixture.placementId(),
                "report.pdf", "application/pdf", validPdfBytes());
        authorizedPost(base + "/submit", fixture.studentToken(), null);
        int auditBefore = countAuditEvents("FINAL_REPORT_APPROVED");

        List<ResponseEntity<Map>> responses = fireTogether(4, () -> authorizedPost(
                base + "/approve", fixture.universitySupervisor().token(), Map.of("comment", "Approved.")));

        assertThat(responses).allSatisfy(response ->
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK));
        assertThat(countAuditEvents("FINAL_REPORT_APPROVED")).isEqualTo(auditBefore + 1);
    }

    @Test
    void twoSimultaneousCompletionsProduceOneCompletionAndNoDuplicateSideEffects() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-complete");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                false, false, false, false, false);
        requestCompletion(fixture);
        int auditBefore = countAuditEvents("PLACEMENT_COMPLETED");

        List<ResponseEntity<Map>> responses = fireTogether(4,
                () -> completePlacement(fixture.universityAdmin().token(), fixture.placementId()));

        // The row lock serializes them: the first completes, the rest observe COMPLETED and return it.
        assertThat(responses).allSatisfy(response ->
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK));
        assertThat(placementStatus(fixture.placementId())).isEqualTo("COMPLETED");
        assertThat(countAuditEvents("PLACEMENT_COMPLETED")).isEqualTo(auditBefore + 1);
    }

    @Test
    void repeatedWeeklyLogSubmissionIsAppliedOnce() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-submit");
        String logId = (String) createWeeklyLog(fixture.studentToken(), fixture.placementId(), 1)
                .getBody().get("id");
        int auditBefore = countAuditEvents("WEEKLY_LOG_SUBMITTED");

        List<ResponseEntity<Map>> responses = fireTogether(4, () -> authorizedPost(
                "/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null));

        assertThat(responses).allSatisfy(response ->
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK));
        assertThat(countAuditEvents("WEEKLY_LOG_SUBMITTED")).isEqualTo(auditBefore + 1);
    }

    @Test
    void concurrentPolicySnapshotResolutionFreezesExactlyOneSnapshot() throws Exception {
        InternshipFixture fixture = createActiveInternship("cc-snapshot");
        setUniversityPolicy(fixture.universityAdmin().token(), fixture.universityId(),
                true, false, false, false, false);

        // Several first-touches at once: all compute the same values, one wins the insert, the rest
        // read the winner's row (uk_pps_placement).
        fireTogether(4, () -> completionStatus(fixture.studentToken(), fixture.placementId()));

        Integer snapshots = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placement_policy_snapshots WHERE placement_id = ?",
                Integer.class, fixture.placementId());
        assertThat(snapshots).isEqualTo(1);
        assertThat(policySnapshotSource(fixture.placementId())).isEqualTo("UNIVERSITY");
    }

    // ---------------------------------------------------------------- helpers

    /** Releases {@code count} identical requests at the same instant through a barrier. */
    private List<ResponseEntity<Map>> fireTogether(int count, Callable<ResponseEntity<Map>> action)
            throws Exception {
        CyclicBarrier barrier = new CyclicBarrier(count);
        ExecutorService executor = Executors.newFixedThreadPool(count);
        try {
            List<Future<ResponseEntity<Map>>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                futures.add(executor.submit(() -> {
                    barrier.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
                    return action.call();
                }));
            }
            List<ResponseEntity<Map>> responses = new ArrayList<>();
            for (Future<ResponseEntity<Map>> future : futures) {
                responses.add(future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS));
            }
            return responses;
        } finally {
            executor.shutdownNow();
        }
    }

    private long successes(List<ResponseEntity<Map>> responses) {
        return responses.stream().filter(response -> response.getStatusCode().is2xxSuccessful()).count();
    }

    private int countWeeklyLogs(InternshipFixture fixture) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM weekly_logs WHERE placement_id = ?", Integer.class, fixture.placementId());
        return count == null ? 0 : count;
    }
}
