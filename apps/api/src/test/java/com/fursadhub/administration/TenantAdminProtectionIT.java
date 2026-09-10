package com.fursadhub.administration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A tenant can never be left without an administrator.
 *
 * <p>{@code ORGANIZATION_ADMIN} / {@code UNIVERSITY_ADMIN} is created in exactly one place — tenant
 * registration — and no endpoint can mint a second. Before this guard, live QA showed an admin could
 * suspend, revoke or demote THEMSELVES through staff management and leave the tenant with zero
 * administrators and no in-product recovery path: there is no Super Admin route that restores a
 * tenant membership either.
 *
 * <p>The guard is keyed on the TARGET membership's role, not on "is this me", so it also covers a
 * peer admin. Those cases are exercised here by inserting a second admin membership directly,
 * because no product path can create one — that is the whole point of the defence in depth.
 *
 * <p>The other half of this file is just as important: the admin's INTENDED authority over real
 * managed staff must be untouched.
 */
class TenantAdminProtectionIT extends AbstractPhase7IT {

    private static final String PROTECTED_CODE = "STAFF_ADMIN_MEMBERSHIP_PROTECTED";

    // ---------------------------------------------------------------- organization

    @Test
    void organizationAdminCannotSuspendRevokeDemoteOrResetTheirOwnMembership() {
        Tenant org = newOrganization("org-self");
        String base = "/api/v1/organizations/" + org.id() + "/members/" + org.adminMembershipId();

        assertProtected(authorizedPost(base + "/suspend", org.adminToken(), null), "self suspend");
        assertProtected(authorizedPost(base + "/revoke", org.adminToken(), null), "self revoke");
        assertProtected(authorizedPost(base + "/reset-password", org.adminToken(), null), "self reset-password");
        assertProtected(authorizedPost(base + "/role", org.adminToken(), Map.of("role", "RECRUITER")),
                "self demotion");
        assertProtected(authorizedPost(base + "/reactivate", org.adminToken(), null), "self reactivate");

        // Nothing moved: still an ACTIVE admin, still exactly one.
        assertThat(activeOrganizationAdmins(org.id())).isEqualTo(1);
        assertThat(roleOfOrganizationMembership(org.adminMembershipId())).isEqualTo("ORGANIZATION_ADMIN");
        assertThat(userStatusOfOrganizationMembership(org.adminMembershipId())).isEqualTo("ACTIVE");
        // And the admin can still administer the tenant afterwards.
        assertThat(authorizedGetList("/api/v1/organizations/" + org.id() + "/members", org.adminToken())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void organizationAdminCannotActOnAnotherAdminMembership() {
        Tenant org = newOrganization("org-peer");
        // No product path creates a second admin; inserted directly so the guard is exercised anyway.
        String peerEmail = uniqueEmail(emailPrefix("org-peer-admin"));
        registerVerifiedUser(peerEmail);
        UUID peerMembershipId =
                insertOrganizationMembership(org.id(), userIdOf(peerEmail), "ORGANIZATION_ADMIN");
        String base = "/api/v1/organizations/" + org.id() + "/members/" + peerMembershipId;

        assertProtected(authorizedPost(base + "/suspend", org.adminToken(), null), "peer suspend");
        assertProtected(authorizedPost(base + "/revoke", org.adminToken(), null), "peer revoke");
        assertProtected(authorizedPost(base + "/reset-password", org.adminToken(), null), "peer reset");
        assertProtected(authorizedPost(base + "/role", org.adminToken(), Map.of("role", "RECRUITER")),
                "peer demotion");

        assertThat(roleOfOrganizationMembership(peerMembershipId)).isEqualTo("ORGANIZATION_ADMIN");
        assertThat(activeOrganizationAdmins(org.id())).isEqualTo(2);
    }

    @Test
    void organizationAdminRetainsFullAuthorityOverRealManagedStaff() {
        Tenant org = newOrganization("org-staff-ok");
        UUID recruiter = createOrganizationStaff(org, "RECRUITER");
        String base = "/api/v1/organizations/" + org.id() + "/members/" + recruiter;

        requireOk(authorizedPost(base + "/suspend", org.adminToken(), null), "suspend recruiter");
        assertThat(userStatusOfOrganizationMembership(recruiter)).isEqualTo("SUSPENDED");
        requireOk(authorizedPost(base + "/reactivate", org.adminToken(), null), "reactivate recruiter");
        assertThat(userStatusOfOrganizationMembership(recruiter)).isEqualTo("ACTIVE");

        ResponseEntity<Map> reset = authorizedPost(base + "/reset-password", org.adminToken(), null);
        requireOk(reset, "reset recruiter password");
        assertThat(reset.getBody().get("temporaryPassword")).isNotNull();

        requireOk(authorizedPost(base + "/role", org.adminToken(), Map.of("role", "ORGANIZATION_SUPERVISOR")),
                "promote recruiter to supervisor");
        assertThat(roleOfOrganizationMembership(recruiter)).isEqualTo("ORGANIZATION_SUPERVISOR");

        // B5/B5.5 identity commands still work on managed staff.
        requireOk(authorizedPost(base + "/display-name", org.adminToken(), Map.of("displayName", "Amina Yusuf")),
                "set display name");

        requireOk(authorizedPost(base + "/revoke", org.adminToken(), null), "revoke recruiter");
        assertThat(authorizedPost(base + "/suspend", org.adminToken(), null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);

        // A supervisor is equally manageable.
        UUID supervisor = createOrganizationStaff(org, "ORGANIZATION_SUPERVISOR");
        requireOk(authorizedPost("/api/v1/organizations/" + org.id() + "/members/" + supervisor + "/suspend",
                org.adminToken(), null), "suspend supervisor");
    }

    // ---------------------------------------------------------------- university

    @Test
    void universityAdminCannotSuspendRevokeDemoteOrResetTheirOwnMembership() {
        Tenant uni = newUniversity("uni-self");
        String base = "/api/v1/universities/" + uni.id() + "/staff/" + uni.adminMembershipId();

        assertProtected(authorizedPost(base + "/suspend", uni.adminToken(), null), "self suspend");
        assertProtected(authorizedPost(base + "/revoke", uni.adminToken(), null), "self revoke");
        assertProtected(authorizedPost(base + "/reset-password", uni.adminToken(), null), "self reset-password");
        // A REAL department is supplied so scope validation cannot mask the guard.
        assertProtected(authorizedPost(base + "/role", uni.adminToken(),
                Map.of("role", "DEPARTMENT_COORDINATOR", "departmentIds", List.of(uni.departmentId()))),
                "self demotion");
        assertProtected(authorizedPost(base + "/reactivate", uni.adminToken(), null), "self reactivate");

        assertThat(activeUniversityAdmins(uni.id())).isEqualTo(1);
        assertThat(roleOfUniversityMembership(uni.adminMembershipId())).isEqualTo("UNIVERSITY_ADMIN");
        assertThat(authorizedGetList("/api/v1/universities/" + uni.id() + "/staff", uni.adminToken())
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void universityAdminCannotActOnAnotherAdminMembership() {
        Tenant uni = newUniversity("uni-peer");
        String peerEmail = uniqueEmail(emailPrefix("uni-peer-admin"));
        registerVerifiedUser(peerEmail);
        UUID peerMembershipId =
                insertUniversityMembership(uni.id(), userIdOf(peerEmail), "UNIVERSITY_ADMIN", List.of());
        String base = "/api/v1/universities/" + uni.id() + "/staff/" + peerMembershipId;

        assertProtected(authorizedPost(base + "/suspend", uni.adminToken(), null), "peer suspend");
        assertProtected(authorizedPost(base + "/revoke", uni.adminToken(), null), "peer revoke");
        assertProtected(authorizedPost(base + "/reset-password", uni.adminToken(), null), "peer reset");
        assertProtected(authorizedPost(base + "/role", uni.adminToken(),
                Map.of("role", "UNIVERSITY_SUPERVISOR", "departmentIds", List.of(uni.departmentId()))),
                "peer demotion");

        assertThat(roleOfUniversityMembership(peerMembershipId)).isEqualTo("UNIVERSITY_ADMIN");
        assertThat(activeUniversityAdmins(uni.id())).isEqualTo(2);
    }

    @Test
    void universityAdminRetainsFullAuthorityOverRealManagedStaff() {
        Tenant uni = newUniversity("uni-staff-ok");
        UUID coordinator = createUniversityStaff(uni, "DEPARTMENT_COORDINATOR");
        String base = "/api/v1/universities/" + uni.id() + "/staff/" + coordinator;

        requireOk(authorizedPost(base + "/suspend", uni.adminToken(), null), "suspend coordinator");
        requireOk(authorizedPost(base + "/reactivate", uni.adminToken(), null), "reactivate coordinator");

        ResponseEntity<Map> reset = authorizedPost(base + "/reset-password", uni.adminToken(), null);
        requireOk(reset, "reset coordinator password");
        assertThat(reset.getBody().get("temporaryPassword")).isNotNull();

        requireOk(authorizedPost(base + "/role", uni.adminToken(),
                Map.of("role", "UNIVERSITY_SUPERVISOR", "departmentIds", List.of(uni.departmentId()))),
                "change coordinator role and scope");
        assertThat(roleOfUniversityMembership(coordinator)).isEqualTo("UNIVERSITY_SUPERVISOR");

        requireOk(authorizedPost(base + "/display-name", uni.adminToken(), Map.of("displayName", "Hodan Ali")),
                "set display name");
        requireOk(authorizedPost(base + "/revoke", uni.adminToken(), null), "revoke coordinator");
    }

    // ---------------------------------------------------------------- helpers

    private record Tenant(UUID id, String adminToken, UUID adminMembershipId, UUID departmentId) {
    }

    private void assertProtected(ResponseEntity<Map> response, String what) {
        assertThat(response.getStatusCode()).as(what + " status").isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code")).as(what + " code").isEqualTo(PROTECTED_CODE);
    }

    private Tenant newOrganization(String prefix) {
        String adminToken = registerVerifiedAndLogin(emailPrefix(prefix + "-admin"));
        UUID organizationId = createVerifiedOrganization(adminToken, prefix + " Org " + UUID.randomUUID());
        UUID membershipId = jdbcTemplate.queryForObject(
                "SELECT id FROM organization_memberships WHERE organization_id = ? AND role = 'ORGANIZATION_ADMIN'",
                UUID.class, organizationId);
        return new Tenant(organizationId, adminToken, membershipId, null);
    }

    private Tenant newUniversity(String prefix) {
        String adminEmail = uniqueEmail(emailPrefix(prefix + "-admin"));
        registerVerifiedUser(adminEmail);
        String adminToken = loginAndExtractAccessToken(adminEmail, "Password123");
        UUID universityId = insertVerifiedUniversity(prefix + " University " + UUID.randomUUID());
        UUID departmentId = insertDepartment(universityId, "Computing", "CS-" + UUID.randomUUID().toString().substring(0, 6));
        UUID membershipId =
                insertUniversityMembership(universityId, userIdOf(adminEmail), "UNIVERSITY_ADMIN", List.of());
        return new Tenant(universityId, adminToken, membershipId, departmentId);
    }

    private UUID createOrganizationStaff(Tenant org, String role) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/organizations/" + org.id() + "/members",
                org.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("org-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", role));
        requireOk(response, "create " + role);
        return UUID.fromString((String) response.getBody().get("membershipId"));
    }

    private UUID createUniversityStaff(Tenant uni, String role) {
        ResponseEntity<Map> response = authorizedPost("/api/v1/universities/" + uni.id() + "/staff",
                uni.adminToken(),
                Map.of("email", uniqueEmail(emailPrefix("uni-staff")), "password", "Password123",
                        "confirmPassword", "Password123", "username", uniqueUsername(), "role", role,
                        "departmentIds", List.of(uni.departmentId())));
        requireOk(response, "create " + role);
        return UUID.fromString((String) response.getBody().get("membershipId"));
    }

    private int activeOrganizationAdmins(UUID organizationId) {
        return jdbcTemplate.queryForObject(
                "SELECT count(*) FROM organization_memberships WHERE organization_id = ? "
                        + "AND role = 'ORGANIZATION_ADMIN' AND revoked_at IS NULL",
                Integer.class, organizationId);
    }

    private int activeUniversityAdmins(UUID universityId) {
        return jdbcTemplate.queryForObject(
                "SELECT count(*) FROM university_memberships WHERE university_id = ? "
                        + "AND role = 'UNIVERSITY_ADMIN' AND revoked_at IS NULL",
                Integer.class, universityId);
    }

    private String roleOfOrganizationMembership(UUID membershipId) {
        return jdbcTemplate.queryForObject(
                "SELECT role FROM organization_memberships WHERE id = ?", String.class, membershipId);
    }

    private String roleOfUniversityMembership(UUID membershipId) {
        return jdbcTemplate.queryForObject(
                "SELECT role FROM university_memberships WHERE id = ?", String.class, membershipId);
    }

    private String userStatusOfOrganizationMembership(UUID membershipId) {
        return jdbcTemplate.queryForObject(
                "SELECT u.status FROM users u JOIN organization_memberships m ON m.user_id = u.id WHERE m.id = ?",
                String.class, membershipId);
    }

    private String uniqueUsername() {
        return "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
