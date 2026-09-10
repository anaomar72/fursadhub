package com.fursadhub.candidacy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Who may read a student's PROFESSIONAL PROFILE, and who may not.
 *
 * <p>There is no public student directory and no "get any student" route: a professional profile is
 * only ever reachable through a workflow that already establishes a relationship — a candidacy owned
 * by the caller's organization, a verification case inside the caller's department scope, or a
 * nomination shortlist scoped the same way. These tests pin that shape so a future convenience
 * endpoint cannot quietly become a student directory.
 *
 * <p>Three things are deliberately kept apart and are asserted as separate concerns:
 *
 * <pre>
 *   professional profile   !=   application CV   !=   student-ID evidence
 * </pre>
 *
 * Seeing the first grants nothing about the other two.
 */
class StudentProfileAccessIT extends AbstractPhase4IT {

    private String coordinatorFor(UUID universityId, List<UUID> departmentIds) {
        String email = uniqueEmail("coordinator");
        registerVerifiedUser(email);
        insertUniversityMembership(universityId, userIdOf(email), "DEPARTMENT_COORDINATOR", departmentIds);
        return loginAndExtractAccessToken(email, "Password123");
    }

    private String universityAdminFor(UUID universityId) {
        String email = uniqueEmail("uniadmin");
        registerVerifiedUser(email);
        insertUniversityMembership(universityId, userIdOf(email), "UNIVERSITY_ADMIN", List.of());
        return loginAndExtractAccessToken(email, "Password123");
    }

    // ------------------------------------------------------------------ organization side

    @Test
    void recruiterSeesTheProfessionalProfileOfTheirOwnApplicant() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");
        UUID universityId = insertVerifiedUniversity("University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS" + shortId());
        StudentFixture student = createVerifiedStudent("applicant", universityId, departmentId);
        authorizedPut("/api/v1/students/me/profile", student.accessToken(), Map.of(
                "fullName", "Amina Hassan",
                "professional", Map.of("headline", "Final-year computer science student")));

        applicationWithCv("/api/v1/opportunities/" + published.opportunityId() + "/applications",
                student.accessToken(), Map.of());

        ResponseEntity<List> candidates = authorizedGetList(
                "/api/v1/opportunities/" + published.opportunityId() + "/candidacies", published.recruiterToken());
        assertThat(candidates.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(candidates.getBody()).hasSize(1);

        @SuppressWarnings("unchecked")
        String candidacyId = String.valueOf(((Map<String, Object>) candidates.getBody().get(0)).get("candidacyId"));

        ResponseEntity<Map> detail = authorizedGet("/api/v1/candidacies/" + candidacyId, published.recruiterToken());
        assertThat(detail.getStatusCode()).isEqualTo(HttpStatus.OK);

        // The recruiter reads their own applicant's professional presentation — the point of the
        // route. The response omits null fields, so the profile is written first and read back.
        @SuppressWarnings("unchecked")
        Map<String, Object> professional = (Map<String, Object>) detail.getBody().get("professional");
        assertThat(professional).isNotNull();
        assertThat(professional.get("headline")).isEqualTo("Final-year computer science student");
    }

