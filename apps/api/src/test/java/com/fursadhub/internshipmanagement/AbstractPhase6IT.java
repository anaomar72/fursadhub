package com.fursadhub.internshipmanagement;

import com.fursadhub.placement.AbstractPhase5IT;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Shared fixtures for Phase 6 (internship management) integration tests.
 *
 * <p>Everything is built through the REAL endpoints, exactly as Phase 5 does. A placement here is
 * created by publishing an opportunity, applying, offering and accepting; it is started through the
 * lifecycle endpoint; and its supervisors are assigned through the Phase 5 supervisor endpoints. A
 * SQL shortcut would let these tests pass against a state production can never actually produce, and
 * would bypass exactly the authorization these tests exist to prove.
 *
 * <p>Only two things drop to SQL: staff memberships (no endpoint assigns them, same as Phases 4-5)
 * and reading rows back for assertions.
 */
public abstract class AbstractPhase6IT extends AbstractPhase5IT {

    /**
     * An ACTIVE placement with both supervisors assigned, plus staff on each side — everything a
     * Phase 6 test needs to act as any party.
     */
    public record InternshipFixture(
            PlacementFixture placement,
            Staff universityAdmin,
            Staff universitySupervisor,
            Staff organizationSupervisor) {

        public UUID placementId() {
            return placement.placementId();
        }

        public UUID universityId() {
            return placement.universityId();
        }

        public UUID departmentId() {
            return placement.departmentId();
        }

        public String studentToken() {
            return placement.student().accessToken();
        }
    }

    /**
     * Builds a running internship: PLANNED placement, started to ACTIVE, with a university supervisor
     * and an organization supervisor actively assigned.
     */
    protected InternshipFixture createActiveInternship(String prefix) {
        PlacementFixture placement = createPlacement(prefix);
        startPlacement(placement);

        Staff universityAdmin = universityStaff(
                emailPrefix(prefix + "-uadmin"), placement.universityId(), "UNIVERSITY_ADMIN", List.of());
        Staff universitySupervisor = universityStaff(
                emailPrefix(prefix + "-usup"), placement.universityId(), "UNIVERSITY_SUPERVISOR",
                List.of(placement.departmentId()));
        Staff organizationSupervisor = organizationStaff(
                emailPrefix(prefix + "-osup"), placement.organizationId(), "ORGANIZATION_SUPERVISOR");

        assignUniversitySupervisor(placement, universityAdmin.token(), universitySupervisor.userId());
        // Phase 5 gives the hosting organization's recruiter authority over the organization supervisor.
        assignOrganizationSupervisor(placement, placement.recruiterToken(), organizationSupervisor.userId());

        return new InternshipFixture(placement, universityAdmin, universitySupervisor, organizationSupervisor);
    }

    protected void assignUniversitySupervisor(PlacementFixture placement, String staffToken, UUID supervisorUserId) {
        requireOk(authorizedPost(
                "/api/v1/placements/" + placement.placementId() + "/university-supervisor", staffToken,
                Map.of("supervisorUserId", supervisorUserId.toString())), "Assign university supervisor");
    }

    protected void assignOrganizationSupervisor(PlacementFixture placement, String staffToken, UUID supervisorUserId) {
        requireOk(authorizedPost(
                "/api/v1/placements/" + placement.placementId() + "/organization-supervisor", staffToken,
                Map.of("supervisorUserId", supervisorUserId.toString())), "Assign organization supervisor");
    }

    // ---------------------------------------------------------------- policy

    /**
     * Sets a university-wide policy through the real endpoint, so the authorization on it is
     * exercised rather than bypassed.
     */
    protected void setUniversityPolicy(
            String adminToken, UUID universityId, boolean weeklyLogs, boolean attendance,
            boolean evaluation, boolean finalReport, boolean defense) {
        requireOk(authorizedPut("/api/v1/universities/" + universityId + "/internship-policy", adminToken,
                policyBody(weeklyLogs, attendance, evaluation, finalReport, defense)), "Set university policy");
    }

