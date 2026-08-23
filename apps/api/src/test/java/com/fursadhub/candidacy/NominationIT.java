package com.fursadhub.candidacy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * University nomination authorization and student consent (CLAUDE.md section 35, Phase 4
 * sections 4/5), including the mandatory security cases from Phase 4 section 29.
 */
class NominationIT extends AbstractPhase4IT {

    /** A targeted opportunity plus the university/department context it targets. */
    private record TargetedSetup(
            String recruiterToken, UUID organizationId, UUID opportunityId, UUID universityId,
            UUID csDepartmentId, UUID baDepartmentId, UUID targetId) {
    }

    private TargetedSetup targetedSetup(String mode) {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID csDepartmentId = insertDepartment(universityId, "Computer Science", "CS");
        UUID baDepartmentId = insertDepartment(universityId, "Business Administration", "BA");

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, mode, Map.of());
        UUID targetId = addTarget(recruiterToken, opportunityId, universityId, List.of(csDepartmentId, baDepartmentId), 5);
        publishOpportunity(recruiterToken, opportunityId);

        return new TargetedSetup(
                recruiterToken, organizationId, opportunityId, universityId, csDepartmentId, baDepartmentId, targetId);
    }

    private String coordinatorFor(UUID universityId, List<UUID> departmentIds) {
        String email = uniqueEmail("coordinator");
        registerVerifiedUser(email);
        insertUniversityMembership(universityId, userIdOf(email), "DEPARTMENT_COORDINATOR", departmentIds);
        return loginAndExtractAccessToken(email, "Password123");
    }

    private ResponseEntity<Map> nominate(String staffToken, UUID universityId, UUID opportunityId, UUID studentUserId) {
        return authorizedPost("/api/v1/universities/" + universityId + "/nominations", staffToken,
                Map.of("opportunityId", opportunityId.toString(), "studentUserId", studentUserId.toString()));
    }

    @Test
    void coordinatorCanNominateVerifiedStudentInOwnDepartment() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        ResponseEntity<Map> response = nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("status")).isEqualTo("PENDING_STUDENT_CONSENT");
    }

    @Test
    void coordinatorCannotNominateOutsideTheirDepartmentScope() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        // Scoped to Computer Science only.
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture businessStudent = createVerifiedStudent("business", setup.universityId(), setup.baDepartmentId());

        ResponseEntity<Map> response = nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), businessStudent.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void staffFromAnotherUniversityCannotNominate() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        UUID otherUniversityId = insertVerifiedUniversity("Other " + UUID.randomUUID());
        UUID otherDepartmentId = insertDepartment(otherUniversityId, "Computer Science", "CS");
        String outsiderToken = coordinatorFor(otherUniversityId, List.of(otherDepartmentId));

        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        // The outsider names the TARGETED university in the URL but holds no membership there.
        ResponseEntity<Map> response = nominate(
                outsiderToken, setup.universityId(), setup.opportunityId(), student.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void universityNotTargetedByOpportunityCannotNominate() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        UUID untargetedUniversityId = insertVerifiedUniversity("Untargeted " + UUID.randomUUID());
        UUID untargetedDepartmentId = insertDepartment(untargetedUniversityId, "Computer Science", "CS");

        String coordinatorToken = coordinatorFor(untargetedUniversityId, List.of(untargetedDepartmentId));
        StudentFixture student = createVerifiedStudent("student", untargetedUniversityId, untargetedDepartmentId);

        ResponseEntity<Map> response = nominate(
                coordinatorToken, untargetedUniversityId, setup.opportunityId(), student.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("OPPORTUNITY_NOT_TARGETED_TO_UNIVERSITY");
    }

    @Test
    void unverifiedStudentCannotBeNominated() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createStudent("unverified", setup.universityId(), setup.csDepartmentId(), "SUBMITTED");

        ResponseEntity<Map> response = nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("STUDENT_NOT_VERIFIED");
    }

    @Test
    void departmentNotEligibleForTargetCannotBeNominated() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID csDepartmentId = insertDepartment(universityId, "Computer Science", "CS");
        UUID baDepartmentId = insertDepartment(universityId, "Business Administration", "BA");

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "UNIVERSITY_TARGETED", Map.of());
        // Target restricted to Computer Science only.
        addTarget(recruiterToken, opportunityId, universityId, List.of(csDepartmentId), 5);
        publishOpportunity(recruiterToken, opportunityId);

        // A university admin has whole-university scope, so this isolates the TARGET restriction.
        String adminEmail = uniqueEmail("uni-admin");
        registerVerifiedUser(adminEmail);
        insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN", List.of());
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");

        StudentFixture businessStudent = createVerifiedStudent("business", universityId, baDepartmentId);

        ResponseEntity<Map> response = nominate(adminToken, universityId, opportunityId, businessStudent.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("DEPARTMENT_NOT_ELIGIBLE_FOR_TARGET");
    }

    @Test
    void duplicateLiveNominationIsRejected() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        assertThat(nominate(coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId())
                .getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<Map> second = nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId());

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(second)).isEqualTo("STUDENT_ALREADY_NOMINATED");
    }

    // ------------------------------------------------------------------ consent

    @Test
    void organizationCannotSeeCandidateBeforeStudentConsent() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        nominate(coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId());

        // Nomination exists, but consent has not been given — so no candidacy, so nothing in the pool.
        ResponseEntity<List> pool = authorizedGetList(
                "/api/v1/opportunities/" + setup.opportunityId() + "/candidacies", setup.recruiterToken());

        assertThat(pool.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(pool.getBody()).isEmpty();
        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isZero();
    }

    @Test
    void acceptingNominationCreatesCandidacyAndExposesCandidate() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        UUID nominationId = UUID.fromString((String) nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId()).getBody().get("id"));

        ResponseEntity<Map> accepted = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/accept", student.accessToken(), null);

        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accepted.getBody().get("source")).isEqualTo("UNIVERSITY_NOMINATION");
        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isEqualTo(1);

        ResponseEntity<List> pool = authorizedGetList(
                "/api/v1/opportunities/" + setup.opportunityId() + "/candidacies", setup.recruiterToken());
        assertThat(pool.getBody()).hasSize(1);
    }

    @Test
    void decliningNominationCreatesNoCandidacy() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        UUID nominationId = UUID.fromString((String) nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId()).getBody().get("id"));

        ResponseEntity<Map> declined = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/decline", student.accessToken(), null);

        assertThat(declined.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(declined.getBody().get("status")).isEqualTo("DECLINED");
        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isZero();
    }

    @Test
    void studentCannotAcceptAnotherStudentsNomination() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture nominated = createVerifiedStudent("nominated", setup.universityId(), setup.csDepartmentId());
        StudentFixture attacker = createVerifiedStudent("attacker", setup.universityId(), setup.csDepartmentId());

        UUID nominationId = UUID.fromString((String) nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), nominated.userId()).getBody().get("id"));

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/accept", attacker.accessToken(), null);

        // NOT_FOUND rather than FORBIDDEN so probing ids cannot confirm the nomination exists.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(errorCode(response)).isEqualTo("NOMINATION_NOT_FOUND");
        assertThat(countCandidacies(setup.opportunityId(), nominated.userId())).isZero();
    }

    @Test
    void nominationCannotBeRespondedToTwice() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        UUID nominationId = UUID.fromString((String) nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId()).getBody().get("id"));

        authorizedPost("/api/v1/nominations/" + nominationId + "/accept", student.accessToken(), null);
        ResponseEntity<Map> second = authorizedPost(
                "/api/v1/nominations/" + nominationId + "/decline", student.accessToken(), null);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(second)).isEqualTo("NOMINATION_ALREADY_RESOLVED");
        assertThat(countCandidacies(setup.opportunityId(), student.userId())).isEqualTo(1);
    }

    @Test
    void staffCanWithdrawPendingNominationWithinScope() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        UUID nominationId = UUID.fromString((String) nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId()).getBody().get("id"));

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/universities/" + setup.universityId() + "/nominations/" + nominationId + "/withdraw",
                coordinatorToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("WITHDRAWN");
    }

    @Test
    void coordinatorOnlySeesNominationsWithinDepartmentScope() {
        TargetedSetup setup = targetedSetup("UNIVERSITY_TARGETED");

        String adminEmail = uniqueEmail("uni-admin");
        registerVerifiedUser(adminEmail);
        insertUniversityMembership(setup.universityId(), userIdOf(adminEmail), "UNIVERSITY_ADMIN", List.of());
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");

        StudentFixture csStudent = createVerifiedStudent("cs", setup.universityId(), setup.csDepartmentId());
        StudentFixture baStudent = createVerifiedStudent("ba", setup.universityId(), setup.baDepartmentId());

        nominate(adminToken, setup.universityId(), setup.opportunityId(), csStudent.userId());
        nominate(adminToken, setup.universityId(), setup.opportunityId(), baStudent.userId());

        // The admin sees both; a CS-scoped coordinator sees only the CS nomination.
        assertThat(authorizedGetList("/api/v1/universities/" + setup.universityId() + "/nominations", adminToken)
                .getBody()).hasSize(2);

        String csCoordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        ResponseEntity<List> scoped = authorizedGetList(
                "/api/v1/universities/" + setup.universityId() + "/nominations", csCoordinatorToken);

        assertThat(scoped.getBody()).hasSize(1);
    }

    @Test
    void hybridOpportunityAcceptsNominations() {
        TargetedSetup setup = targetedSetup("HYBRID");
        String coordinatorToken = coordinatorFor(setup.universityId(), List.of(setup.csDepartmentId()));
        StudentFixture student = createVerifiedStudent("student", setup.universityId(), setup.csDepartmentId());

        ResponseEntity<Map> response = nominate(
                coordinatorToken, setup.universityId(), setup.opportunityId(), student.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void publicOnlyOpportunityRejectsNomination() {
        String recruiterToken = registerVerifiedAndLogin("recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "PUBLIC", Map.of());
        publishOpportunity(recruiterToken, opportunityId);

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        String coordinatorToken = coordinatorFor(universityId, List.of(departmentId));
        StudentFixture student = createVerifiedStudent("student", universityId, departmentId);

        ResponseEntity<Map> response = nominate(coordinatorToken, universityId, opportunityId, student.userId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("OPPORTUNITY_NOT_TARGETED_TO_UNIVERSITY");
    }
}
