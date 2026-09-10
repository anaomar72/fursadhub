package com.fursadhub.candidacy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Public self-application rules (CLAUDE.md Phase 4 section 3) and the mandatory security cases from
 * Phase 4 section 29.
 */
class SelfApplicationIT extends AbstractPhase4IT {

    @Test
    void verifiedStudentCanApplyToPublishedPublicOpportunity() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);

        ResponseEntity<Map> response = applicationWithCv(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications", student.accessToken(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("source")).isEqualTo("SELF_APPLICATION");
        assertThat(response.getBody().get("status")).isEqualTo("SUBMITTED");
        assertThat(countCandidacies(published.opportunityId(), student.userId())).isEqualTo(1);
    }

    /**
     * Regression, found in live QA against real data: the student PROFILE is optional.
     * {@code StudentEnrollmentService} never creates or requires one, so a student can enrol and
     * reach VERIFIED without ever filling it in — 4 of the 8 enrolled students in the local
     * database were in exactly that state.
     *
     * <p>{@code StudentMarketplaceAccess} originally proved student-ness from the profile alone, so
     * such a student was refused with {@code STUDENT_ACTION_REQUIRED} — "Only students can apply for
     * or save internships" — told to a verified student, blocking the product's primary outcome.
     *
     * <p>The rest of the suite could not catch this: {@code createStudent} always calls
     * {@code PUT /students/me/profile}, so every fixture student has a profile. This test builds the
     * real-world shape deliberately and must not adopt that helper.
     */
    @Test
    void verifiedStudentWithoutAProfileCanStillApply() {
        PublishedOpportunity published = publishPublicOpportunity("noprofile-recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        // Deliberately NOT createVerifiedStudent(): no profile is ever created for this account.
        String email = uniqueEmail("noprofile-student");
        registerVerifiedUser(email);
        String accessToken = loginAndExtractAccessToken(email, "Password123");
        UUID userId = userIdOf(email);
        jdbcTemplate.update(
                "INSERT INTO student_enrollments (id, student_user_id, university_id, department_id, student_number, "
                        + "program, academic_year, verification_status, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', now(), now())",
                UUID.randomUUID(), userId, universityId, departmentId,
                "SN-" + UUID.randomUUID().toString().substring(0, 8), "Computer Science", "2026");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM student_profiles WHERE user_id = ?", Integer.class, userId)).isZero();

        ResponseEntity<Map> response = applicationWithCv(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications", accessToken, Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(countCandidacies(published.opportunityId(), userId)).isEqualTo(1);
    }

    @Test
    void unverifiedStudentCannotApply() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createStudent("unverified", universityId, departmentId, "SUBMITTED");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications", student.accessToken(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("STUDENT_NOT_VERIFIED");
        assertThat(countCandidacies(published.opportunityId(), student.userId())).isZero();
    }

    @Test
    void studentWithoutEnrollmentCannotApply() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");
        String token = registerVerifiedAndLogin("no-enrollment");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications", token, Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("STUDENT_ACTION_REQUIRED");
    }

    @Test
    void targetedOnlyOpportunityRejectsSelfApplication() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "UNIVERSITY_TARGETED", Map.of());
        addTarget(recruiterToken, opportunityId, universityId, List.of(departmentId), 5);
        publishOpportunity(recruiterToken, opportunityId);

        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/applications", student.accessToken(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("OPPORTUNITY_NOT_PUBLIC");
        assertThat(countCandidacies(opportunityId, student.userId())).isZero();
    }

    @Test
    void unpublishedOpportunityCannotReceiveApplication() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/applications", student.accessToken(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("OPPORTUNITY_NOT_PUBLISHED");
    }

    @Test
    void applicationDeadlineIsEnforced() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiterToken, opportunityId);

        // Push the deadline into the past directly: the Phase 3 API rightly refuses to create an
        // opportunity whose deadline has already lapsed, so this simulates the passage of time.
        jdbcTemplate.update(
                "UPDATE internship_opportunities SET application_deadline = ? WHERE id = ?",
                today().minusDays(1), opportunityId);

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + opportunityId + "/applications", student.accessToken(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("OPPORTUNITY_DEADLINE_PASSED");
    }

    @Test
    void repeatedSelfApplicationDoesNotCreateDuplicateCandidacy() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);

        String path = "/api/v1/opportunities/" + published.opportunityId() + "/applications";
        assertThat(applicationWithCv(path, student.accessToken(), Map.of()).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<Map> second = applicationWithCv(path, student.accessToken(), Map.of());

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(second)).isEqualTo("STUDENT_ALREADY_APPLIED");
        assertThat(countCandidacies(published.opportunityId(), student.userId())).isEqualTo(1);
    }

    @Test
    void unauthenticatedCallerCannotApply() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");

        ResponseEntity<Map> response = unauthenticatedPost(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications", Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /**
     * There is no request field through which a caller could name a different student — the applicant
     * is taken solely from the JWT. Sending a foreign studentId must not change who applied.
     */
    @Test
    void studentIdInBodyIsIgnoredAndCannotApplyForAnotherStudent() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        StudentFixture attacker = createVerifiedStudent("attacker", universityId, departmentId);
        StudentFixture victim = createVerifiedStudent("victim", universityId, departmentId);

        ResponseEntity<Map> response = applicationWithCv(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications",
                attacker.accessToken(),
                Map.of("studentId", victim.userId().toString(), "studentUserId", victim.userId().toString()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(countCandidacies(published.opportunityId(), attacker.userId())).isEqualTo(1);
        assertThat(countCandidacies(published.opportunityId(), victim.userId())).isZero();
    }

    @Test
    void studentWithLivePlacementIsNotAvailableToApply() {
        PublishedOpportunity first = publishPublicOpportunity("recruiter-a");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);

        // Take the student all the way to an accepted offer, which creates a live placement.
        applicationWithCv("/api/v1/opportunities/" + first.opportunityId() + "/applications", student.accessToken(), Map.of());
        UUID candidacyId = onlyCandidacyId(first.opportunityId(), student.userId());
        UUID offerId = sendOffer(first.recruiterToken(), candidacyId);
        authorizedPost("/api/v1/offers/" + offerId + "/accept", student.accessToken(), null);

        PublishedOpportunity second = publishPublicOpportunity("recruiter-b");
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/opportunities/" + second.opportunityId() + "/applications", student.accessToken(), Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("STUDENT_NOT_AVAILABLE");
    }

    private UUID onlyCandidacyId(UUID opportunityId, UUID studentUserId) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM candidacies WHERE opportunity_id = ? AND student_user_id = ?",
                UUID.class, opportunityId, studentUserId);
    }

    private UUID sendOffer(String recruiterToken, UUID candidacyId) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/candidacies/" + candidacyId + "/offer", recruiterToken,
                Map.of(
                        "startDate", LocalDate.now().plusMonths(2).toString(),
                        "endDate", LocalDate.now().plusMonths(5).toString(),
                        "responseDeadline", LocalDate.now().plusWeeks(2).toString(),
                        "location", "Mogadishu"));
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Offer creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }
}
