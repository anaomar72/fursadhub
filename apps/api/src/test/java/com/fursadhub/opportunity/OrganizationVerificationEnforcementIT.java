package com.fursadhub.opportunity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Backend Phase B1.5 — organization verification is a LIVE prerequisite for new candidate
 * acquisition.
 *
 * <p>The gap this closes: an organization could publish while {@code VERIFIED}, later become
 * {@code SUSPENDED}/{@code REVOKED}, and its already-published opportunities stayed publicly
 * discoverable and kept accepting applications. Verification was enforced once, at publish, and
 * never again.
 *
 * <p>Every test here drives the organization out of {@code VERIFIED} AFTER a legitimate publish,
 * which is exactly what an admin suspension does in production — the opportunity row is never
 * touched.
 */
class OrganizationVerificationEnforcementIT extends AbstractPhase3IT {

    // ---------------------------------------------------------------- public list

    @Test
    void verifiedOrganizationPublicOpportunityIsVisible() {
        String adminToken = registerAndLogin("b15-vis-public");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Visible Public"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");

        assertThat(publicListIdsFor(organizationId)).containsExactly(opportunityId.toString());
    }

    @Test
    void verifiedOrganizationHybridOpportunityIsVisible() {
        String adminToken = registerAndLogin("b15-vis-hybrid");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Visible Hybrid"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "HYBRID");

        assertThat(publicListIdsFor(organizationId)).containsExactly(opportunityId.toString());
    }

    @Test
    void suspendedOrganizationPublicOpportunityDisappearsFromTheList() {
        String adminToken = registerAndLogin("b15-susp-public");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Suspended Public"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");
        assertThat(publicListIdsFor(organizationId)).containsExactly(opportunityId.toString());

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");

        assertThat(publicListIdsFor(organizationId)).isEmpty();
    }

    @Test
    void suspendedOrganizationHybridOpportunityDisappearsFromTheList() {
        String adminToken = registerAndLogin("b15-susp-hybrid");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Suspended Hybrid"));
        publishOpportunity(adminToken, organizationId, "HYBRID");

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");

        assertThat(publicListIdsFor(organizationId)).isEmpty();
    }

    @Test
    void everyNonVerifiedOrganizationStatusHidesThePublishedOpportunity() {
        String adminToken = registerAndLogin("b15-states");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 States"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");

        for (String status : List.of("DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES", "REJECTED", "SUSPENDED", "REVOKED")) {
            setOrganizationVerificationStatus(organizationId, status);
            assertThat(publicListIdsFor(organizationId))
                    .as("an opportunity owned by a %s organization must not be publicly listed", status)
                    .isEmpty();
        }

        // ...and the row itself was never mutated by any of that.
        setOrganizationVerificationStatus(organizationId, "VERIFIED");
        assertThat(opportunityStatusOf(opportunityId)).isEqualTo("PUBLISHED");
    }

    // ---------------------------------------------------------------- direct detail access

    @Test
    void directIdAccessCannotBypassTheVerificationFilter() {
        String adminToken = registerAndLogin("b15-direct");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Direct"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");

        assertThat(unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");

        ResponseEntity<Map> response = unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId);
        // 404, not 403: a public resource must not reveal that a hidden opportunity exists — the
        // same non-disclosure convention drafts and targeted-only opportunities already use.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().get("code")).isEqualTo("OPPORTUNITY_NOT_FOUND");
    }

    /** The public screening-question route resolves through the same lookup, so it is covered too. */
    @Test
    void publicScreeningQuestionsAreHiddenForANonVerifiedOrganization() {
        String adminToken = registerAndLogin("b15-screening");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Screening"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");

        setOrganizationVerificationStatus(organizationId, "REVOKED");

        ResponseEntity<Map> response =
                unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId + "/screening-questions");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ---------------------------------------------------------------- directory count consistency

    @Test
    void directoryCountAndPublicListNeverDisagree() {
        String adminToken = registerAndLogin("b15-count");
        String name = uniqueName("B15 Count Org");
        UUID organizationId = createVerifiedOrganization(adminToken, name);
        publishOpportunity(adminToken, organizationId, "PUBLIC");
        publishOpportunity(adminToken, organizationId, "HYBRID");

        // Verified: the card's count equals what the public list actually shows.
        assertThat(openOpportunityCountOf(name)).isEqualTo(2);
        assertThat(publicListIdsFor(organizationId)).hasSize(2);

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");

        // Non-verified: the organization leaves the directory entirely AND its opportunities leave
        // the public list. The forbidden state is "count says 0 but the list still shows them".
        assertThat(directoryRowsFor(name)).isEmpty();
        assertThat(publicListIdsFor(organizationId)).isEmpty();
    }

    // ---------------------------------------------------------------- publish / resume

    @Test
    void publishStillRequiresAVerifiedOrganization() {
        String adminToken = registerAndLogin("b15-publish");
        UUID organizationId = createOrganization(adminToken, uniqueName("B15 Unverified Publish"));
        UUID opportunityId = createDraftOpportunity(adminToken, organizationId, "PUBLIC", Map.of());

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("ORGANIZATION_NOT_VERIFIED");
    }

    @Test
    void verifiedOrganizationStaffCanResume() {
        String adminToken = registerAndLogin("b15-resume-ok");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Resume OK"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/pause", adminToken, null);

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/resume", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(opportunityStatusOf(opportunityId)).isEqualTo("PUBLISHED");
    }

    /**
     * The sharpest edge of the original gap: pause + resume was a re-publish that never went
     * through publish, so a suspended organization could put an opportunity back into public
     * discovery using only its still-active membership.
     */
    @Test
    void suspendedOrganizationStaffCannotResume() {
        String adminToken = registerAndLogin("b15-resume-no");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Resume Blocked"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/pause", adminToken, null);

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");

        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/resume", adminToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code")).isEqualTo("ORGANIZATION_NOT_VERIFIED");
        assertThat(opportunityStatusOf(opportunityId)).isEqualTo("PAUSED");
    }

    /** Withdrawing availability stays possible — the gate must not trap an opportunity. */
    @Test
    void suspendedOrganizationStaffCanStillPauseAndClose() {
        String adminToken = registerAndLogin("b15-withdraw");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Withdraw"));
        UUID paused = publishOpportunity(adminToken, organizationId, "PUBLIC");
        UUID closed = publishOpportunity(adminToken, organizationId, "PUBLIC");

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");

        assertThat(authorizedPost("/api/v1/opportunities/" + paused + "/pause", adminToken, null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(authorizedPost("/api/v1/opportunities/" + closed + "/close", adminToken, null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    /** Role authorization is unchanged: a non-member is still refused before any verification check. */
    @Test
    void resumeStillEnforcesExistingRoleAuthorization() {
        String adminToken = registerAndLogin("b15-resume-role");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Resume Role"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/pause", adminToken, null);

        String outsiderToken = registerAndLogin("b15-outsider");
        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/resume", outsiderToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    // ---------------------------------------------------------------- re-verification

    /**
     * Re-verification needs no repair pass. Because the gate is evaluated live, restoring
     * {@code VERIFIED} restores discoverability with no opportunity row rewritten and no re-publish.
     */
    @Test
    void reVerificationRestoresVisibilityWithoutRewritingTheOpportunity() {
        String adminToken = registerAndLogin("b15-reverify");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Reverify"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");
        assertThat(publicListIdsFor(organizationId)).isEmpty();
        assertThat(opportunityStatusOf(opportunityId)).isEqualTo("PUBLISHED");

        setOrganizationVerificationStatus(organizationId, "VERIFIED");

        assertThat(publicListIdsFor(organizationId)).containsExactly(opportunityId.toString());
        assertThat(unauthenticatedGet("/api/v1/public/opportunities/" + opportunityId).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(opportunityStatusOf(opportunityId)).isEqualTo("PUBLISHED");
    }

    /** A PAUSED opportunity does not silently reappear on re-verification — its own rules still apply. */
    @Test
    void reVerificationDoesNotResurrectAnOpportunityThatIsPausedInItsOwnRight() {
        String adminToken = registerAndLogin("b15-reverify-pause");
        UUID organizationId = createVerifiedOrganization(adminToken, uniqueName("B15 Reverify Paused"));
        UUID opportunityId = publishOpportunity(adminToken, organizationId, "PUBLIC");
        authorizedPost("/api/v1/opportunities/" + opportunityId + "/pause", adminToken, null);

        setOrganizationVerificationStatus(organizationId, "SUSPENDED");
        setOrganizationVerificationStatus(organizationId, "VERIFIED");

        assertThat(publicListIdsFor(organizationId)).isEmpty();
        assertThat(opportunityStatusOf(opportunityId)).isEqualTo("PAUSED");
    }

    // ---------------------------------------------------------------- helpers

    private UUID publishOpportunity(String accessToken, UUID organizationId, String mode) {
        UUID opportunityId = createDraftOpportunity(accessToken, organizationId, mode, Map.of());
        ResponseEntity<Map> response = authorizedPost("/api/v1/opportunities/" + opportunityId + "/publish", accessToken, null);
        if (response.getStatusCode() != HttpStatus.OK) {
            throw new IllegalStateException("Publish failed: " + response.getBody());
        }
        return opportunityId;
    }

    private List<String> publicListIdsFor(UUID organizationId) {
        return ids(unauthenticatedGet("/api/v1/public/opportunities?organization=" + organizationId + "&size=50"));
    }

    private List<Map<String, Object>> directoryRowsFor(String organizationName) {
        return rows(unauthenticatedGet("/api/v1/public/organizations?query=" + encode(organizationName)));
    }

    private long openOpportunityCountOf(String organizationName) {
        List<Map<String, Object>> matches = directoryRowsFor(organizationName);
        assertThat(matches).as("expected one directory row named %s", organizationName).hasSize(1);
        return ((Number) matches.get(0).get("openOpportunityCount")).longValue();
    }

    private String opportunityStatusOf(UUID opportunityId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM internship_opportunities WHERE id = ?", String.class, opportunityId);
    }

    private void setOrganizationVerificationStatus(UUID organizationId, String status) {
        jdbcTemplate.update("UPDATE organizations SET verification_status = ? WHERE id = ?", status, organizationId);
    }
}
