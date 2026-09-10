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
 * Backend Phase B6 — what each platform statistic actually counts.
 *
 * <p>Every assertion here is a DELTA, never an absolute. These tests share a database with every
 * other integration test in the suite, so "the platform has 3 published opportunities" would be a
 * lie the moment another test ran; "planting these five rows moved this counter by exactly this much"
 * is true regardless of what else exists. It is also the only form that can pin a definition —
 * asserting a count is above zero would pass for almost any implementation, including a wrong one.
 *
 * <p>The definition under most pressure is the difference between {@code opportunitiesByStatus}'s
 * {@code PUBLISHED} key and {@code publiclyDiscoverableOpportunities}. They are deliberately
 * different numbers, and a reader of the dashboard has to be able to trust which is which.
 */
@SuppressWarnings("unchecked")
class PlatformStatisticsSemanticsIT extends AbstractPhase7IT {

    /**
     * The central B6 metric distinction, proved by planting one opportunity of each interesting kind
     * and reading both counters.
     *
     * <p>Five listings are created. Three end up {@code PUBLISHED} by stored state; only ONE of those
     * is publicly discoverable, because one belongs to a suspended organization and one is
     * university-targeted. A single "active opportunities" figure could not have told those apart.
     */
    @Test
    @DisplayName("publiclyDiscoverableOpportunities excludes what B1.5 hides; opportunitiesByStatus does not")
    void theTwoOpportunityCountsMeanDifferentThings() {
        Staff root = superAdmin("b6-metrics-opp");
        Map<String, Object> before = statistics(root.token());
        long publishedBefore = statusCount(before, "opportunitiesByStatus", "PUBLISHED");
        long draftBefore = statusCount(before, "opportunitiesByStatus", "DRAFT");
        long cancelledBefore = statusCount(before, "opportunitiesByStatus", "CANCELLED");
        long discoverableBefore = scalar(before, "publiclyDiscoverableOpportunities");

        String recruiter = registerVerifiedAndLogin(emailPrefix("b6-metrics-rec"));
        UUID verifiedOrg = createVerifiedOrganization(recruiter, "B6 Metrics Verified Co");

        // 1. DRAFT — counted as DRAFT, never discoverable.
        createDraftOpportunity(recruiter, verifiedOrg, "PUBLIC", Map.of());

        // 2. PUBLISHED, PUBLIC, verified organization — the only genuinely discoverable one.
        UUID discoverable = createDraftOpportunity(recruiter, verifiedOrg, "PUBLIC", Map.of());
        publishOpportunity(recruiter, discoverable);

        // 3. PUBLISHED, UNIVERSITY_TARGETED, verified organization — published, never public.
        //    Publishing one requires naming a university, so the fixture builds a real target.
        UUID targeted = createDraftOpportunity(recruiter, verifiedOrg, "UNIVERSITY_TARGETED", Map.of());
        UUID targetUniversity = insertVerifiedUniversity(
                "B6 Metrics Target University " + UUID.randomUUID().toString().substring(0, 8));
        UUID targetDepartment = insertDepartment(targetUniversity, "Computer Science", "CS" + System.nanoTime() % 100000);
        addTarget(recruiter, targeted, targetUniversity, List.of(targetDepartment), 5);
        publishOpportunity(recruiter, targeted);

        // 4. CANCELLED — counted as CANCELLED, never discoverable.
        UUID cancelled = createDraftOpportunity(recruiter, verifiedOrg, "PUBLIC", Map.of());
        requireOk(authorizedPost("/api/v1/opportunities/" + cancelled + "/cancel", recruiter, null), "Cancel");

        // 5. PUBLISHED, PUBLIC, but the organization is suspended AFTER publishing — the B1.5 case.
        String otherRecruiter = registerVerifiedAndLogin(emailPrefix("b6-metrics-rec2"));
        UUID suspendedOrg = createVerifiedOrganization(otherRecruiter, "B6 Metrics Suspended Co");
        UUID hidden = createDraftOpportunity(otherRecruiter, suspendedOrg, "PUBLIC", Map.of());
        publishOpportunity(otherRecruiter, hidden);
        jdbcTemplate.update(
                "UPDATE organizations SET verification_status = 'SUSPENDED' WHERE id = ?", suspendedOrg);

        Map<String, Object> after = statistics(root.token());

        // Stored state: three of the five are PUBLISHED, and the suspension changed no row.
        assertThat(statusCount(after, "opportunitiesByStatus", "PUBLISHED") - publishedBefore)
                .as("PUBLISHED counts stored state, including listings nobody can see")
                .isEqualTo(3);
        assertThat(statusCount(after, "opportunitiesByStatus", "DRAFT") - draftBefore).isEqualTo(1);
        assertThat(statusCount(after, "opportunitiesByStatus", "CANCELLED") - cancelledBefore).isEqualTo(1);

        // Public reality: exactly one of those three can actually be found.
        assertThat(scalar(after, "publiclyDiscoverableOpportunities") - discoverableBefore)
                .as("targeted-only and suspended-organization listings are not discoverable")
                .isEqualTo(1);
    }

