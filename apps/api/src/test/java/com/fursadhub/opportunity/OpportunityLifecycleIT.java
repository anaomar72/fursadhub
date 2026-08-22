package com.fursadhub.opportunity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 3 mandatory opportunity validation and state-machine tests (Phase 3 spec section 19
 * "Verification", "Opportunity validation", "State machine").
 */
class OpportunityLifecycleIT extends AbstractPhase3IT {

    @Test
    void unverifiedOrganizationCannotPublish() {
        String adminToken = registerAndLogin("unverified-org-admin");
        UUID organizationId = createOrganization(adminToken, "Unverified Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("ORGANIZATION_NOT_VERIFIED");
    }

    @Test
    void verifiedOrganizationCanPublishAValidDraft() {
        String adminToken = registerAndLogin("verified-org-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Verified Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("PUBLISHED");
    }

    @Test
    void numberOfOpeningsBelowOneIsRejected() {
        String adminToken = registerAndLogin("openings-admin");
        UUID organizationId = createOrganization(adminToken, "Openings Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organizationId + "/opportunities", adminToken,
                draftOpportunityBody("PUBLIC", Map.of("numberOfOpenings", 0)));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void invalidDateOrderIsRejected() {
        String adminToken = registerAndLogin("date-order-admin");
        UUID organizationId = createOrganization(adminToken, "Dates Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + organizationId + "/opportunities", adminToken,
                draftOpportunityBody("PUBLIC", Map.of(
                        "startDate", java.time.LocalDate.now().plusMonths(5).toString(),
                        "endDate", java.time.LocalDate.now().plusMonths(2).toString())));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void publishPauseResumeCloseWorksEndToEnd() {
        String adminToken = registerAndLogin("lifecycle-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Lifecycle Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        assertThat(authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null).getBody().get("status"))
                .isEqualTo("PUBLISHED");
        assertThat(authorizedPost("/api/v1/opportunities/" + opportunityId + "/pause", adminToken, null).getBody().get("status"))
                .isEqualTo("PAUSED");
        assertThat(authorizedPost("/api/v1/opportunities/" + opportunityId + "/resume", adminToken, null).getBody().get("status"))
                .isEqualTo("PUBLISHED");
        assertThat(authorizedPost("/api/v1/opportunities/" + opportunityId + "/close", adminToken, null).getBody().get("status"))
                .isEqualTo("CLOSED");
    }

    @Test
    void cancelIsValidFromDraft() {
        String adminToken = registerAndLogin("cancel-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Cancel Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/cancel", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("CANCELLED");
    }

    @Test
    void closingADraftOpportunityIsRejected() {
        String adminToken = registerAndLogin("invalid-transition-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Invalid Transition Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/close", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_INVALID_TRANSITION");
    }

    @Test
    void resumingAClosedOpportunityIsRejected() {
        String adminToken = registerAndLogin("resume-closed-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Resume Closed Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/close", adminToken, null);

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/resume", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_INVALID_TRANSITION");
    }

    @Test
    void universityTargetedOpportunityCannotPublishWithoutAnyTarget() {
        String adminToken = registerAndLogin("targeted-no-target-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Targeted Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "UNIVERSITY_TARGETED", Map.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_TARGET_REQUIRED");
    }
}
