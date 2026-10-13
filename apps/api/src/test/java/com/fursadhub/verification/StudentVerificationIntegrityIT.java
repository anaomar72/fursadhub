package com.fursadhub.verification;

import com.fursadhub.identity.AbstractIdentityIT;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integrity of student enrollment verification (Phase B, audit finding F-02):
 *
 * <ul>
 *   <li>only a VERIFIED university can make a student VERIFIED — a self-registered, suspended,
 *       rejected or revoked university can record and review a claim but never approve it;</li>
 *   <li>nobody acts on the verification of their own enrollment, whether as university staff or as
 *       a platform officer resolving an escalation.</li>
 * </ul>
 *
 * <p>Before these rules, any account could register a university, claim an enrollment there and
 * approve it as that university's admin, producing a "verified student" eligible for real
 * internships without the platform ever attesting to the institution.
 */
class StudentVerificationIntegrityIT extends AbstractIdentityIT {

    @Test
    void verifiedUniversityApprovesAnUnrelatedStudent() {
        University university = university("VERIFIED");
        Student student = claimedAndSubmittedStudent(university, "unrelated-student");
        String adminToken = staff(university, "UNIVERSITY_ADMIN");

        ResponseEntity<Map> response = post(casePath(university, student, "verify"), adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(enrollmentStatus(student)).isEqualTo("VERIFIED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES", "REJECTED", "SUSPENDED", "REVOKED"})
    void universityThatIsNotVerifiedCannotApproveStudents(String universityStatus) {
        University university = university(universityStatus);
        // The claim is still recorded as pending (D-2): claiming and submitting both succeed.
        Student student = claimedAndSubmittedStudent(university, "pending-at-" + universityStatus.toLowerCase());
        String adminToken = staff(university, "UNIVERSITY_ADMIN");
        assertThat(post(casePath(university, student, "begin-review"), adminToken, null).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> response = post(casePath(university, student, "verify"), adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("UNIVERSITY_NOT_VERIFIED");
        assertThat(enrollmentStatus(student)).isEqualTo("UNDER_REVIEW");
    }

    /** The full loophole: register a university, enrol there yourself, approve yourself. */
    @Test
    void selfRegisteredUniversityFounderCannotVerifyTheirOwnEnrollment() {
        String email = uniqueEmail("self-founder");
        registerAndVerify(email, "Password123");
        String token = loginAndExtractAccessToken(email, "Password123");

        ResponseEntity<Map> created = post("/api/v1/universities", token,
                Map.of("name", "Self Made University " + UUID.randomUUID(), "city", "Mogadishu"));
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID universityId = UUID.fromString((String) created.getBody().get("id"));
        ResponseEntity<Map> department = post("/api/v1/universities/" + universityId + "/departments", token,
                Map.of("name", "Computer Science", "code", "CS"));
        assertThat(department.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        University university = new University(universityId, UUID.fromString((String) department.getBody().get("id")));

        Student self = claimAndSubmit(new Student(email, userIdOf(email), token), university);

        ResponseEntity<Map> response = post(casePath(university, self, "verify"), token, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("VERIFICATION_SELF_REVIEW_FORBIDDEN");
        assertThat(enrollmentStatus(self)).isEqualTo("SUBMITTED");
    }

    @Test
    void staffMemberCannotReviewTheirOwnEnrollmentEvenAtAVerifiedUniversity() {
        University university = university("VERIFIED");
        Student staffStudent = claimedAndSubmittedStudent(university, "staff-student");
        insertMembership(university.id(), staffStudent.userId(), "UNIVERSITY_ADMIN");

        for (String action : new String[] {"begin-review", "verify"}) {
            ResponseEntity<Map> response = post(casePath(university, staffStudent, action), staffStudent.token(), null);
            assertThat(response.getStatusCode()).as(action).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(response.getBody().get("code")).as(action).isEqualTo("VERIFICATION_SELF_REVIEW_FORBIDDEN");
        }
        ResponseEntity<Map> reject = post(casePath(university, staffStudent, "reject"), staffStudent.token(),
                Map.of("notes", "Rejecting my own case"));
        assertThat(reject.getBody().get("code")).isEqualTo("VERIFICATION_SELF_REVIEW_FORBIDDEN");
        assertThat(enrollmentStatus(staffStudent)).isEqualTo("SUBMITTED");

        // A colleague can still review it normally.
        String colleagueToken = staff(university, "UNIVERSITY_ADMIN");
        assertThat(post(casePath(university, staffStudent, "verify"), colleagueToken, null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void staffMemberCannotConsumeTheirOwnAccountBindingChallenge() {
        University university = university("VERIFIED");
        Student staffStudent = claimedAndSubmittedStudent(university, "self-binding");
        insertMembership(university.id(), staffStudent.userId(), "UNIVERSITY_ADMIN");
        // The case must be under review for the student to issue a challenge; a colleague starts it.
        post(casePath(university, staffStudent, "begin-review"), staff(university, "UNIVERSITY_ADMIN"), null);
        ResponseEntity<Map> issued = post("/api/v1/students/me/verification/challenges", staffStudent.token(), null);
        assertThat(issued.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> response = post(casePath(university, staffStudent, "consume-challenge"),
                staffStudent.token(), Map.of("code", issued.getBody().get("code")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("VERIFICATION_SELF_REVIEW_FORBIDDEN");
    }

    @Test
    void platformOfficerCannotApproveAnEscalatedCaseAtAnUnverifiedUniversity() {
        University university = university("SUSPENDED");
        Student student = claimedAndSubmittedStudent(university, "escalated-unverified");
        String adminToken = staff(university, "UNIVERSITY_ADMIN");
        assertThat(post(casePath(university, student, "escalate"), adminToken, Map.of("notes", "Cannot confirm"))
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        String officerToken = verificationOfficer("officer-unverified");

        ResponseEntity<Map> response = post(escalationPath(student, "verify"), officerToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("UNIVERSITY_NOT_VERIFIED");
        assertThat(enrollmentStatus(student)).isEqualTo("SUBMITTED");
    }

    @Test
    void platformOfficerCannotResolveTheirOwnEscalatedCase() {
        University university = university("VERIFIED");
        Student officerStudent = claimedAndSubmittedStudent(university, "officer-student");
        insertPlatformRole(officerStudent.userId(), "VERIFICATION_OFFICER");
        String adminToken = staff(university, "UNIVERSITY_ADMIN");
        post(casePath(university, officerStudent, "escalate"), adminToken, Map.of("notes", "Needs platform review"));

        ResponseEntity<Map> response = post(escalationPath(officerStudent, "verify"), officerStudent.token(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("VERIFICATION_SELF_REVIEW_FORBIDDEN");
        assertThat(enrollmentStatus(officerStudent)).isEqualTo("SUBMITTED");

        // Another officer resolves it normally.
        assertThat(post(escalationPath(officerStudent, "verify"), verificationOfficer("other-officer"), null)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(enrollmentStatus(officerStudent)).isEqualTo("VERIFIED");
    }

    // ---------------------------------------------------------------- fixtures

    private record University(UUID id, UUID departmentId) {
    }

    private record Student(String email, UUID userId, String token) {
    }

    private University university(String status) {
        UUID universityId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO universities (id, name, slug, city, status, created_at, updated_at) "
                        + "VALUES (?, ?, ?, 'Mogadishu', ?, now(), now())",
                universityId, "Integrity University " + universityId, "univ-" + universityId, status);
        UUID departmentId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO departments (id, university_id, name, code, created_at) VALUES (?, ?, 'Computer Science', 'CS', now())",
                departmentId, universityId);
        return new University(universityId, departmentId);
    }

    private Student claimedAndSubmittedStudent(University university, String prefix) {
        String email = uniqueEmail(prefix);
        registerAndVerify(email, "Password123");
        Student student = new Student(email, userIdOf(email), loginAndExtractAccessToken(email, "Password123"));
        return claimAndSubmit(student, university);
    }

    private Student claimAndSubmit(Student student, University university) {
        ResponseEntity<Map> claim = post("/api/v1/students/me/enrollment", student.token(),
                Map.of("universityId", university.id().toString(), "departmentId", university.departmentId().toString(),
                        "studentNumber", "SN-" + UUID.randomUUID().toString().substring(0, 8),
                        "program", "BSc Computer Science", "academicYear", "2025/2026"));
        if (claim.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Enrollment claim failed: " + claim.getBody());
        }
        uploadStudentIdEvidence(student.token());
        ResponseEntity<Map> submit = post("/api/v1/students/me/enrollment/submit-verification", student.token(), null);
        if (submit.getStatusCode() != HttpStatus.OK) {
            throw new IllegalStateException("Verification submit failed: " + submit.getBody());
        }
        return student;
    }

    private String staff(University university, String role) {
        String email = uniqueEmail("staff-" + role.toLowerCase());
        registerAndVerify(email, "Password123");
        insertMembership(university.id(), userIdOf(email), role);
        return loginAndExtractAccessToken(email, "Password123");
    }

    private String verificationOfficer(String prefix) {
        String email = uniqueEmail(prefix);
        registerAndVerify(email, "Password123");
        insertPlatformRole(userIdOf(email), "VERIFICATION_OFFICER");
        return loginAndExtractAccessToken(email, "Password123");
    }

    private void insertMembership(UUID universityId, UUID userId, String role) {
        jdbcTemplate.update(
                "INSERT INTO university_memberships (id, university_id, user_id, role, assigned_at) VALUES (?, ?, ?, ?, now())",
                UUID.randomUUID(), universityId, userId, role);
    }

    private void insertPlatformRole(UUID userId, String role) {
        jdbcTemplate.update(
                "INSERT INTO platform_admins (id, user_id, role, granted_at) VALUES (?, ?, ?, now())",
                UUID.randomUUID(), userId, role);
    }

    private UUID userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    private UUID caseIdOf(Student student) {
        return UUID.fromString(jdbcTemplate.queryForObject(
                "SELECT c.id FROM student_verification_cases c JOIN student_enrollments e ON e.id = c.enrollment_id "
                        + "WHERE e.student_user_id = ?",
                String.class, student.userId()));
    }

    private String enrollmentStatus(Student student) {
        return jdbcTemplate.queryForObject(
                "SELECT verification_status FROM student_enrollments WHERE student_user_id = ?",
                String.class, student.userId());
    }

    private String casePath(University university, Student student, String action) {
        return "/api/v1/universities/" + university.id() + "/verification-cases/" + caseIdOf(student) + "/" + action;
    }

    private String escalationPath(Student student, String action) {
        return "/api/v1/admin/verification-escalations/" + caseIdOf(student) + "/" + action;
    }

    private ResponseEntity<Map> post(String path, String accessToken, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url(path), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    /** Same real multipart route and genuine PDF magic bytes as {@code UniversityVerificationAuthorizationIT}. */
    private void uploadStudentIdEvidence(String studentToken) {
        byte[] pdf = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n".getBytes(StandardCharsets.UTF_8);
        ByteArrayResource resource = new ByteArrayResource(pdf) {
            @Override
            public String getFilename() {
                return "student-id.pdf";
            }
        };
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.APPLICATION_PDF);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(resource, partHeaders));
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(studentToken);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        ResponseEntity<Map> response = restTemplate.exchange(
                url("/api/v1/students/me/verification/evidence"), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Student ID evidence upload failed: " + response.getBody());
        }
    }
}