    /**
     * The metric must track suspension LIVE, with no opportunity row rewritten — the same property
     * Backend Phase B1.5 gave the public list. If the count were cached onto the opportunity, this
     * would not move.
     */
    @Test
    @DisplayName("Suspending and re-verifying an organization moves only the discoverable count")
    void suspensionMovesOnlyTheDiscoverableCount() {
        Staff root = superAdmin("b6-metrics-suspend");
        String recruiter = registerVerifiedAndLogin(emailPrefix("b6-metrics-suspend-rec"));
        UUID organizationId = createVerifiedOrganization(recruiter, "B6 Metrics Toggle Co");
        UUID opportunityId = createDraftOpportunity(recruiter, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiter, opportunityId);

        Map<String, Object> verified = statistics(root.token());

        jdbcTemplate.update("UPDATE organizations SET verification_status = 'SUSPENDED' WHERE id = ?", organizationId);
        Map<String, Object> suspended = statistics(root.token());

        assertThat(scalar(suspended, "publiclyDiscoverableOpportunities"))
                .isEqualTo(scalar(verified, "publiclyDiscoverableOpportunities") - 1);
        assertThat(statusCount(suspended, "opportunitiesByStatus", "PUBLISHED"))
                .as("stored state is untouched by suspension")
                .isEqualTo(statusCount(verified, "opportunitiesByStatus", "PUBLISHED"));

        jdbcTemplate.update("UPDATE organizations SET verification_status = 'VERIFIED' WHERE id = ?", organizationId);
        assertThat(scalar(statistics(root.token()), "publiclyDiscoverableOpportunities"))
                .as("re-verification restores it with no repair pass")
                .isEqualTo(scalar(verified, "publiclyDiscoverableOpportunities"));
    }

    /**
     * {@code studentProfiles} counts student profiles; {@code usersByStatus} counts EVERY account.
     * Creating a recruiter must move the second and not the first — which is the whole reason a raw
     * users-table count must never be labelled "students".
     */
    @Test
    @DisplayName("studentProfiles counts students; usersByStatus counts every account")
    void studentProfilesIsNotAUserCount() {
        Staff root = superAdmin("b6-metrics-students");
        Map<String, Object> before = statistics(root.token());
        long studentsBefore = scalar(before, "studentProfiles");
        long accountsBefore = totalOf(before, "usersByStatus");

        // A non-student account: an organization recruiter.
        registerVerifiedAndLogin(emailPrefix("b6-metrics-notastudent"));
        Map<String, Object> afterRecruiter = statistics(root.token());
        assertThat(scalar(afterRecruiter, "studentProfiles"))
                .as("a recruiter is not a student")
                .isEqualTo(studentsBefore);
        assertThat(totalOf(afterRecruiter, "usersByStatus"))
                .as("but it is an account")
                .isEqualTo(accountsBefore + 1);

        // A real student with a VERIFIED enrolment moves both, plus the enrolment breakdown.
        UUID universityId = insertVerifiedUniversity("B6 Metrics University " + UUID.randomUUID().toString().substring(0, 8));
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS" + System.nanoTime() % 100000);
        long verifiedEnrollmentsBefore =
                statusCount(afterRecruiter, "studentEnrollmentsByVerificationStatus", "VERIFIED");

        createStudent("b6-metrics-student", universityId, departmentId, "VERIFIED");

        Map<String, Object> afterStudent = statistics(root.token());
        assertThat(scalar(afterStudent, "studentProfiles")).isEqualTo(studentsBefore + 1);
        assertThat(statusCount(afterStudent, "studentEnrollmentsByVerificationStatus", "VERIFIED"))
                .isEqualTo(verifiedEnrollmentsBefore + 1);
    }

