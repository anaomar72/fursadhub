package com.fursadhub.opportunity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
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
                targetBody(defaultUniversityId, java.util.List.of(csDepartmentId), 5, java.time.LocalDate.now().plusDays(20)));
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
        // "verified" is a Phase 8 addition and "hasLogo" a Backend Phase B1 one — both intentional,
        // neither a leak: the verified badge and the logo on an opportunity card are the whole point
        // (CLAUDE.md section 26 "build trust"). Every other field on this list stays a deliberate
        // allowlist this test protects.
        assertThat(organization.keySet())
                .containsExactlyInAnyOrder("id", "name", "slug", "type", "verified", "hasLogo");
        assertThat(response.getBody()).doesNotContainKey("createdBy");
        // Never the registration number, the raw verification status, or any evidence/file pointer.
        assertThat(organization).doesNotContainKeys(
                "registrationNumber", "verificationStatus", "evidenceStoredFileId", "logoStoredFileId");
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

    /**
     * Backend Phase B1 replaced a per-row organization lookup with one batched query for the whole
     * page. This pins the properties that change would be most likely to break: every row still
     * carries its OWN organization (not a neighbour's), the embedded fields are still correct, and
     * the page's ordering is untouched.
     */
    @Test
    void batchedOrganizationResolutionKeepsEveryRowMatchedToItsOwnOrganization() {
        String adminToken = registerAndLogin("batch-org-admin");
        UUID firstOrganizationId = createVerifiedOrganization(adminToken, "Batch Alpha " + UUID.randomUUID());
        UUID secondOrganizationId = createVerifiedOrganization(adminToken, "Batch Beta " + UUID.randomUUID());
        // A logo on exactly one of them, so a mixed page proves hasLogo is per-row rather than
        // copied from whichever organization happened to be resolved first.
        attachOrganizationLogo(secondOrganizationId);

        UUID firstOpportunityId = publishOpportunity(adminToken, firstOrganizationId, "PUBLIC");
        UUID secondOpportunityId = publishOpportunity(adminToken, secondOrganizationId, "PUBLIC");

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities?size=50");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");

        Map<String, Object> first = rowFor(content, firstOpportunityId);
        Map<String, Object> second = rowFor(content, secondOpportunityId);

        @SuppressWarnings("unchecked")
        Map<String, Object> firstOrganization = (Map<String, Object>) first.get("organization");
        @SuppressWarnings("unchecked")
        Map<String, Object> secondOrganization = (Map<String, Object>) second.get("organization");

        assertThat(firstOrganization.get("id")).isEqualTo(firstOrganizationId.toString());
        assertThat(secondOrganization.get("id")).isEqualTo(secondOrganizationId.toString());
        assertThat(firstOrganization.get("verified")).isEqualTo(true);
        assertThat(secondOrganization.get("verified")).isEqualTo(true);
        assertThat(firstOrganization.get("hasLogo")).isEqualTo(false);
        assertThat(secondOrganization.get("hasLogo")).isEqualTo(true);
    }

    /**
     * The default ordering is newest-published-first, and the batch change must not disturb it —
     * {@code Page.map} preserves the page's own order, but that is exactly the kind of guarantee
     * worth pinning rather than assuming.
     */
    @Test
    void batchedResolutionPreservesPublishedAtDescendingOrder() {
        String adminToken = registerAndLogin("batch-order-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Order Org " + UUID.randomUUID());

        UUID older = publishOpportunity(adminToken, organizationId, "PUBLIC");
        UUID newer = publishOpportunity(adminToken, organizationId, "PUBLIC");
        // published_at is set by the application clock; force a deterministic gap rather than
        // relying on two writes landing in different microseconds.
        jdbcTemplate.update(
                "UPDATE internship_opportunities SET published_at = now() - interval '1 day' WHERE id = ?", older);

        ResponseEntity<Map> response =
                unauthenticatedGet("/api/v1/public/opportunities?organization=" + organizationId + "&size=50");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
        assertThat(content.stream().map(row -> row.get("id")).toList())
                .containsExactly(newer.toString(), older.toString());
    }

    private UUID publishOpportunity(String accessToken, UUID organizationId, String mode) {
        UUID opportunityId = createDraftOpportunity(accessToken, organizationId, mode, Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", accessToken, null);
        return opportunityId;
    }

    private Map<String, Object> rowFor(List<Map<String, Object>> content, UUID opportunityId) {
        return content.stream()
                .filter(row -> opportunityId.toString().equals(row.get("id")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Opportunity " + opportunityId + " missing from the public page"));
    }
}
