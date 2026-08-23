package com.fursadhub.candidacy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Internship offers, the critical acceptance transaction, and placement uniqueness
 * (CLAUDE.md section 38, Phase 4 sections 14-21/30/31).
 */
class InternshipOfferIT extends AbstractPhase4IT {

    private record Applied(
            String recruiterToken, UUID organizationId, UUID opportunityId, StudentFixture student, UUID candidacyId) {
    }

    /** A verified student who has applied to a published PUBLIC opportunity. */
    private Applied appliedCandidate(String prefix) {
        PublishedOpportunity published = publishPublicOpportunity(prefix + "-recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent(prefix + "-student", universityId, departmentId);

        ResponseEntity<Map> applied = authorizedPost(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications", student.accessToken(), Map.of());
        if (applied.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Application failed: " + applied.getBody());
        }
        return new Applied(
                published.recruiterToken(), published.organizationId(), published.opportunityId(), student,
                UUID.fromString((String) applied.getBody().get("id")));
    }

    private Map<String, Object> offerBody() {
        return Map.of(
                "startDate", LocalDate.now().plusMonths(2).toString(),
                "endDate", LocalDate.now().plusMonths(5).toString(),
                "responseDeadline", LocalDate.now().plusWeeks(2).toString(),
                "location", "Mogadishu",
                "details", "Full-time internship.");
    }

    private UUID sendOffer(Applied applied) {
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", applied.recruiterToken(), offerBody());
        if (response.getStatusCode() != HttpStatus.CREATED) {
            throw new IllegalStateException("Offer creation failed: " + response.getBody());
        }
        return UUID.fromString((String) response.getBody().get("id"));
    }

    private String candidacyStatus(UUID candidacyId) {
        return jdbcTemplate.queryForObject("SELECT status FROM candidacies WHERE id = ?", String.class, candidacyId);
    }

    // ---------------------------------------------------------------- sending

    @Test
    void recruiterCanSendOfferAndCandidacyBecomesOffered() {
        Applied applied = appliedCandidate("valid");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", applied.recruiterToken(), offerBody());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("status")).isEqualTo("PENDING");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("OFFERED");
    }

    @Test
    void recruiterFromAnotherOrganizationCannotSendOffer() {
        Applied applied = appliedCandidate("victim");

        // A fully legitimate recruiter — at a DIFFERENT organization.
        String outsiderToken = registerVerifiedAndLogin("outsider");
        createVerifiedOrganization(outsiderToken, "Other Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", outsiderToken, offerBody());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(response)).isEqualTo("ACCESS_DENIED");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("SUBMITTED");
    }

    /**
     * ORGANIZATION_SUPERVISOR supervises placements; that must not imply access to the recruitment
     * pipeline (Phase 4 section 11).
     */
    @Test
    void organizationSupervisorCannotSendOfferOrSeeCandidatePool() {
        Applied applied = appliedCandidate("supervised");

        String supervisorEmail = uniqueEmail("supervisor");
        registerVerifiedUser(supervisorEmail);
        insertOrganizationMembership(applied.organizationId(), userIdOf(supervisorEmail), "ORGANIZATION_SUPERVISOR");
        String supervisorToken = loginAndExtractAccessToken(supervisorEmail, "Password123");

        ResponseEntity<Map> offerResponse = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", supervisorToken, offerBody());
        assertThat(offerResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<Map> poolResponse = authorizedGet(
                "/api/v1/opportunities/" + applied.opportunityId() + "/candidacies", supervisorToken);
        assertThat(poolResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void offerWithEndDateBeforeStartDateIsRejected() {
        Applied applied = appliedCandidate("dates");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", applied.recruiterToken(),
                Map.of(
                        "startDate", LocalDate.now().plusMonths(5).toString(),
                        "endDate", LocalDate.now().plusMonths(2).toString(),
                        "responseDeadline", LocalDate.now().plusWeeks(2).toString()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void offerWithPastResponseDeadlineIsRejected() {
        Applied applied = appliedCandidate("deadline");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", applied.recruiterToken(),
                Map.of(
                        "startDate", LocalDate.now().plusMonths(2).toString(),
                        "endDate", LocalDate.now().plusMonths(5).toString(),
                        "responseDeadline", LocalDate.now().minusDays(1).toString()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void secondLiveOfferOnSameCandidacyIsRejected() {
        Applied applied = appliedCandidate("double-offer");
        sendOffer(applied);

        ResponseEntity<Map> second = authorizedPost(
                "/api/v1/candidacies/" + applied.candidacyId() + "/offer", applied.recruiterToken(), offerBody());

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(second)).isEqualTo("OFFER_ALREADY_EXISTS");
    }

    // ---------------------------------------------------------------- accepting

    @Test
    void candidateStudentCanAcceptAndExactlyOnePlannedPlacementIsCreated() {
        Applied applied = appliedCandidate("accept");
        UUID offerId = sendOffer(applied);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", applied.student().accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("alreadyAccepted")).isEqualTo(false);

        Map<String, Object> placement = (Map<String, Object>) response.getBody().get("placement");
        assertThat(placement.get("status")).isEqualTo("PLANNED");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("ACCEPTED");
        assertThat(countPlacementsForStudent(applied.student().userId())).isEqualTo(1);
    }

    /** The placement must carry the academic context the student was actually enrolled under. */
    @Test
    void placementPreservesUniversityAndDepartmentContext() {
        PublishedOpportunity published = publishPublicOpportunity("context-recruiter");
        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture student = createVerifiedStudent("context-student", universityId, departmentId);

        UUID candidacyId = UUID.fromString((String) authorizedPost(
                "/api/v1/opportunities/" + published.opportunityId() + "/applications",
                student.accessToken(), Map.of()).getBody().get("id"));

        UUID offerId = UUID.fromString((String) authorizedPost(
                "/api/v1/candidacies/" + candidacyId + "/offer", published.recruiterToken(), offerBody())
                .getBody().get("id"));

        authorizedPost("/api/v1/offers/" + offerId + "/accept", student.accessToken(), null);

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT university_id, department_id, organization_id, opportunity_id FROM placements WHERE candidacy_id = ?",
                candidacyId);

        assertThat(row.get("university_id")).isEqualTo(universityId);
        assertThat(row.get("department_id")).isEqualTo(departmentId);
        assertThat(row.get("organization_id")).isEqualTo(published.organizationId());
        assertThat(row.get("opportunity_id")).isEqualTo(published.opportunityId());
    }

    @Test
    void anotherStudentCannotAcceptSomeoneElsesOffer() {
        Applied applied = appliedCandidate("owner");
        UUID offerId = sendOffer(applied);

        UUID universityId = insertVerifiedUniversity("Jamhuriya " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computer Science", "CS");
        StudentFixture attacker = createVerifiedStudent("attacker", universityId, departmentId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", attacker.accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(errorCode(response)).isEqualTo("OFFER_NOT_FOUND");
        assertThat(countPlacementsForStudent(attacker.userId())).isZero();
        assertThat(countPlacementsForStudent(applied.student().userId())).isZero();
    }

    @Test
    void recruiterCannotAcceptOnBehalfOfStudent() {
        Applied applied = appliedCandidate("recruiter-accept");
        UUID offerId = sendOffer(applied);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", applied.recruiterToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(countPlacementsForStudent(applied.student().userId())).isZero();
    }

    /** Phase 4 section 19: a double-clicked accept must never create a second placement. */
    @Test
    void repeatedAcceptanceIsIdempotentAndDoesNotCreateSecondPlacement() {
        Applied applied = appliedCandidate("idempotent");
        UUID offerId = sendOffer(applied);

        ResponseEntity<Map> first = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", applied.student().accessToken(), null);
        ResponseEntity<Map> second = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", applied.student().accessToken(), null);

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody().get("alreadyAccepted")).isEqualTo(true);

        String firstPlacementId = (String) ((Map<String, Object>) first.getBody().get("placement")).get("id");
        String secondPlacementId = (String) ((Map<String, Object>) second.getBody().get("placement")).get("id");
        assertThat(secondPlacementId).isEqualTo(firstPlacementId);

        assertThat(countPlacementsForStudent(applied.student().userId())).isEqualTo(1);
    }

    /** Phase 4 section 30.4: genuinely concurrent acceptances must still yield exactly one placement. */
    @Test
    void concurrentAcceptanceRequestsCreateExactlyOnePlacement() throws Exception {
        Applied applied = appliedCandidate("concurrent");
        UUID offerId = sendOffer(applied);

        int attempts = 4;
        CyclicBarrier barrier = new CyclicBarrier(attempts);
        ExecutorService executor = Executors.newFixedThreadPool(attempts);
        try {
            List<Future<ResponseEntity<Map>>> futures = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                futures.add(executor.submit(fireTogether(barrier,
                        () -> authorizedPost("/api/v1/offers/" + offerId + "/accept",
                                applied.student().accessToken(), null))));
            }
            for (Future<ResponseEntity<Map>> future : futures) {
                ResponseEntity<Map> response = future.get(30, TimeUnit.SECONDS);
                assertThat(response.getStatusCode())
                        .as("every concurrent accept should resolve safely, got %s", response.getBody())
                        .isEqualTo(HttpStatus.OK);
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(countPlacementsForStudent(applied.student().userId())).isEqualTo(1);
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("ACCEPTED");
    }

    /** No half-state: an accepted offer always has a placement, and vice versa. */
    @Test
    void acceptanceLeavesNoPartialState() {
        Applied applied = appliedCandidate("atomic");
        UUID offerId = sendOffer(applied);
        authorizedPost("/api/v1/offers/" + offerId + "/accept", applied.student().accessToken(), null);

        Integer acceptedOffersWithoutPlacement = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM internship_offers o WHERE o.status = 'ACCEPTED' "
                        + "AND NOT EXISTS (SELECT 1 FROM placements p WHERE p.offer_id = o.id)",
                Integer.class);
        Integer placementsWithNonAcceptedCandidacy = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM placements p JOIN candidacies c ON c.id = p.candidacy_id "
                        + "WHERE c.status <> 'ACCEPTED'",
                Integer.class);

        assertThat(acceptedOffersWithoutPlacement).isZero();
        assertThat(placementsWithNonAcceptedCandidacy).isZero();
    }

    // ---------------------------------------------------------------- declining and expiry

    @Test
    void studentCanDeclineAndCandidacyBecomesOfferDeclined() {
        Applied applied = appliedCandidate("decline");
        UUID offerId = sendOffer(applied);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/offers/" + offerId + "/decline", applied.student().accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("DECLINED");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("OFFER_DECLINED");
        assertThat(countPlacementsForStudent(applied.student().userId())).isZero();
    }

    @Test
    void repeatedDeclineIsSafe() {
        Applied applied = appliedCandidate("re-decline");
        UUID offerId = sendOffer(applied);

        authorizedPost("/api/v1/offers/" + offerId + "/decline", applied.student().accessToken(), null);
        ResponseEntity<Map> second = authorizedPost(
                "/api/v1/offers/" + offerId + "/decline", applied.student().accessToken(), null);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody().get("status")).isEqualTo("DECLINED");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("OFFER_DECLINED");
    }

    @Test
    void declinedOfferCannotThenBeAccepted() {
        Applied applied = appliedCandidate("decline-accept");
        UUID offerId = sendOffer(applied);
        authorizedPost("/api/v1/offers/" + offerId + "/decline", applied.student().accessToken(), null);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", applied.student().accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("OFFER_NOT_PENDING");
        assertThat(countPlacementsForStudent(applied.student().userId())).isZero();
    }

    /** Phase 4 section 21: a lapsed offer expires lazily and can never be accepted. */
    @Test
    void expiredOfferCannotBeAcceptedAndCandidacyBecomesOfferExpired() {
        Applied applied = appliedCandidate("expiry");
        UUID offerId = sendOffer(applied);
        expireOfferDeadline(offerId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/offers/" + offerId + "/accept", applied.student().accessToken(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(response)).isEqualTo("OFFER_NOT_PENDING");
        assertThat(countPlacementsForStudent(applied.student().userId())).isZero();

        String offerStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM internship_offers WHERE id = ?", String.class, offerId);
        assertThat(offerStatus).isEqualTo("EXPIRED");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("OFFER_EXPIRED");
    }

    /** Reading the student's offers also applies lazy expiry, so nothing shows as still open. */
    @Test
    void readingOffersExpiresLapsedOnes() {
        Applied applied = appliedCandidate("read-expiry");
        UUID offerId = sendOffer(applied);
        expireOfferDeadline(offerId);

        authorizedGetList("/api/v1/students/me/offers", applied.student().accessToken());

        String offerStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM internship_offers WHERE id = ?", String.class, offerId);
        assertThat(offerStatus).isEqualTo("EXPIRED");
        assertThat(candidacyStatus(applied.candidacyId())).isEqualTo("OFFER_EXPIRED");
    }

    private <T> Callable<T> fireTogether(CyclicBarrier barrier, Callable<T> action) {
        return () -> {
            barrier.await(30, TimeUnit.SECONDS);
            return action.call();
        };
    }
}
