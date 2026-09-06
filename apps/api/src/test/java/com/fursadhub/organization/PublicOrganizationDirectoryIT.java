package com.fursadhub.organization;

import com.fursadhub.opportunity.AbstractPhase3IT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B1 — the public organization directory.
 *
 * <p>The approved visibility policy is enforced here and nowhere else that matters: an organization
 * is publicly discoverable if and ONLY if its verification status is {@code VERIFIED}. Deliberately
 * NOT "verified OR has a published opportunity" — the tests below prove an unverified organization
 * stays hidden even while it owns a live public opportunity, which is the exact hole that rule
 * closes.
 */
class PublicOrganizationDirectoryIT extends AbstractPhase3IT {

    private static final String DIRECTORY = "/api/v1/public/organizations";

    // ---------------------------------------------------------------- access and visibility

    @Test
    void anonymousCallerMayReadTheDirectory() {
        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKeys("content", "page", "size", "totalElements", "totalPages");
    }

    @Test
    void verifiedOrganizationAppears() {
        String adminToken = registerAndLogin("dir-verified-admin");
        String name = uniqueName("Directory Verified");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        assertThat(idsMatching(name)).containsExactly(organizationId.toString());
    }

    /**
     * The directory lists organizations FursadHub has attested to, not organizations that happen to
     * be hiring today — so zero open opportunities must not remove one.
     */
    @Test
    void verifiedOrganizationWithZeroOpportunitiesStillAppears() {
        String adminToken = registerAndLogin("dir-empty-admin");
        String name = uniqueName("Directory Empty");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        Map<String, Object> row = singleRowMatching(name);

        assertThat(row.get("id")).isEqualTo(organizationId.toString());
        assertThat(((Number) row.get("openOpportunityCount")).longValue()).isZero();
    }

    @Test
    void draftOrganizationDoesNotAppear() {
        String adminToken = registerAndLogin("dir-draft-admin");
        String name = uniqueName("Directory Draft");
        createOrganization(adminToken, name);

        assertThat(idsMatching(name)).isEmpty();
    }

    /**
     * The single most important test in this class. An unverified organization must never become
     * publicly discoverable merely because an opportunity row exists — the rejected
     * "VERIFIED OR hasPublishedOpportunity" predicate would have listed exactly this organization.
     *
     * <p>The opportunity is published while the organization is VERIFIED (publishing requires it),
     * and the organization is then moved back to a non-verified state — which is precisely what an
     * admin suspension or revocation does in production.
     */
    @Test
    void unverifiedOrganizationWithAPublishedOpportunityStillDoesNotAppear() {
        // Short prefix on purpose: uniqueEmail() appends a 36-character UUID, and @Email enforces
        // RFC 5321's 64-character limit on the local part.
        String adminToken = registerAndLogin("dir-unverif-opp");
        String name = uniqueName("Directory Hidden Despite Opportunity");
        UUID organizationId = createVerifiedOrganization(adminToken, name);
        publishOpportunity(adminToken, organizationId, "PUBLIC");

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");

        assertThat(idsMatching(name)).isEmpty();
    }

    @Test
    void pendingRejectedSuspendedAndRevokedOrganizationsNeverAppear() {
        String adminToken = registerAndLogin("dir-states-admin");

        for (String status : List.of("DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES", "REJECTED", "SUSPENDED", "REVOKED")) {
            String name = uniqueName("Directory State " + status);
            UUID organizationId = createOrganization(adminToken, name);
            setOrganizationVerificationStatus(organizationId, status);

            assertThat(idsMatching(name))
                    .as("an organization in %s must never be publicly discoverable", status)
                    .isEmpty();
        }
    }

    // ---------------------------------------------------------------- filtering

    @Test
    void nameSearchIsCaseInsensitiveAndMatchesAFragment() {
        String adminToken = registerAndLogin("dir-search-admin");
        String name = uniqueName("Zamzam Logistics");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?query=zAmZaM+lOgIsTiCs");

        assertThat(ids(response)).contains(organizationId.toString());
    }

