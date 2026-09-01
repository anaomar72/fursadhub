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
 * Platform review of organization verification (CLAUDE.md section 31).
 *
 * <p>Phase 3 built this state machine on the {@code Organization} entity and left it unreachable
 * because no reviewer role existed. These tests prove the reviewer side now works AND that the
 * frozen transitions still refuse invalid moves — connecting an endpoint to a state machine must not
 * quietly loosen it.
 */
class AdminInstitutionVerificationIT extends AbstractPhase7IT {

    @Test
    @DisplayName("A verification officer moves an organization through review to VERIFIED")
    void happyPathVerification() {
        Staff officer = verificationOfficer("inst-officer");
        UUID organizationId = submittedOrganization("inst-happy");

        requireOk(authorizedPost("/api/v1/admin/organizations/" + organizationId + "/begin-review",
                officer.token(), null), "Begin review");
        ResponseEntity<Map> verified = authorizedPost(
                "/api/v1/admin/organizations/" + organizationId + "/verify", officer.token(), null);
        requireOk(verified, "Verify");

        assertThat(verified.getBody().get("verificationStatus")).isEqualTo("VERIFIED");
        assertThat(verified.getBody().get("verifiedAt")).isNotNull();
        assertThat(countAuditEvents("ORGANIZATION_VERIFIED")).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("The organization's own admins are notified of the outcome")
    void organizationAdminsAreNotified() {
        Staff officer = verificationOfficer("notify-officer");
        String ownerToken = registerVerifiedAndLogin("inst-owner");
        UUID ownerUserId = currentUserId(ownerToken);
        UUID organizationId = createOrganization(ownerToken, "Notified Org " + UUID.randomUUID());
        submitOrganizationForVerification(ownerToken, organizationId);

        requireOk(authorizedPost("/api/v1/admin/organizations/" + organizationId + "/verify",
                officer.token(), null), "Verify");

        assertThat(countNotifications(ownerUserId, "ORGANIZATION_VERIFIED")).isEqualTo(1);
    }

    @Test
    @DisplayName("An invalid transition is refused by the domain, not silently applied")
    void invalidTransitionIsRefused() {
        Staff officer = verificationOfficer("invalid-officer");
        UUID organizationId = submittedOrganization("inst-invalid");

        // SUBMITTED -> NEEDS_CHANGES is not a legal move: requestChanges requires UNDER_REVIEW.
        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/organizations/" + organizationId + "/request-changes",
                officer.token(), Map.of("note", "Please attach registration papers."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(organizationStatus(organizationId)).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("A verified organization can be suspended and then revoked")
    void suspensionAndRevocation() {
        Staff officer = verificationOfficer("revoke-officer");
        UUID organizationId = submittedOrganization("inst-revoke");

        requireOk(authorizedPost("/api/v1/admin/organizations/" + organizationId + "/verify",
                officer.token(), null), "Verify");
        requireOk(authorizedPost("/api/v1/admin/organizations/" + organizationId + "/suspend",
                officer.token(), Map.of("note", "Under investigation")), "Suspend");
        assertThat(organizationStatus(organizationId)).isEqualTo("SUSPENDED");

        requireOk(authorizedPost("/api/v1/admin/organizations/" + organizationId + "/revoke",
                officer.token(), Map.of("note", "Investigation concluded")), "Revoke");
        assertThat(organizationStatus(organizationId)).isEqualTo("REVOKED");
    }

    @Test
    @DisplayName("An organization admin cannot verify their own organization")
    void selfVerificationIsRefused() {
        String ownerToken = registerVerifiedAndLogin("self-verify");
        UUID organizationId = createOrganization(ownerToken, "Self Org " + UUID.randomUUID());
        submitOrganizationForVerification(ownerToken, organizationId);

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/admin/organizations/" + organizationId + "/verify", ownerToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(organizationStatus(organizationId)).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("The queue can be filtered to organizations awaiting review")
    void queueFiltersBySubmittedStatus() {
        Staff officer = verificationOfficer("queue-officer");
        UUID organizationId = submittedOrganization("inst-queue");

        ResponseEntity<Map> response = authorizedGet(
                "/api/v1/admin/organizations?status=SUBMITTED", officer.token());
        requireOk(response, "Queue");

        List<?> content = (List<?>) response.getBody().get("content");
        assertThat(content).isNotEmpty();
        assertThat(content).allSatisfy(entry ->
                assertThat(((Map<?, ?>) entry).get("verificationStatus")).isEqualTo("SUBMITTED"));
        assertThat(content).anySatisfy(entry ->
                assertThat(((Map<?, ?>) entry).get("id")).isEqualTo(organizationId.toString()));
    }

    @Test
    @DisplayName("The queue reports whether a license is attached, and the reviewer can open it")
    void reviewerSeesAndReadsTheLicense() {
        Staff officer = verificationOfficer("license-officer");
        String ownerToken = registerVerifiedAndLogin("license-owner");
        UUID organizationId = createOrganization(ownerToken, "Licensed Org " + UUID.randomUUID());
        submitOrganizationForVerification(ownerToken, organizationId);

        ResponseEntity<Map> detail = authorizedGet(
                "/api/v1/admin/organizations/" + organizationId, officer.token());
        requireOk(detail, "Organization detail");
        assertThat(detail.getBody().get("hasEvidence")).isEqualTo(true);
        assertThat(detail.getBody().get("evidenceUploadedAt")).isNotNull();

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/admin/organizations/" + organizationId + "/verification/evidence/document",
                officer.token());

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(download.getBody()).isEqualTo(validPdfBytes());
    }

    /** An organization created through the real endpoints and submitted for verification. */
    private UUID submittedOrganization(String prefix) {
        String ownerToken = registerVerifiedAndLogin(prefix);
        UUID organizationId = createOrganization(ownerToken, "Org " + UUID.randomUUID());
        submitOrganizationForVerification(ownerToken, organizationId);
        return organizationId;
    }

    private String organizationStatus(UUID organizationId) {
        return jdbcTemplate.queryForObject(
                "SELECT verification_status FROM organizations WHERE id = ?", String.class, organizationId);
    }
}