    protected ResponseEntity<Map> setDepartmentPolicy(
            String token, UUID universityId, UUID departmentId, boolean weeklyLogs, boolean attendance,
            boolean evaluation, boolean finalReport, boolean defense) {
        return authorizedPut(
                "/api/v1/universities/" + universityId + "/departments/" + departmentId + "/internship-policy",
                token, policyBody(weeklyLogs, attendance, evaluation, finalReport, defense));
    }

    protected Map<String, Object> policyBody(
            boolean weeklyLogs, boolean attendance, boolean evaluation, boolean finalReport, boolean defense) {
        return Map.of(
                "weeklyLogsRequired", weeklyLogs,
                "attendanceRequired", attendance,
                "organizationEvaluationRequired", evaluation,
                "finalReportRequired", finalReport,
                "defenseRequired", defense);
    }

    // ---------------------------------------------------------------- weekly logs

    protected ResponseEntity<Map> createWeeklyLog(String studentToken, UUID placementId, int weekNumber) {
        return authorizedPost("/api/v1/placements/" + placementId + "/weekly-logs", studentToken,
                Map.of("weekNumber", weekNumber, "summary", "Week " + weekNumber + " summary."));
    }

    /** Drives one week all the way to REVIEWED, for tests that start from a satisfied requirement. */
    protected void reviewWeek(InternshipFixture fixture, int weekNumber) {
        ResponseEntity<Map> created = createWeeklyLog(fixture.studentToken(), fixture.placementId(), weekNumber);
        requireOk(created, "Create weekly log");
        String logId = (String) created.getBody().get("id");

        requireOk(authorizedPost("/api/v1/weekly-logs/" + logId + "/submit", fixture.studentToken(), null),
                "Submit weekly log");
        requireOk(authorizedPost("/api/v1/weekly-logs/" + logId + "/review",
                fixture.universitySupervisor().token(), Map.of("comment", "Good work.")), "Review weekly log");
    }

    /** Every expected week reviewed — the state that satisfies the weekly-logs requirement. */
    protected void reviewAllWeeks(InternshipFixture fixture) {
        int expected = expectedWeekCount(fixture);
        for (int week = 1; week <= expected; week++) {
            reviewWeek(fixture, week);
        }
    }

