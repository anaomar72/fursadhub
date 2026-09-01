package com.fursadhub.university;

import com.fursadhub.identity.AbstractIdentityIT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 2 mandatory authorization/security tests (CLAUDE.md section 60 / phase spec section):
 * university isolation, department-scope isolation for coordinators, supervisor scope, duplicate
 * university/student-number rejection, and verification-challenge expiry/replay protection.
 *
 * <p>Reuses {@link AbstractIdentityIT}'s Testcontainers PostgreSQL instance (static field shared
 * across every subclass in the JVM) rather than starting a second container.
 */
class UniversityVerificationAuthorizationIT extends AbstractIdentityIT {

    /**
     * Phase 8 removed the seeded pilot tenant — every test gets its own fresh, already-VERIFIED
     * university and two departments instead of sharing one Flyway-seeded row.
     */
    private UUID defaultUniversityId;
    private UUID csDepartmentId;
    private UUID baDepartmentId;

    @BeforeEach
    void setUpDefaultUniversity() {
        defaultUniversityId = insertVerifiedUniversity("Test University " + UUID.randomUUID());
        csDepartmentId = insertDepartment(defaultUniversityId, "Computer Science", "CS");
        baDepartmentId = insertDepartment(defaultUniversityId, "Business Administration", "BA");
    }