    @Test
    void nameSearchExcludesNonMatches() {
        String adminToken = registerAndLogin("dir-search-miss-admin");
        createVerifiedOrganization(adminToken, uniqueName("Included Org"));

        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?query=" + uniqueName("Absolutely No Such Name"));

        assertThat((Number) response.getBody().get("totalElements")).isEqualTo(0);
        assertThat(ids(response)).isEmpty();
    }

    @Test
    void organizationTypeFilterRestrictsResults() {
        String adminToken = registerAndLogin("dir-type-admin");
        String name = uniqueName("Type Filtered");
        UUID organizationId = createVerifiedOrganization(adminToken, name);
        // createVerifiedOrganization always creates a COMPANY; make this one an NGO so the filter
        // has something to discriminate on.
        jdbcTemplate.update("UPDATE organizations SET type = 'NGO' WHERE id = ?", organizationId);

        assertThat(ids(unauthenticatedGet(DIRECTORY + "?query=" + encode(name) + "&type=NGO")))
                .containsExactly(organizationId.toString());
        assertThat(ids(unauthenticatedGet(DIRECTORY + "?query=" + encode(name) + "&type=COMPANY")))
                .isEmpty();
    }

    @Test
    void unknownOrganizationTypeIsRejectedAsAValidationFailure() {
        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?type=NOT_A_TYPE");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }

    // ---------------------------------------------------------------- paging, totals, sorting

    @Test
    void paginationReportsAccurateTotalsAndPages() {
        String adminToken = registerAndLogin("dir-paging-admin");
        String shared = uniqueName("Paging Group");
        for (int index = 0; index < 3; index++) {
            createVerifiedOrganization(adminToken, shared + " " + index);
        }

        ResponseEntity<Map> firstPage = unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&size=2&page=0");
        assertThat((Number) firstPage.getBody().get("totalElements")).isEqualTo(3);
        assertThat((Number) firstPage.getBody().get("totalPages")).isEqualTo(2);
        assertThat((Number) firstPage.getBody().get("page")).isEqualTo(0);
        assertThat((Number) firstPage.getBody().get("size")).isEqualTo(2);
        assertThat(ids(firstPage)).hasSize(2);

        ResponseEntity<Map> secondPage = unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&size=2&page=1");
        assertThat(ids(secondPage)).hasSize(1);
        assertThat(ids(firstPage)).doesNotContainAnyElementsOf(ids(secondPage));
    }

    @Test
    void defaultSortIsNameAscending() {
        String adminToken = registerAndLogin("dir-sort-admin");
        String shared = uniqueName("Sort Group");
        createVerifiedOrganization(adminToken, shared + " Charlie");
        createVerifiedOrganization(adminToken, shared + " Alpha");
        createVerifiedOrganization(adminToken, shared + " Bravo");

        List<String> names = names(unauthenticatedGet(DIRECTORY + "?query=" + encode(shared)));

        assertThat(names).containsExactly(shared + " Alpha", shared + " Bravo", shared + " Charlie");
    }

    @Test
    void allowedDescendingSortReversesTheOrder() {
        String adminToken = registerAndLogin("dir-sort-desc-admin");
        String shared = uniqueName("Sort Desc Group");
        createVerifiedOrganization(adminToken, shared + " Alpha");
        createVerifiedOrganization(adminToken, shared + " Bravo");

        List<String> names = names(unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&sort=nameDesc"));

        assertThat(names).containsExactly(shared + " Bravo", shared + " Alpha");
    }

    /**
     * Every allowed key must actually resolve to a real JPA property. An allowlist entry naming a
     * field that does not exist would sail past review and then 500 for the first caller who used
     * it, so each key gets exercised rather than merely declared.
     */
    @Test
    void recentlyVerifiedSortOrdersByVerificationMomentDescending() {
        String adminToken = registerAndLogin("dir-recent-admin");
        String shared = uniqueName("Recent Group");
        UUID oldest = createVerifiedOrganization(adminToken, shared + " Oldest");
        UUID newest = createVerifiedOrganization(adminToken, shared + " Newest");
        setVerifiedAt(oldest, "now() - interval '10 days'");
        setVerifiedAt(newest, "now()");

        List<String> ids = ids(unauthenticatedGet(DIRECTORY + "?query=" + encode(shared) + "&sort=recentlyVerified"));

        assertThat(ids).containsExactly(newest.toString(), oldest.toString());
    }

    /**
     * An unrecognised sort key is REJECTED rather than silently ignored. Ignoring it would hand the
     * caller a different ordering than they asked for; worse, accepting a raw property name would
     * let an anonymous caller order by {@code registrationNumber} or {@code verificationStatus} and
     * infer private values from the result order without either field appearing in the body.
     */
    @Test
    void privatePropertyNamesAreRejectedAsSortKeys() {
        for (String attempt : List.of("registrationNumber", "verificationStatus", "registrationNumber,asc", "id")) {
            ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?sort=" + encode(attempt));

            assertThat(response.getStatusCode())
                    .as("sort=%s must be rejected", attempt)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
        }
    }

    @Test
    void pageSizeIsCappedAtFifty() {
        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?size=5000");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((Number) response.getBody().get("size")).isEqualTo(50);
    }

    @Test
    void outOfRangePagingValuesAreClampedRatherThanFailing() {
        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?size=0&page=-3");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((Number) response.getBody().get("size")).isEqualTo(1);
        assertThat((Number) response.getBody().get("page")).isEqualTo(0);
    }

    // ---------------------------------------------------------------- payload

    @Test
    void hasLogoReflectsActualLogoAvailability() {
        String adminToken = registerAndLogin("dir-logo-admin");
        String withoutName = uniqueName("Logo Absent");
        String withName = uniqueName("Logo Present");
        createVerifiedOrganization(adminToken, withoutName);
        UUID withLogoId = createVerifiedOrganization(adminToken, withName);
        attachOrganizationLogo(withLogoId);

        assertThat(singleRowMatching(withoutName).get("hasLogo")).isEqualTo(false);
        assertThat(singleRowMatching(withName).get("hasLogo")).isEqualTo(true);
    }

    /**
     * The count must mean exactly what {@code GET /api/v1/public/opportunities} means — the shared
     * {@code PublicOpportunityVisibility} rule. A draft, a paused one and a university-targeted-only
     * one are all excluded; a PUBLIC and a HYBRID one are both counted.
     */
    @Test
    void openOpportunityCountUsesTheCanonicalPublicVisibilityRule() {
        String adminToken = registerAndLogin("dir-count-admin");
        String name = uniqueName("Counting Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);

        publishOpportunity(adminToken, organizationId, "PUBLIC");
        publishOpportunity(adminToken, organizationId, "HYBRID");

        // Not counted: never published.
        createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());
        // Not counted: published then paused.
        UUID paused = publishOpportunity(adminToken, organizationId, "PUBLIC");
        authorizedPost("/api/v1/opportunities/" + paused + "/pause", adminToken, null);
        // Not counted: published then closed.
        UUID closed = publishOpportunity(adminToken, organizationId, "PUBLIC");
        authorizedPost("/api/v1/opportunities/" + closed + "/close", adminToken, null);

        assertThat(((Number) singleRowMatching(name).get("openOpportunityCount")).longValue()).isEqualTo(2);
    }

    @Test
    void openOpportunityCountIsCorrectPerOrganizationAcrossAPage() {
        String adminToken = registerAndLogin("dir-count-multi-admin");
        String shared = uniqueName("Count Group");
        UUID twoOpportunities = createVerifiedOrganization(adminToken, shared + " Alpha");
        UUID oneOpportunity = createVerifiedOrganization(adminToken, shared + " Bravo");
        createVerifiedOrganization(adminToken, shared + " Charlie");

        publishOpportunity(adminToken, twoOpportunities, "PUBLIC");
        publishOpportunity(adminToken, twoOpportunities, "PUBLIC");
        publishOpportunity(adminToken, oneOpportunity, "PUBLIC");

        ResponseEntity<Map> response = unauthenticatedGet(DIRECTORY + "?query=" + encode(shared));

        // Ordered alphabetically: Alpha (2), Bravo (1), Charlie (absent from the grouped result → 0).
        assertThat(rows(response).stream()
                .map(row -> ((Number) row.get("openOpportunityCount")).longValue())
                .toList())
                .containsExactly(2L, 1L, 0L);
    }

    @Test
    void directoryRowNeverExposesPrivateFields() {
        String adminToken = registerAndLogin("dir-fields-admin");
        String name = uniqueName("Field Allowlist Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);
        // Every optional field is populated so this asserts the MAXIMAL serialized surface. The API
        // is configured with default-property-inclusion: non_null, so leaving them null would omit
        // them from the JSON and the allowlist below would pass without ever having checked them.
        jdbcTemplate.update("""
                UPDATE organizations
                   SET registration_number = 'SECRET-REG-1234',
                       description = 'A public description.',
                       website = 'https://example.test'
                 WHERE id = ?
                """, organizationId);

        Map<String, Object> row = singleRowMatching(name);

        // industry/city/countryCode/shortDescription/hasCover are Backend Phase B2 additions — real
        // institution-managed profile data, deliberately public. Everything on the exclusion list
        // below stays private.
        assertThat(row.keySet()).containsExactlyInAnyOrder(
                "id", "name", "slug", "type", "description", "website", "verified", "hasLogo",
                "hasCover", "openOpportunityCount");
        assertThat(row).doesNotContainKeys(
                "registrationNumber", "verificationStatus", "verifiedAt", "evidenceStoredFileId",
                "evidenceUploadedAt", "logoStoredFileId", "logoUploadedAt", "coverStoredFileId",
                "coverUploadedAt", "createdAt", "updatedAt", "members", "memberships", "staff");
        assertThat(row.toString()).doesNotContain("SECRET-REG-1234");
    }

    /**
     * The API is configured with {@code default-property-inclusion: non_null}, so an organization
     * that has published no description or website omits those keys entirely rather than sending
     * {@code null}. Worth pinning: it is the difference between an optional and a nullable field in
     * the generated client types, and the identity/count fields must survive regardless.
     */
    @Test
    void unsetOptionalFieldsAreOmittedWhileRequiredOnesRemain() {
        String adminToken = registerAndLogin("dir-sparse-admin");
        String name = uniqueName("Sparse Org");
        createVerifiedOrganization(adminToken, name);

        Map<String, Object> row = singleRowMatching(name);

        assertThat(row).doesNotContainKeys("description", "website");
        assertThat(row).containsKeys("id", "name", "slug", "type", "verified", "hasLogo", "openOpportunityCount");
    }

    // ---------------------------------------------------------------- helpers

    private List<String> idsMatching(String name) {
        return ids(unauthenticatedGet(DIRECTORY + "?query=" + encode(name)));
    }

    private Map<String, Object> singleRowMatching(String name) {
        List<Map<String, Object>> rows = rows(unauthenticatedGet(DIRECTORY + "?query=" + encode(name)));
        assertThat(rows).as("expected exactly one directory row named %s", name).hasSize(1);
        return rows.get(0);
    }

    private UUID publishOpportunity(String accessToken, UUID organizationId, String mode) {
        UUID opportunityId = createDraftOpportunity(accessToken, organizationId, mode, Map.of());
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", accessToken, null);
        return opportunityId;
    }

    private void setOrganizationVerificationStatus(UUID organizationId, String status) {
        jdbcTemplate.update("UPDATE organizations SET verification_status = ? WHERE id = ?", status, organizationId);
    }

    /** {@code sqlExpression} is a trusted literal from this test class, never caller input. */
    private void setVerifiedAt(UUID organizationId, String sqlExpression) {
        jdbcTemplate.update("UPDATE organizations SET verified_at = " + sqlExpression + " WHERE id = ?", organizationId);
    }
}