    /**
     * The enrolment breakdown keeps the review states apart. {@code SUBMITTED} is waiting on a
     * reviewer and {@code NEEDS_MORE_EVIDENCE} is waiting on the student — collapsing them into one
     * "pending" number would hide which queue the work is actually in.
     */
    @Test
    @DisplayName("The enrolment breakdown distinguishes the review states rather than collapsing them")
    void enrollmentStatesAreNotCollapsed() {
        Staff root = superAdmin("b6-metrics-enrol");
        UUID universityId = insertVerifiedUniversity("B6 Enrol University " + UUID.randomUUID().toString().substring(0, 8));
        UUID departmentId = insertDepartment(universityId, "Engineering", "EN" + System.nanoTime() % 100000);

        Map<String, Object> before = statistics(root.token());
        long draftBefore = statusCount(before, "studentEnrollmentsByVerificationStatus", "DRAFT");
        long verifiedBefore = statusCount(before, "studentEnrollmentsByVerificationStatus", "VERIFIED");

        createStudent("b6-enrol-draft", universityId, departmentId, "DRAFT");
        createStudent("b6-enrol-verified", universityId, departmentId, "VERIFIED");

        Map<String, Object> after = statistics(root.token());
        assertThat(statusCount(after, "studentEnrollmentsByVerificationStatus", "DRAFT")).isEqualTo(draftBefore + 1);
        assertThat(statusCount(after, "studentEnrollmentsByVerificationStatus", "VERIFIED"))
                .isEqualTo(verifiedBefore + 1);
    }

    /** Universities gain the breakdown organizations always had, counted the same way. */
    @Test
    @DisplayName("universitiesByVerificationStatus totals the same population as the universities scalar")
    void theUniversityBreakdownTotalsTheScalar() {
        Staff root = superAdmin("b6-metrics-uni");
        insertVerifiedUniversity("B6 Uni Metrics " + UUID.randomUUID().toString().substring(0, 8));

        Map<String, Object> statistics = statistics(root.token());

        assertThat(totalOf(statistics, "universitiesByVerificationStatus"))
                .as("the breakdown must partition the same rows the scalar counts")
                .isEqualTo(scalar(statistics, "universities"));
        assertThat(statusCount(statistics, "universitiesByVerificationStatus", "VERIFIED")).isPositive();
    }

    /** B6 added metrics to an existing Super-Admin-only endpoint; it did not widen who may read it. */
    @Test
    @DisplayName("The enriched statistics stay Super Admin only")
    void statisticsRemainSuperAdminOnly() {
        Staff officer = verificationOfficer("b6-metrics-officer");
        String student = registerVerifiedAndLogin(emailPrefix("b6-metrics-student-auth"));

        assertThat(authorizedGet("/api/v1/admin/statistics", officer.token()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(authorizedGet("/api/v1/admin/statistics", student).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(unauthenticatedGet("/api/v1/admin/statistics").getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /** Every B6 field is present and typed, so a client cannot receive a silently missing metric. */
    @Test
    @DisplayName("The statistics payload carries every B6 metric")
    void thePayloadCarriesEveryMetric() {
        Staff root = superAdmin("b6-metrics-shape");

        Map<String, Object> statistics = statistics(root.token());

        assertThat(statistics).containsKeys(
                "usersByStatus", "studentProfiles", "studentEnrollmentsByVerificationStatus",
                "universities", "universitiesByVerificationStatus", "organizationsByVerificationStatus",
                "opportunitiesByStatus", "publiclyDiscoverableOpportunities", "candidacies",
                "placementsByStatus", "openPrivacyRequests", "escalatedVerificationCases",
                "failedEmailDeliveries", "recentLoginFailures");
        assertThat(statistics.get("studentProfiles")).isInstanceOf(Number.class);
        assertThat(statistics.get("publiclyDiscoverableOpportunities")).isInstanceOf(Number.class);
        assertThat(statistics.get("universitiesByVerificationStatus")).isInstanceOf(Map.class);
        assertThat(statistics.get("studentEnrollmentsByVerificationStatus")).isInstanceOf(Map.class);
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> statistics(String token) {
        ResponseEntity<Map> response = authorizedGet("/api/v1/admin/statistics", token);
        requireOk(response, "Platform statistics");
        return response.getBody();
    }

    private long scalar(Map<String, Object> statistics, String key) {
        return ((Number) statistics.get(key)).longValue();
    }

    private long statusCount(Map<String, Object> statistics, String mapKey, String status) {
        Map<String, Object> counts = (Map<String, Object>) statistics.get(mapKey);
        Object value = counts.get(status);
        // GROUP BY emits no row for an empty group, so an absent key legitimately means zero.
        return value == null ? 0L : ((Number) value).longValue();
    }

    private long totalOf(Map<String, Object> statistics, String mapKey) {
        Map<String, Object> counts = (Map<String, Object>) statistics.get(mapKey);
        return counts.values().stream().mapToLong(value -> ((Number) value).longValue()).sum();
    }
}