    protected int expectedWeekCount(InternshipFixture fixture) {
        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/placements/" + fixture.placementId() + "/weekly-logs/expected-weeks",
                fixture.studentToken());
        requireOk(response, "Expected week count");
        return (Integer) response.getBody().get("expectedWeekCount");
    }

    // ---------------------------------------------------------------- attendance

    protected ResponseEntity<Map> recordAttendance(
            String supervisorToken, UUID placementId, LocalDate date, String value) {
        return authorizedPost("/api/v1/placements/" + placementId + "/attendance", supervisorToken,
                Map.of("attendanceDate", date.toString(), "attendanceValue", value));
    }

    /** One confirmed day — the minimum that satisfies the attendance requirement. */
    protected void recordAndConfirmAttendance(InternshipFixture fixture) {
        ResponseEntity<Map> recorded = recordAttendance(
                fixture.organizationSupervisor().token(), fixture.placementId(),
                placementStartDate(fixture), "PRESENT");
        requireOk(recorded, "Record attendance");
        String recordId = (String) recorded.getBody().get("id");
        requireOk(authorizedPost("/api/v1/attendance/" + recordId + "/confirm",
                fixture.organizationSupervisor().token(), null), "Confirm attendance");
    }

    protected LocalDate placementStartDate(InternshipFixture fixture) {
        return jdbcTemplate.queryForObject(
                "SELECT start_date FROM placements WHERE id = ?", LocalDate.class, fixture.placementId());
    }

    // ---------------------------------------------------------------- evaluation

    /** Draft, submit and finalize — the state that satisfies the evaluation requirement. */
    protected void finalizeEvaluation(InternshipFixture fixture) {
        String token = fixture.organizationSupervisor().token();
        String base = "/api/v1/placements/" + fixture.placementId() + "/evaluation";
        requireOk(authorizedPut(base, token, fullEvaluationBody()), "Save evaluation draft");
        requireOk(authorizedPost(base + "/submit", token, null), "Submit evaluation");
        requireOk(authorizedPost(base + "/finalize", token, null), "Finalize evaluation");
    }

    protected Map<String, Object> fullEvaluationBody() {
        return Map.of(
                "professionalismRating", 5,
                "reliabilityRating", 4,
                "communicationRating", 4,
                "workPerformanceRating", 5,
                "teamworkRating", 4,
                "overallRating", 5,
                "strengths", "Reliable and curious.",
                "improvementAreas", "More confidence in review meetings.",
                "finalComments", "A strong intern.");
    }

    // ---------------------------------------------------------------- final report

    /** A minimal but genuinely valid PDF — the magic-byte check is real, so this must start with %PDF. */
    protected byte[] validPdfBytes() {
        return "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n".getBytes(StandardCharsets.UTF_8);
    }

    protected ResponseEntity<Map> uploadFinalReport(
            String token, UUID placementId, String filename, String contentType, byte[] content) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType(contentType));
        body.add("file", new HttpEntity<>(resource, partHeaders));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        return restTemplate.exchange(
                url("/api/v1/placements/" + placementId + "/final-report/document"),
                HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    /** Upload, submit and approve — the state that satisfies the final-report requirement. */
    protected void approveFinalReport(InternshipFixture fixture) {
        String base = "/api/v1/placements/" + fixture.placementId() + "/final-report";
        requireOk(uploadFinalReport(fixture.studentToken(), fixture.placementId(),
                "report.pdf", "application/pdf", validPdfBytes()), "Upload report");
        requireOk(authorizedPost(base + "/submit", fixture.studentToken(), null), "Submit report");
        requireOk(authorizedPost(base + "/approve", fixture.universitySupervisor().token(),
                Map.of("comment", "Approved.")), "Approve report");
    }

    // ---------------------------------------------------------------- defense

    protected ResponseEntity<Map> scheduleDefense(String token, UUID placementId) {
        return authorizedPost("/api/v1/placements/" + placementId + "/defense-attempts", token,
                Map.of("scheduledAt", java.time.Instant.now().plusSeconds(86_400).toString(),
                        "locationDetails", "Main hall"));
    }

    protected ResponseEntity<Map> recordDefenseResult(String token, String attemptId, String result) {
        return authorizedPost("/api/v1/defense-attempts/" + attemptId + "/result", token,
                Map.of("result", result, "panelNotes", "Recorded by the panel."));
    }

    /** A passed defense — the state that satisfies the defense requirement. */
    protected void passDefense(InternshipFixture fixture) {
        ResponseEntity<Map> scheduled = scheduleDefense(
                fixture.universitySupervisor().token(), fixture.placementId());
        requireOk(scheduled, "Schedule defense");
        requireOk(recordDefenseResult(fixture.universitySupervisor().token(),
                (String) scheduled.getBody().get("id"), "PASSED"), "Record defense result");
    }

    // ---------------------------------------------------------------- completion

    protected void requestCompletion(InternshipFixture fixture) {
        requireOk(authorizedPost(
                "/api/v1/placements/" + fixture.placementId() + "/request-completion",
                fixture.placement().recruiterToken(), null), "Request completion");
    }

    protected ResponseEntity<Map> completePlacement(String token, UUID placementId) {
        return authorizedPost("/api/v1/placements/" + placementId + "/complete", token, null);
    }

    protected ResponseEntity<Map> completionStatus(String token, UUID placementId) {
        return authorizedGet("/api/v1/placements/" + placementId + "/completion", token);
    }

    // ---------------------------------------------------------------- assertions

    protected String policySnapshotSource(UUID placementId) {
        List<String> rows = jdbcTemplate.queryForList(
                "SELECT source FROM placement_policy_snapshots WHERE placement_id = ?", String.class, placementId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    protected int countDefenseAttempts(UUID placementId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM defense_attempts WHERE placement_id = ?", Integer.class, placementId);
        return count == null ? 0 : count;
    }

    protected int countStoredFiles() {
        Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM stored_files", Integer.class);
        return count == null ? 0 : count;
    }

    protected void requireOk(ResponseEntity<?> response, String what) {
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException(what + " failed: " + response.getStatusCode() + " " + response.getBody());
        }
    }
}
