package com.fursadhub.candidacy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B1.5 — an organization that is not currently {@code VERIFIED} cannot acquire NEW
 * candidates, through any intake path.
 *
 * <p>Three paths create or merge a candidacy, and all three are gated: student self-application,
 * university nomination, and the student's consent to a nomination (which is the moment the
 * candidacy is actually created).
 *
 * <p>Equally important, and tested here: losing verification blocks NEW intake and NOTHING ELSE.
 * Candidacies, offers and placements that already exist stay readable and manageable.
 */
class OrganizationVerificationIntakeIT extends AbstractPhase4IT {

    // ---------------------------------------------------------------- self-application

    @Test
    void studentCanApplyToAVerifiedOrganization() {
        PublishedOpportunity published = publishPublicOpportunity("b15-apply-ok-rec");
        UUID universityId = insertVerifiedUniversity("Apply OK University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("b15-apply-ok-stu", universityId, departmentId);

        ResponseEntity<Map> response = apply(student, published.opportunityId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(countCandidacies(published.opportunityId(), student.userId())).isEqualTo(1);
    }

    @Test
    void studentCannotApplyOnceTheOrganizationIsSuspended() {
        PublishedOpportunity published = publishPublicOpportunity("b15-apply-no-rec");
        UUID universityId = insertVerifiedUniversity("Apply Blocked University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("b15-apply-no-stu", universityId, departmentId);

        setOrganizationVerificationStatus(published.organizationId(), "SUSPENDED");

        ResponseEntity<Map> response = apply(student, published.opportunityId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("ORGANIZATION_NOT_VERIFIED");
        assertThat(countCandidacies(published.opportunityId(), student.userId())).isZero();
    }

    @Test
    void everyNonVerifiedStatusBlocksNewApplications() {
        PublishedOpportunity published = publishPublicOpportunity("b15-apply-states-rec");
        UUID universityId = insertVerifiedUniversity("Apply States University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        for (String status : List.of("SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES", "REJECTED", "SUSPENDED", "REVOKED")) {
            setOrganizationVerificationStatus(published.organizationId(), status);
            StudentFixture student = createVerifiedStudent("b15-as-" + status.substring(0, 3).toLowerCase(), universityId, departmentId);

            assertThat(errorCode(apply(student, published.opportunityId())))
                    .as("a %s organization must not receive a new application", status)
                    .isEqualTo("ORGANIZATION_NOT_VERIFIED");
        }
    }

    /**
     * The new gate must not have displaced any existing rule. An unverified STUDENT applying to a
     * verified organization still fails on their own enrollment, exactly as before.
     */
    @Test
    void studentVerificationAndEnrollmentRulesAreUnchanged() {
        PublishedOpportunity published = publishPublicOpportunity("b15-apply-stu-rules");
        UUID universityId = insertVerifiedUniversity("Student Rules University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture unverified = createStudent("b15-apply-unver", universityId, departmentId, "SUBMITTED");

        assertThat(errorCode(apply(unverified, published.opportunityId()))).isEqualTo("STUDENT_NOT_VERIFIED");
    }

    /** Duplicate-application behaviour is unchanged. */
    @Test
    void duplicateApplicationBehaviourIsUnchanged() {
        PublishedOpportunity published = publishPublicOpportunity("b15-apply-dup-rec");
        UUID universityId = insertVerifiedUniversity("Duplicate University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("b15-apply-dup-stu", universityId, departmentId);

        assertThat(apply(student, published.opportunityId()).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        assertThat(errorCode(apply(student, published.opportunityId()))).isEqualTo("STUDENT_ALREADY_APPLIED");
        assertThat(countCandidacies(published.opportunityId(), student.userId())).isEqualTo(1);
    }

    // ---------------------------------------------------------------- nomination

    @Test
    void universityCannotNominateIntoASuspendedOrganization() {
        NominationFixture fixture = nominationFixture("b15-nom-no");

        setOrganizationVerificationStatus(fixture.organizationId(), "SUSPENDED");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + fixture.universityId() + "/nominations", fixture.staffToken(),
                Map.of("opportunityId", fixture.opportunityId().toString(),
                        "studentUserId", fixture.student().userId().toString()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("ORGANIZATION_NOT_VERIFIED");
    }

    @Test
    void universityCanNominateIntoAVerifiedOrganization() {
        NominationFixture fixture = nominationFixture("b15-nom-ok");

        ResponseEntity<Map> response = nominate(fixture);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    /**
     * The suspension may land between nomination and consent, so consent carries the gate in its own
     * right — it is the moment the candidacy is created and the organization first sees the student.
     */
    @Test
    void studentCannotConsentOnceTheOrganizationIsSuspended() {
        NominationFixture fixture = nominationFixture("b15-consent-no");
        ResponseEntity<Map> nomination = nominate(fixture);
        assertThat(nomination.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID nominationId = UUID.fromString((String) nomination.getBody().get("id"));

        setOrganizationVerificationStatus(fixture.organizationId(), "SUSPENDED");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/accept", fixture.student().accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("ORGANIZATION_NOT_VERIFIED");
        assertThat(countCandidacies(fixture.opportunityId(), fixture.student().userId())).isZero();
    }

    /** Declining is not intake, so it stays available — the student must not be trapped. */
    @Test
    void studentCanStillDeclineWhenTheOrganizationIsSuspended() {
        NominationFixture fixture = nominationFixture("b15-decline");
        UUID nominationId = UUID.fromString((String) nominate(fixture).getBody().get("id"));

        setOrganizationVerificationStatus(fixture.organizationId(), "SUSPENDED");

        assertThat(authorizedPost("/api/v1/nominations/" + nominationId + "/decline",
                fixture.student().accessToken(), null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    /** The university's nomination queue hides the opportunity, so the list agrees with the write. */
    @Test
    void suspendedOrganizationLeavesTheUniversityNominationQueue() {
        NominationFixture fixture = nominationFixture("b15-queue");

        ResponseEntity<List> before = authorizedGetList(
                "/api/v1/universities/" + fixture.universityId() + "/opportunity-requests", fixture.staffToken());
        assertThat(before.getBody()).isNotEmpty();

        setOrganizationVerificationStatus(fixture.organizationId(), "SUSPENDED");

        ResponseEntity<List> after = authorizedGetList(
                "/api/v1/universities/" + fixture.universityId() + "/opportunity-requests", fixture.staffToken());
        assertThat(after.getBody()).isEmpty();
    }

    // ---------------------------------------------------------------- history is preserved

    /**
     * Suspension blocks NEW intake and nothing else. An existing candidacy is not deleted, not
     * rejected, and stays readable by both the student and the organization — and the opportunity
     * row itself is never transitioned (CLAUDE.md sections 33, 51).
     */
    @Test
    void existingCandidaciesSurviveTheOrganizationLosingVerification() {
        PublishedOpportunity published = publishPublicOpportunity("b15-history-rec");
        UUID universityId = insertVerifiedUniversity("History University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("b15-history-stu", universityId, departmentId);

        ResponseEntity<Map> application = apply(student, published.opportunityId());
        assertThat(application.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID candidacyId = UUID.fromString((String) application.getBody().get("id"));

        setOrganizationVerificationStatus(published.organizationId(), "SUSPENDED");

        // Not deleted, not silently transitioned.
        assertThat(countCandidacies(published.opportunityId(), student.userId())).isEqualTo(1);
        assertThat(candidacyStatusOf(candidacyId)).isEqualTo("SUBMITTED");
        assertThat(opportunityStatusOf(published.opportunityId())).isEqualTo("PUBLISHED");

        // Still readable by the student...
        assertThat(authorizedGet("/api/v1/students/me/candidacies/" + candidacyId, student.accessToken()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        // ...and still readable by the organization.
        assertThat(authorizedGet("/api/v1/candidacies/" + candidacyId, published.recruiterToken()).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    // ---------------------------------------------------------------- helpers

    private ResponseEntity<Map> apply(StudentFixture student, UUID opportunityId) {
        return authorizedPost("/api/v1/opportunities/" + opportunityId + "/applications",
                student.accessToken(), Map.of("answers", List.of()));
    }

    private ResponseEntity<Map> nominate(NominationFixture fixture) {
        return authorizedPost(
                "/api/v1/universities/" + fixture.universityId() + "/nominations", fixture.staffToken(),
                Map.of("opportunityId", fixture.opportunityId().toString(),
                        "studentUserId", fixture.student().userId().toString()));
    }

    /** A published HYBRID opportunity targeting a university, with staff and a nominatable student. */
    private NominationFixture nominationFixture(String prefix) {
        String recruiterToken = registerVerifiedAndLogin(prefix + "-rec");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());

        UUID universityId = insertVerifiedUniversity("Nomination University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "HYBRID", Map.of());
        addTarget(recruiterToken, opportunityId, universityId, List.of(departmentId), 5);
        publishOpportunity(recruiterToken, opportunityId);

        String staffEmail = uniqueEmail(prefix + "-staff");
        registerVerifiedUser(staffEmail);
        String staffToken = loginAndExtractAccessToken(staffEmail, "Password123");
        insertUniversityMembership(universityId, userIdOf(staffEmail), "UNIVERSITY_ADMIN", List.of());

        StudentFixture student = createVerifiedStudent(prefix + "-stu", universityId, departmentId);

        return new NominationFixture(organizationId, universityId, opportunityId, staffToken, student);
    }

    private record NominationFixture(
            UUID organizationId, UUID universityId, UUID opportunityId, String staffToken, StudentFixture student) {
    }

    private String candidacyStatusOf(UUID candidacyId) {
        return jdbcTemplate.queryForObject("SELECT status FROM candidacies WHERE id = ?", String.class, candidacyId);
    }

    private String opportunityStatusOf(UUID opportunityId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM internship_opportunities WHERE id = ?", String.class, opportunityId);
    }

    private void setOrganizationVerificationStatus(UUID organizationId, String status) {
        jdbcTemplate.update("UPDATE organizations SET verification_status = ? WHERE id = ?", status, organizationId);
    }
}
