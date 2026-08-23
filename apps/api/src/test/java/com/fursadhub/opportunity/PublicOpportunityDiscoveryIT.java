package com.fursadhub.opportunity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 3 mandatory public-discovery tests (Phase 3 spec section 19 "Public access"; CLAUDE.md
 * section 11/12/14 — only PUBLISHED PUBLIC/HYBRID opportunities are ever publicly visible, and
 * only safe organization fields are ever returned).
 */
class PublicOpportunityDiscoveryIT extends AbstractPhase3IT {

    @Test
    void publishedPublicOpportunityIsVisible() {
        String adminToken = registerAndLogin("public-visible-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Visible Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("id")).isEqualTo(opportunityId.toString());
    }

    @Test
    void publishedHybridOpportunityIsVisible() {
        String adminToken = registerAndLogin("public-hybrid-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Hybrid Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "HYBRID", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void draftOpportunityIsNotPubliclyVisible() {
        String adminToken = registerAndLogin("draft-hidden-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Draft Hidden Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_NOT_FOUND");
    }

    @Test
    void pausedOpportunityIsNotPubliclyVisible() {
        String adminToken = registerAndLogin("paused-hidden-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Paused Hidden Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/pause", adminToken, null);

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void cancelledOpportunityIsNotPubliclyVisible() {
        String adminToken = registerAndLogin("cancelled-hidden-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Cancelled Hidden Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/cancel", adminToken, null);

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void publishedUniversityTargetedOnlyOpportunityIsNeverPubliclyVisible() {
        String adminToken = registerAndLogin("targeted-hidden-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Targeted Hidden Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "UNIVERSITY_TARGETED", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/targets", adminToken,
                targetBody(JAMHURIYA_UNIVERSITY_ID, java.util.List.of(CS_DEPARTMENT_ID), 5, java.time.LocalDate.now().plusDays(20)));
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        ResponseEntity<Map> detail = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);
        assertThat(detail.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<Map> list = unauthenticatedGet("/api/v1/public/opportunities?organization=" + organizationId);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((Number) list.getBody().get("totalElements")).isEqualTo(0);
    }

    @Test
    void publicResponseNeverExposesPrivateOrganizationFields() {
        String adminToken = registerAndLogin("private-org-fields-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Private Fields Org " + UUID.randomUUID());
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);

        @SuppressWarnings("unchecked")
        Map<String, Object> organization = (Map<String, Object>) response.getBody().get("organization");
        assertThat(organization.keySet()).containsExactlyInAnyOrder("id", "name", "slug", "type");
        assertThat(response.getBody()).doesNotContainKey("createdBy");
    }

    @Test
    void listSupportsPaginationAndOnlyReturnsPublishedPublicOrHybrid() {
        String adminToken = registerAndLogin("pagination-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Pagination Org " + UUID.randomUUID());
        UUID published = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());
        authorizedPost("/api/v1/opportunities/" + published + "/publish", adminToken, null);
        createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities?organization=" + organizationId + "&size=10");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((Number) response.getBody().get("totalElements")).isEqualTo(1);
        assertThat(response.getBody()).containsKeys("content", "page", "size", "totalElements", "totalPages");
    }
}