    @Test
    void recruiterCannotReachACandidacyBelongingToAnotherOrganization() {
        PublishedOpportunity mine = publishPublicOpportunity("recruiter-a");
        PublishedOpportunity theirs = publishPublicOpportunity("recruiter-b");

        UUID universityId = insertVerifiedUniversity("University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS" + shortId());
        StudentFixture student = createVerifiedStudent("applicant", universityId, departmentId);
        applicationWithCv("/api/v1/opportunities/" + theirs.opportunityId() + "/applications",
                student.accessToken(), Map.of());

        ResponseEntity<List> theirCandidates = authorizedGetList(
                "/api/v1/opportunities/" + theirs.opportunityId() + "/candidacies", theirs.recruiterToken());
        @SuppressWarnings("unchecked")
        String candidacyId = String.valueOf(((Map<String, Object>) theirCandidates.getBody().get(0)).get("candidacyId"));

        // Organization A's recruiter, holding organization B's candidacy id.
        ResponseEntity<Map> detail = authorizedGet("/api/v1/candidacies/" + candidacyId, mine.recruiterToken());
        assertThat(detail.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(detail)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void recruiterCannotListCandidatesOfAnotherOrganizationsOpportunity() {
        PublishedOpportunity mine = publishPublicOpportunity("recruiter-a");
        PublishedOpportunity theirs = publishPublicOpportunity("recruiter-b");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/opportunities/" + theirs.opportunityId() + "/candidacies", mine.recruiterToken());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void organizationSupervisorIsNotACandidateReviewer() {
        PublishedOpportunity published = publishPublicOpportunity("recruiter");
        String supervisorEmail = uniqueEmail("orgsupervisor");
        registerVerifiedUser(supervisorEmail);
        insertOrganizationMembership(published.organizationId(), userIdOf(supervisorEmail), "ORGANIZATION_SUPERVISOR");
        String supervisorToken = loginAndExtractAccessToken(supervisorEmail, "Password123");

        // Supervising placements does not imply reading the recruitment pipeline, even in the
        // supervisor's OWN organization — CandidacyAuthorization excludes the role deliberately.
        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/opportunities/" + published.opportunityId() + "/candidacies", supervisorToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ------------------------------------------------------------------ university side

    @Test
    void coordinatorNominationShortlistContainsOnlyTheirOwnDepartment() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("University " + UUID.randomUUID());
        UUID csDepartmentId = insertDepartment(universityId, "Computer Science", "CS" + shortId());
        UUID baDepartmentId = insertDepartment(universityId, "Business", "BA" + shortId());

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "UNIVERSITY_TARGETED", Map.of());
        UUID targetId = addTarget(recruiterToken, opportunityId, universityId, List.of(csDepartmentId, baDepartmentId), 5);
        publishOpportunity(recruiterToken, opportunityId);

        StudentFixture csStudent = createVerifiedStudent("cs", universityId, csDepartmentId);
        StudentFixture baStudent = createVerifiedStudent("ba", universityId, baDepartmentId);

        String coordinatorToken = coordinatorFor(universityId, List.of(csDepartmentId));

        ResponseEntity<List> eligible = authorizedGetList(
                "/api/v1/universities/" + universityId + "/opportunity-requests/" + targetId + "/eligible-students",
                coordinatorToken);

        assertThat(eligible.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<String> ids = studentIds(eligible);
        assertThat(ids).contains(csStudent.userId().toString());
        // The business student is targeted by the opportunity but outside this coordinator's scope.
        assertThat(ids).doesNotContain(baStudent.userId().toString());
    }

    @Test
    void nominationShortlistCarriesTheProfessionalProfileSoNobodyNominatesFromANameAlone() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS" + shortId());

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "UNIVERSITY_TARGETED", Map.of());
        UUID targetId = addTarget(recruiterToken, opportunityId, universityId, List.of(departmentId), 5);
        publishOpportunity(recruiterToken, opportunityId);

        StudentFixture student = createVerifiedStudent("cs", universityId, departmentId);
        // The student writes their own professional profile, through their own endpoint.
        authorizedPut("/api/v1/students/me/profile", student.accessToken(), Map.of(
                "fullName", "Amina Hassan",
                "professional", Map.of(
                        "headline", "Final-year computer science student",
                        "skills", List.of("Java", "SQL"))));

        String coordinatorToken = coordinatorFor(universityId, List.of(departmentId));

        ResponseEntity<List> eligible = authorizedGetList(
                "/api/v1/universities/" + universityId + "/opportunity-requests/" + targetId + "/eligible-students",
                coordinatorToken);

        assertThat(eligible.getBody()).isNotEmpty();
        @SuppressWarnings("unchecked")
        Map<String, Object> row = (Map<String, Object>) eligible.getBody().get(0);

        // The nominator can read who they are putting forward, rather than choosing a name.
        @SuppressWarnings("unchecked")
        Map<String, Object> professional = (Map<String, Object>) row.get("professional");
        assertThat(professional).isNotNull();
        assertThat(professional.get("headline")).isEqualTo("Final-year computer science student");
        assertThat(professional.get("skills")).isEqualTo(List.of("Java", "SQL"));

        // What must NEVER ride along on a shortlist row: the profile is not a CV and not evidence.
        assertThat(row).doesNotContainKeys("cvStoredFileId", "evidenceStoredFileId", "hasEvidence", "cv");
    }