    @Test
    void universityAdminCannotReadAnotherUniversitysStaff() {
        UUID universityB = insertVerifiedUniversity("University B " + UUID.randomUUID());

        String adminEmail = uniqueEmail("uni-a-admin");
        register(adminEmail, "Password123");
        UUID adminId = userIdOf(adminEmail);
        insertMembership(defaultUniversityId, adminId, "UNIVERSITY_ADMIN");
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");

        ResponseEntity<Map> response = authorizedGet("/api/v1/universities/" + universityB + "/staff", adminToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void csCoordinatorCannotListBusinessStudents() {
        String coordinatorEmail = uniqueEmail("cs-coordinator");
        register(coordinatorEmail, "Password123");
        UUID coordinatorId = userIdOf(coordinatorEmail);
        UUID membershipId = insertMembership(defaultUniversityId, coordinatorId, "DEPARTMENT_COORDINATOR");
        insertMembershipDepartment(membershipId, csDepartmentId);
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/universities/" + defaultUniversityId + "/students?departmentId=" + baDepartmentId, coordinatorToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void coordinatorCannotReviewCaseOutsideAssignedDepartment() {
        String studentEmail = uniqueEmail("ba-student");
        register(studentEmail, "Password123");
        String studentToken = loginAndExtractAccessToken(studentEmail, "Password123");
        claimAndSubmit(studentToken, baDepartmentId, "BA-" + UUID.randomUUID().toString().substring(0, 8));
        UUID caseId = caseIdForEnrollmentOwnedBy(studentEmail);

        String coordinatorEmail = uniqueEmail("cs-only-coordinator");
        register(coordinatorEmail, "Password123");
        UUID coordinatorId = userIdOf(coordinatorEmail);
        UUID membershipId = insertMembership(defaultUniversityId, coordinatorId, "DEPARTMENT_COORDINATOR");
        insertMembershipDepartment(membershipId, csDepartmentId);
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + defaultUniversityId + "/verification-cases/" + caseId + "/begin-review",
                coordinatorToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void universitySupervisorCannotAccessVerificationQueue() {
        String supervisorEmail = uniqueEmail("supervisor");
        register(supervisorEmail, "Password123");
        UUID supervisorId = userIdOf(supervisorEmail);
        UUID membershipId = insertMembership(defaultUniversityId, supervisorId, "UNIVERSITY_SUPERVISOR");
        insertMembershipDepartment(membershipId, csDepartmentId);
        String supervisorToken = loginAndExtractAccessToken(supervisorEmail, "Password123");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/universities/" + defaultUniversityId + "/verification-cases", supervisorToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void duplicateStudentNumberAtSameUniversityIsBlocked() {
        String sharedNumber = "DUP-" + UUID.randomUUID().toString().substring(0, 8);

        String firstEmail = uniqueEmail("dup-first");
        register(firstEmail, "Password123");
        String firstToken = loginAndExtractAccessToken(firstEmail, "Password123");
        ResponseEntity<Map> first = authorizedPost("/api/v1/students/me/enrollment", firstToken,
                Map.of("universityId", defaultUniversityId.toString(), "departmentId", csDepartmentId.toString(),
                        "studentNumber", sharedNumber, "program", "BSc Computer Science", "academicYear", "2025/2026"));
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        String secondEmail = uniqueEmail("dup-second");
        register(secondEmail, "Password123");
        String secondToken = loginAndExtractAccessToken(secondEmail, "Password123");
        ResponseEntity<Map> second = authorizedPost("/api/v1/students/me/enrollment", secondToken,
                Map.of("universityId", defaultUniversityId.toString(), "departmentId", baDepartmentId.toString(),
                        "studentNumber", sharedNumber, "program", "BBA", "academicYear", "2025/2026"));

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(second.getBody().get("code")).isEqualTo("STUDENT_NUMBER_ALREADY_REGISTERED");
    }

    @Test
    void expiredChallengeIsRejected() {
        String studentEmail = uniqueEmail("expired-challenge-student");
        register(studentEmail, "Password123");
        String studentToken = loginAndExtractAccessToken(studentEmail, "Password123");
        claimAndSubmit(studentToken, csDepartmentId, "EXP-" + UUID.randomUUID().toString().substring(0, 8));
        UUID caseId = caseIdForEnrollmentOwnedBy(studentEmail);

        ResponseEntity<Map> issued = authorizedPost("/api/v1/students/me/verification/challenges", studentToken, null);
        assertThat(issued.getStatusCode()).isEqualTo(HttpStatus.OK);
        String code = (String) issued.getBody().get("code");
        expireVerificationChallenge(caseId, code);

        String adminToken = provisionUniversityAdmin();
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + defaultUniversityId + "/verification-cases/" + caseId + "/consume-challenge",
                adminToken, Map.of("code", code));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VERIFICATION_CHALLENGE_EXPIRED");
    }

    @Test
    void consumedChallengeCannotBeReplayed() {
        String studentEmail = uniqueEmail("replay-challenge-student");
        register(studentEmail, "Password123");
        String studentToken = loginAndExtractAccessToken(studentEmail, "Password123");
        claimAndSubmit(studentToken, csDepartmentId, "REPLAY-" + UUID.randomUUID().toString().substring(0, 8));
        UUID caseId = caseIdForEnrollmentOwnedBy(studentEmail);

        ResponseEntity<Map> issued = authorizedPost("/api/v1/students/me/verification/challenges", studentToken, null);
        String code = (String) issued.getBody().get("code");

        String adminToken = provisionUniversityAdmin();
        ResponseEntity<Map> firstConsume = authorizedPost(
                "/api/v1/universities/" + defaultUniversityId + "/verification-cases/" + caseId + "/consume-challenge",
                adminToken, Map.of("code", code));
        assertThat(firstConsume.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> replay = authorizedPost(
                "/api/v1/universities/" + defaultUniversityId + "/verification-cases/" + caseId + "/consume-challenge",
                adminToken, Map.of("code", code));

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(replay.getBody().get("code")).isEqualTo("VERIFICATION_CHALLENGE_INVALID");
    }

    @Test
    void verifiedCaseCannotBeVerifiedAgain() {
        String studentEmail = uniqueEmail("already-resolved-student");
        register(studentEmail, "Password123");
        String studentToken = loginAndExtractAccessToken(studentEmail, "Password123");
        claimAndSubmit(studentToken, csDepartmentId, "RESOLVED-" + UUID.randomUUID().toString().substring(0, 8));
        UUID caseId = caseIdForEnrollmentOwnedBy(studentEmail);

        String adminToken = provisionUniversityAdmin();
        ResponseEntity<Map> firstVerify = authorizedPost(
                "/api/v1/universities/" + defaultUniversityId + "/verification-cases/" + caseId + "/verify", adminToken, null);
        assertThat(firstVerify.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> secondVerify = authorizedPost(
                "/api/v1/universities/" + defaultUniversityId + "/verification-cases/" + caseId + "/verify", adminToken, null);

        assertThat(secondVerify.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(secondVerify.getBody().get("code")).isEqualTo("VERIFICATION_CASE_ALREADY_RESOLVED");
    }

    // --- helpers ---

    private String provisionUniversityAdmin() {
        String email = uniqueEmail("admin");
        register(email, "Password123");
        UUID adminId = userIdOf(email);
        insertMembership(defaultUniversityId, adminId, "UNIVERSITY_ADMIN");
        return loginAndExtractAccessToken(email, "Password123");
    }

    private void claimAndSubmit(String studentToken, UUID departmentId, String studentNumber) {
        ResponseEntity<Map> claim = authorizedPost("/api/v1/students/me/enrollment", studentToken,
                Map.of("universityId", defaultUniversityId.toString(), "departmentId", departmentId.toString(),
                        "studentNumber", studentNumber, "program", "Programme", "academicYear", "2025/2026"));
        if (claim.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Enrollment claim failed: " + claim.getBody());
        }
        ResponseEntity<Map> submit = authorizedPost("/api/v1/students/me/enrollment/submit-verification", studentToken, null);
        if (submit.getStatusCode() != HttpStatus.OK) {
            throw new IllegalStateException("Verification submit failed: " + submit.getBody());
        }
    }

    private UUID caseIdForEnrollmentOwnedBy(String studentEmail) {
        UUID studentUserId = userIdOf(studentEmail);
        String caseId = jdbcTemplate.queryForObject(
                "SELECT c.id FROM student_verification_cases c JOIN student_enrollments e ON e.id = c.enrollment_id WHERE e.student_user_id = ?",
                String.class, studentUserId);
        return UUID.fromString(caseId);
    }

    private void expireVerificationChallenge(UUID caseId, String rawCode) {
        jdbcTemplate.update(
                "UPDATE verification_challenges SET expires_at = now() - interval '1 second' WHERE verification_case_id = ? AND code_hash = ?",
                caseId, tokenGenerator.hash(rawCode));
    }

    private UUID userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    private UUID insertMembership(UUID universityId, UUID userId, String role) {
        UUID membershipId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO university_memberships (id, university_id, user_id, role, assigned_at) VALUES (?, ?, ?, ?, now())",
                membershipId, universityId, userId, role);
        return membershipId;
    }

    private void insertMembershipDepartment(UUID membershipId, UUID departmentId) {
        jdbcTemplate.update(
                "INSERT INTO university_membership_departments (id, membership_id, department_id, assigned_at) VALUES (?, ?, ?, now())",
                UUID.randomUUID(), membershipId, departmentId);
    }

    private UUID insertVerifiedUniversity(String name) {
        UUID universityId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO universities (id, name, slug, city, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'VERIFIED', now(), now())",
                universityId, name, "univ-" + universityId, "Testville");
        return universityId;
    }

    private UUID insertDepartment(UUID universityId, String name, String code) {
        UUID departmentId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO departments (id, university_id, name, code, created_at) VALUES (?, ?, ?, ?, now())",
                departmentId, universityId, name, code);
        return departmentId;
    }

    private ResponseEntity<Map> authorizedGet(String path, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url(path), HttpMethod.GET, new HttpEntity<>(headers), Map.class);
    }

    private ResponseEntity<Map> authorizedPost(String path, String accessToken, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }
}
