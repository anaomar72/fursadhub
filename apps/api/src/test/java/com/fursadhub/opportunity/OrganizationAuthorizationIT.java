package com.fursadhub.opportunity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 3 mandatory organization isolation / role-authorization tests (CLAUDE.md section 14/60 and
 * the Phase 3 spec section 19 "Organization isolation" / "Role behavior").
 */
class OrganizationAuthorizationIT extends AbstractPhase3IT {

    @Test
    void orgAAdminCannotReadOrgBManagementData() {
        String adminAToken = registerAndLogin("org-a-admin");
        createOrganization(adminAToken, "Org A " + UUID.randomUUID());

        String adminBToken = registerAndLogin("org-b-admin");
        UUID organizationB = createOrganization(adminBToken, "Org B " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedGet("/api/v1/organizations/" + organizationB, adminAToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void orgAAdminCannotUpdateOrgB() {
        String adminAToken = registerAndLogin("org-a-admin-upd");
        createOrganization(adminAToken, "Org A " + UUID.randomUUID());

        String adminBToken = registerAndLogin("org-b-admin-upd");
        UUID organizationB = createOrganization(adminBToken, "Org B " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPatch("/api/v1/organizations/" + organizationB, adminAToken,
                Map.of("name", "Hijacked Name"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void orgARecruiterCannotMutateOrgBOpportunity() {
        String adminBToken = registerAndLogin("org-b-admin-opp");
        UUID organizationB = createVerifiedOrganization(adminBToken, "Org B " + UUID.randomUUID());
        UUID opportunityB = createDraftOpportunity(adminBToken, organizationB, "PUBLIC", Map.of());

        String recruiterAEmail = uniqueEmail("org-a-recruiter");
        register(recruiterAEmail, "Password123");
        UUID recruiterAId = userIdOf(recruiterAEmail);
        String adminAToken = registerAndLogin("org-a-admin-opp");
        UUID organizationA = createOrganization(adminAToken, "Org A " + UUID.randomUUID());
        insertOrganizationMembership(organizationA, recruiterAId, "RECRUITER");
        String recruiterAToken = loginAndExtractAccessToken(recruiterAEmail, "Password123");

        ResponseEntity<Map> response = authorizedPatch("/api/v1/opportunities/" + opportunityB, recruiterAToken,
                draftOpportunityBody("PUBLIC", Map.of("title", "Hijacked title")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void randomAuthenticatedUserCannotManageAnOrganization() {
        String ownerToken = registerAndLogin("org-owner");
        UUID organizationId = createOrganization(ownerToken, "Owned Org " + UUID.randomUUID());

        String randomToken = registerAndLogin("random-user");

        ResponseEntity<Map> response = authorizedGet("/api/v1/organizations/" + organizationId, randomToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void organizationSupervisorDoesNotGetOpportunityManagementAccessByDefault() {
        String adminToken = registerAndLogin("org-supervisor-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Supervisor Org " + UUID.randomUUID());

        String supervisorEmail = uniqueEmail("org-supervisor");
        register(supervisorEmail, "Password123");
        UUID supervisorId = userIdOf(supervisorEmail);
        insertOrganizationMembership(organizationId, supervisorId, "ORGANIZATION_SUPERVISOR");
        String supervisorToken = loginAndExtractAccessToken(supervisorEmail, "Password123");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organizationId + "/opportunities", supervisorToken,
                draftOpportunityBody("PUBLIC", Map.of()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).isEqualTo("ACCESS_DENIED");
    }

    @Test
    void recruiterIsAllowedToCreateAnOpportunity() {
        String adminToken = registerAndLogin("recruiter-org-admin");
        UUID organizationId = createVerifiedOrganization(adminToken, "Recruiter Org " + UUID.randomUUID());

        String recruiterEmail = uniqueEmail("recruiter");
        register(recruiterEmail, "Password123");
        UUID recruiterId = userIdOf(recruiterEmail);
        insertOrganizationMembership(organizationId, recruiterId, "RECRUITER");
        String recruiterToken = loginAndExtractAccessToken(recruiterEmail, "Password123");

        ResponseEntity<Map> response = authorizedPost(
                "/api/v1/organizations/" + organizationId + "/opportunities", recruiterToken,
                draftOpportunityBody("PUBLIC", Map.of()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void organizationAdminCanUpdateItsOwnOrganizationProfile() {
        String adminToken = registerAndLogin("profile-admin");
        UUID organizationId = createOrganization(adminToken, "Profile Org " + UUID.randomUUID());

        ResponseEntity<Map> response = authorizedPatch("/api/v1/organizations/" + organizationId, adminToken,
                Map.of("name", "Updated Name", "description", "Updated description"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("name")).isEqualTo("Updated Name");
    }
}