    @Test
    void coordinatorStudentListContainsOnlyTheirOwnDepartment() {
        UUID universityId = insertVerifiedUniversity("University " + UUID.randomUUID());
        UUID csDepartmentId = insertDepartment(universityId, "Computer Science", "CS" + shortId());
        UUID baDepartmentId = insertDepartment(universityId, "Business", "BA" + shortId());

        StudentFixture csStudent = createVerifiedStudent("cs", universityId, csDepartmentId);
        StudentFixture baStudent = createVerifiedStudent("ba", universityId, baDepartmentId);

        String coordinatorToken = coordinatorFor(universityId, List.of(csDepartmentId));

        ResponseEntity<List> students = authorizedGetList(
                "/api/v1/universities/" + universityId + "/students", coordinatorToken);

        assertThat(students.getStatusCode()).isEqualTo(HttpStatus.OK);
        String body = students.getBody().toString();
        assertThat(body).contains(csStudent.userId().toString());
        assertThat(body).doesNotContain(baStudent.userId().toString());
    }

    @Test
    void coordinatorCannotFilterTheStudentListIntoAnotherDepartment() {
        UUID universityId = insertVerifiedUniversity("University " + UUID.randomUUID());
        UUID csDepartmentId = insertDepartment(universityId, "Computer Science", "CS" + shortId());
        UUID baDepartmentId = insertDepartment(universityId, "Business", "BA" + shortId());
        createVerifiedStudent("ba", universityId, baDepartmentId);

        String coordinatorToken = coordinatorFor(universityId, List.of(csDepartmentId));

        // The bypass attempt: ask the list endpoint directly for a department outside the scope.
        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/universities/" + universityId + "/students?departmentId=" + baDepartmentId,
                coordinatorToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void universityAdminSeesTheWholeUniversityButNotAnotherUniversity() {
        UUID ownUniversityId = insertVerifiedUniversity("Own " + UUID.randomUUID());
        UUID csDepartmentId = insertDepartment(ownUniversityId, "Computer Science", "CS" + shortId());
        UUID baDepartmentId = insertDepartment(ownUniversityId, "Business", "BA" + shortId());
        StudentFixture csStudent = createVerifiedStudent("cs", ownUniversityId, csDepartmentId);
        StudentFixture baStudent = createVerifiedStudent("ba", ownUniversityId, baDepartmentId);

        UUID otherUniversityId = insertVerifiedUniversity("Other " + UUID.randomUUID());
        UUID otherDepartmentId = insertDepartment(otherUniversityId, "Engineering", "EN" + shortId());
        createVerifiedStudent("other", otherUniversityId, otherDepartmentId);

        String adminToken = universityAdminFor(ownUniversityId);

        ResponseEntity<List> own = authorizedGetList(
                "/api/v1/universities/" + ownUniversityId + "/students", adminToken);
        assertThat(own.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(own.getBody().toString())
                .contains(csStudent.userId().toString())
                .contains(baStudent.userId().toString());

        // Same admin, another university's id in the path.
        ResponseEntity<Map> foreign = authorizedGet(
                "/api/v1/universities/" + otherUniversityId + "/students", adminToken);
        assertThat(foreign.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void universitySupervisorIsNotAStudentDirectoryReader() {
        UUID universityId = insertVerifiedUniversity("University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS" + shortId());
        createVerifiedStudent("cs", universityId, departmentId);

        String supervisorEmail = uniqueEmail("unisupervisor");
        registerVerifiedUser(supervisorEmail);
        insertUniversityMembership(universityId, userIdOf(supervisorEmail), "UNIVERSITY_SUPERVISOR", List.of());
        String supervisorToken = loginAndExtractAccessToken(supervisorEmail, "Password123");

        // Belonging to the university is not a reason to read every student in it: supervisor scope
        // is assigned placements (CLAUDE.md section 25), and this pass does not widen it.
        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/universities/" + universityId + "/students", supervisorToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    @SuppressWarnings("unchecked")
    private static List<String> studentIds(ResponseEntity<List> response) {
        return ((List<Map<String, Object>>) response.getBody()).stream()
                .map(row -> String.valueOf(row.get("studentUserId")))
                .toList();
    }
}
