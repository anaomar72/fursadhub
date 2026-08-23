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
 * Organization isolation, student isolation and candidacy transition validity
 * (CLAUDE.md sections 24/26/37, Phase 4 sections 11/12/29).
 */
class CandidacyAccessIT extends AbstractPhase4IT {

    private record Applied(String recruiterToken, UUID organizationId, UUID opportunityId,
                           StudentFixture student, UUID candidacyId) {
    }

    private Applied appliedCandidate(String prefix) {
        PublishedOpportunity published = publishPublicOpportunity(prefix + "-recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent(prefix + "-student", universityId, departmentId);

        ResponseEntity<Map> applied = authorizedPost(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications", student.accessToken(), Map.of());
        return new Applied(
                published.recruiterToken(), published.organizationId(), published.opportunityId(), student,
                UUID.fromString((String) applied.getBody().get("id")));
    }

    private String candidacyStatus(UUID candidacyId) {
        return jdbcTemplate.queryForObject("SELECT status FROM candidacies WHERE id = ?", String.class, candidacyId);
    }

    // ---------------------------------------------------------------- organization isolation

    @Test
    void organizationACannotViewOrganizationBCandidacy() {
        Applied victim = appliedCandidate("org-b");

        String outsiderToken = registerVerifiedAndLogin("org-a");
        createVerifiedOrganization(outsiderToken, "Org A " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedGet("/api/v1/candidacies/" + victim.candidacyId(), outsiderToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void organizationACannotManageOrganizationBCandidacy() {
        Applied victim = appliedCandidate("org-b");

        String outsiderToken = registerVerifiedAndLogin("org-a");
        createVerifiedOrganization(outsiderToken, "Org A " + UUID.randomUUID());

        for (String command : List.of("review", "shortlist", "interview", "reject")) {
            ResponseEntity<Map> response = authorizedPost(
                    "/api/v1/candidacies/" + victim.candidacyId() + "/" + command, outsiderToken, null);
            assertThat(response.getStatusCode())
                    .as("command %s must be denied across organizations", command)
                    .isEqualTo(HttpStatus.FORBIDDEN);
        }
        assertThat(candidacyStatus(victim.candidacyId())).isEqualTo("SUBMITTED");
    }

    @Test
    void organizationACannotListOrganizationBCandidatePool() {
        Applied victim = appliedCandidate("org-b");

        String outsiderToken = registerVerifiedAndLogin("org-a");
        createVerifiedOrganization(outsiderToken, "Org A " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/opportunities/" + victim.opportunityId() + "/candidacies", outsiderToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void userWithNoOrganizationMembershipCannotReachCandidatePool() {
        Applied victim = appliedCandidate("lonely");
        String strangerToken = registerVerifiedAndLogin("stranger");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/opportunities/" + victim.opportunityId() + "/candidacies", strangerToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- student isolation

    @Test
    void studentCannotViewAnotherStudentsCandidacy() {
        Applied victim = appliedCandidate("victim");

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture attacker = createVerifiedStudent("attacker", universityId, departmentId);

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/students/me/candidacies/" + victim.candidacyId(), attacker.accessToken());

        // NOT_FOUND, not FORBIDDEN: probing ids must not confirm another student's candidacy exists.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(errorCode(response)).isEqualTo("CANDIDACY_NOT_FOUND");
    }

    @Test
    void studentCannotWithdrawAnotherStudentsCandidacy() {
        Applied victim = appliedCandidate("victim");

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture attacker = createVerifiedStudent("attacker", universityId, departmentId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + victim.candidacyId() + "/withdraw", attacker.accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(candidacyStatus(victim.candidacyId())).isEqualTo("SUBMITTED");
    }

    @Test
    void studentOnlySeesTheirOwnCandidaciesInTheirList() {
        Applied first = appliedCandidate("first");
        Applied second = appliedCandidate("second");

        ResponseEntity<List> response = authorizedGetList(
                "/api/v1/students/me/candidacies", first.student().accessToken());

        assertThat(response.getBody()).hasSize(1);
        Map<String, Object> row = (Map<String, Object>) response.getBody().get(0);
        assertThat(row.get("id")).isEqualTo(first.candidacyId().toString());
        assertThat(row.get("id")).isNotEqualTo(second.candidacyId().toString());
    }

    @Test
    void studentCannotUseRecruiterCandidacyDetailEndpoint() {
        Applied applied = appliedCandidate("own");

        // Even the OWNING student must not reach the recruiter-facing detail view, which exposes
        // recruiter-only history; students have their own /students/me endpoint.
        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/candidacies/" + applied.candidacyId(), applied.student().accessToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- withdrawal

    @Test
    void studentCanWithdrawOwnCandidacy() {
        Applied applied = appliedCandidate("withdraw");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/withdraw", applied.student().accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("WITHDRAWN");
    }

    /** Phase 4 section 13: withdrawal is blocked once a placement exists. */
    @Test
    void studentCannotWithdrawAfterAcceptingOfferAndCreatingPlacement() {
        Applied applied = appliedCandidate("no-withdraw");

        UUID offerId = UUID.fromString((String) authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", applied.recruiterToken(),
                Map.of(
                        "startDate", LocalDate.now().plusMonths(2).toString(),
                        "endDate", LocalDate.now().plusMonths(5).toString(),
                        "responseDeadline", LocalDate.now().plusWeeks(2).toString()))
                .getBody().get("id"));
        authorizedPost("/api/v1/offers/" + offerId + "/accept", applied.student().accessToken(), null);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/withdraw", applied.student().accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("CANDIDACY_HAS_PLACEMENT");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("ACCEPTED");
        assertThat(countPlacementsForStudent(applied.student().userId())).isEqualTo(1);
    }

    // ---------------------------------------------------------------- transitions

    @Test
    void recruiterCanAdvanceCandidacyThroughStages() {
        Applied applied = appliedCandidate("stages");

        assertThat(authorizedPost("/api/v1/candidacies/" + applied.candidacyId() + "/review",
                applied.recruiterToken(), null).getBody().get("status")).isEqualTo("UNDER_REVIEW");
        assertThat(authorizedPost("/api/v1/candidacies/" + applied.candidacyId() + "/shortlist",
                applied.recruiterToken(), null).getBody().get("status")).isEqualTo("SHORTLISTED");
        assertThat(authorizedPost("/api/v1/candidacies/" + applied.candidacyId() + "/interview",
                applied.recruiterToken(), null).getBody().get("status")).isEqualTo("INTERVIEW");
    }

    /** INTERVIEW is optional and stages may be skipped (CLAUDE.md section 37). */
    @Test
    void candidacyMayGoStraightFromSubmittedToShortlisted() {
        Applied applied = appliedCandidate("skip");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/shortlist", applied.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("SHORTLISTED");
    }

    @Test
    void invalidTransitionIsRejected() {
        Applied applied = appliedCandidate("invalid");
        authorizedPost("/api/v1/candidacies/" + applied.candidacyId() + "/reject", applied.recruiterToken(), null);

        // REJECTED is terminal — nothing may follow it.
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/shortlist", applied.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("CANDIDACY_INVALID_TRANSITION");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("REJECTED");
    }

    @Test
    void movingBackwardsIsRejected() {
        Applied applied = appliedCandidate("backwards");
        authorizedPost("/api/v1/candidacies/" + applied.candidacyId() + "/shortlist", applied.recruiterToken(), null);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/review", applied.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("CANDIDACY_INVALID_TRANSITION");
    }

    @Test
    void rejectingCandidateWithLiveOfferIsBlockedUntilOfferWithdrawn() {
        Applied applied = appliedCandidate("live-offer");

        UUID offerId = UUID.fromString((String) authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", applied.recruiterToken(),
                Map.of(
                        "startDate", LocalDate.now().plusMonths(2).toString(),
                        "endDate", LocalDate.now().plusMonths(5).toString(),
                        "responseDeadline", LocalDate.now().plusWeeks(2).toString()))
                .getBody().get("id"));

        ResponseEntity<Map> blocked = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/reject", applied.recruiterToken(), null);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(blocked)).isEqualTo("OFFER_STILL_LIVE");

        authorizedPost("/api/v1/candidacies/" + applied.candidacyId() + "/offers/" + offerId + "/withdraw",
                applied.recruiterToken(), null);

        ResponseEntity<Map> allowed = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/reject", applied.recruiterToken(), null);
        assertThat(allowed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(allowed.getBody().get("status")).isEqualTo("REJECTED");
    }

    /** The candidate pool is ONE pipeline; source is a filter over it, not a separate list. */
    @Test
    void candidatePoolIsUnifiedAndFilterableBySource() {
        String recruiterToken = registerVerifiedAndLogin("unified-recruiter");
        UUID organizationId = createVerifiedOrganization(recruiterToken, "Org " + UUID.randomUUID());
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");

        UUID opportunityId = createDraftOpportunity(recruiterToken, organizationId, "HYBRID", Map.of());
        addTarget(recruiterToken, opportunityId, universityId, List.of(departmentId), 10);
        publishOpportunity(recruiterToken, opportunityId);

        String coordinatorEmail = uniqueEmail("coordinator");
        registerVerifiedUser(coordinatorEmail);
        insertUniversityMembership(universityId, userIdOf(coordinatorEmail), "DEPARTMENT_COORDINATOR", List.of(departmentId));
        String coordinatorToken = loginAndExtractAccessToken(coordinatorEmail, "Password123");

        StudentFixture applicant = createVerifiedStudent("applicant", universityId, departmentId);
        StudentFixture nominee = createVerifiedStudent("nominee", universityId, departmentId);

        authorizedPost("/api/v1/opportunities/" + opportunityId + "/applications", applicant.accessToken(), Map.of());

        UUID nominationId = UUID.fromString((String) authorizedPost(
                "/api/v1/universities/" + universityId + "/nominations", coordinatorToken,
                Map.of("opportunityId", opportunityId.toString(), "studentUserId", nominee.userId().toString()))
                .getBody().get("id"));
        authorizedPost("/api/v1/nominations/" + nominationId + "/accept", nominee.accessToken(), null);

        // One pool contains both, regardless of how they arrived.
        assertThat(authorizedGetList("/api/v1/opportunities/" + opportunityId + "/candidacies", recruiterToken)
                .getBody()).hasSize(2);

        assertThat(authorizedGetList(
                "/api/v1/opportunities/" + opportunityId + "/candidacies?source=SELF_APPLICATION", recruiterToken)
                .getBody()).hasSize(1);
        assertThat(authorizedGetList(
                "/api/v1/opportunities/" + opportunityId + "/candidacies?source=UNIVERSITY_NOMINATION", recruiterToken)
                .getBody()).hasSize(1);
    }
}
