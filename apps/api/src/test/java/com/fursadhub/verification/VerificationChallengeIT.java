package com.fursadhub.verification;

import com.fursadhub.candidacy.AbstractPhase4IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Account-binding challenge properties that are NOT already covered by
 * {@code UniversityVerificationAuthorizationIT} (which proves the two headline CLAUDE.md section 60
 * items — an expired challenge fails and a consumed one cannot be replayed).
 *
 * <p>What is added here is the rest of CLAUDE.md section 29: a challenge is bound to ONE case, is
 * only issuable while the case is genuinely under review, and is stored as a hash only
 * (CLAUDE.md section 64 — never persist a raw verification token).
 */
class VerificationChallengeIT extends AbstractPhase4IT {

    private record University(UUID universityId, UUID departmentId, String adminToken) {
    }

    private University universityWithAdmin() {
        UUID universityId = insertVerifiedUniversity("Challenge University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        String adminEmail = uniqueEmail("challenge-uni-admin");
        registerVerifiedUser(adminEmail);
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN", List.of());
        return new University(universityId, departmentId, loginAndExtractAccessToken(adminEmail, "Password123"));
    }

    /** A student whose enrollment has been submitted for review through the real endpoint. */
    private StudentFixture submittedStudent(String prefix, University university) {
        StudentFixture student = createStudent(prefix, university.universityId(), university.departmentId(), "DRAFT");
        ResponseEntity<Map> submit = authorizedPost(
                "/api/v1/students/me/enrollment/submit-verification", student.accessToken(), null);
        if (!submit.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Verification submit failed: " + submit.getBody());
        }
        return student;
    }

    private UUID caseIdOf(StudentFixture student) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM student_verification_cases WHERE enrollment_id = ?", UUID.class, student.enrollmentId());
    }

    private String issueChallenge(StudentFixture student) {
        ResponseEntity<Map> issued = authorizedPost(
                "/api/v1/students/me/verification/challenges", student.accessToken(), null);
        if (!issued.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Challenge issue failed: " + issued.getBody());
        }
        return (String) issued.getBody().get("code");
    }

    private ResponseEntity<Map> consume(University university, UUID caseId, String code) {
        return authorizedPost(
                "/api/v1/universities/" + university.universityId() + "/verification-cases/" + caseId + "/consume-challenge",
                university.adminToken(), Map.of("code", code));
    }

    /**
     * A challenge belongs to one case. Reading a code off the student in front of you and entering it
     * against a DIFFERENT student's case must not bind that other account — the lookup is scoped by
     * case id, so a valid code from elsewhere is simply not found.
     */
    @Test
    void aChallengeIssuedForOneCaseCannotBeConsumedAgainstAnother() {
        University university = universityWithAdmin();
        StudentFixture owner = submittedStudent("challenge-owner", university);
        StudentFixture other = submittedStudent("challenge-other", university);
        String ownersCode = issueChallenge(owner);

        ResponseEntity<Map> response = consume(university, caseIdOf(other), ownersCode);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VERIFICATION_CHALLENGE_INVALID");
        assertThat(consumedChallengeCount(caseIdOf(owner)))
                .as("the owner's challenge must be left untouched")
                .isZero();
    }

    /** The same code still works on the case it was actually issued for. */
    @Test
    void theChallengeStillWorksOnItsOwnCaseAfterBeingRejectedElsewhere() {
        University university = universityWithAdmin();
        StudentFixture owner = submittedStudent("still-valid-owner", university);
        StudentFixture other = submittedStudent("still-valid-other", university);
        String ownersCode = issueChallenge(owner);

        consume(university, caseIdOf(other), ownersCode);
        ResponseEntity<Map> response = consume(university, caseIdOf(owner), ownersCode);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(consumedChallengeCount(caseIdOf(owner))).isEqualTo(1);
    }

    /**
     * A resolved case has nothing left to bind, so no new code may be minted for it. Without this the
     * student could keep producing codes for a case that was already rejected or revoked.
     */
    @Test
    void noChallengeCanBeIssuedOnceTheCaseIsResolved() {
        University university = universityWithAdmin();
        StudentFixture student = submittedStudent("resolved-case", university);
        UUID caseId = caseIdOf(student);

        ResponseEntity<Map> verified = authorizedPost(
                "/api/v1/universities/" + university.universityId() + "/verification-cases/" + caseId + "/verify",
                university.adminToken(), null);
        assertThat(verified.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> issued = authorizedPost(
                "/api/v1/students/me/verification/challenges", student.accessToken(), null);

        assertThat(issued.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(issued)).isEqualTo("VERIFICATION_CASE_INVALID_TRANSITION");
    }

    /** A student with no case at all has nothing to issue a challenge for. */
    @Test
    void noChallengeCanBeIssuedBeforeTheEnrollmentIsSubmitted() {
        University university = universityWithAdmin();
        StudentFixture student = createStudent("never-submitted", university.universityId(), university.departmentId(), "DRAFT");

        ResponseEntity<Map> issued = authorizedPost(
                "/api/v1/students/me/verification/challenges", student.accessToken(), null);

        assertThat(issued.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(errorCode(issued)).isEqualTo("VERIFICATION_CASE_NOT_FOUND");
    }

    /**
     * CLAUDE.md section 64: the raw code exists only in the issuing response. What lands in
     * PostgreSQL is its hash and nothing else — so a database dump cannot be replayed.
     */
    @Test
    void onlyTheHashOfTheCodeIsPersisted() {
        University university = universityWithAdmin();
        StudentFixture student = submittedStudent("hash-only", university);
        String code = issueChallenge(student);
        UUID caseId = caseIdOf(student);

        List<String> storedHashes = jdbcTemplate.queryForList(
                "SELECT code_hash FROM verification_challenges WHERE verification_case_id = ?", String.class, caseId);

        assertThat(storedHashes).containsExactly(tokenGenerator.hash(code));
        assertThat(storedHashes.get(0)).isNotEqualTo(code);
        assertThat(rawCodeOccurrences(caseId, code))
                .as("the raw code must not appear anywhere in the challenge row")
                .isZero();
    }

    private int consumedChallengeCount(UUID caseId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM verification_challenges WHERE verification_case_id = ? AND consumed_at IS NOT NULL",
                Integer.class, caseId);
        return count == null ? 0 : count;
    }

    private int rawCodeOccurrences(UUID caseId, String rawCode) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM verification_challenges WHERE verification_case_id = ? AND code_hash = ?",
                Integer.class, caseId, rawCode);
        return count == null ? 0 : count;
    }
}
