package com.fursadhub.administration;

import com.fursadhub.administration.application.PlatformPermissionAuthorization;
import com.fursadhub.administration.domain.EffectivePlatformAccess;
import com.fursadhub.administration.domain.PlatformAccessPolicy;
import com.fursadhub.administration.domain.PlatformCustomRole;
import com.fursadhub.administration.domain.PlatformCustomRoleRepository;
import com.fursadhub.administration.domain.PlatformPermission;
import com.fursadhub.administration.domain.PlatformRootCapability;
import com.fursadhub.administration.domain.PlatformStaffPermissionGrant;
import com.fursadhub.administration.domain.PlatformStaffPermissionGrantRepository;
import com.fursadhub.administration.domain.PlatformStaffRoleAssignment;
import com.fursadhub.administration.domain.PlatformStaffRoleAssignmentRepository;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.AbstractIdentityIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Phase C1: the platform RBAC foundation against real PostgreSQL (V53).
 *
 * <p>Nothing here exercises an HTTP endpoint — C1 deliberately wires no route to the new model — so
 * these tests drive the resolver, repositories and schema directly.
 */
class PlatformRbacFoundationIT extends AbstractIdentityIT {

    @Autowired
    private PlatformPermissionAuthorization authorization;

    @Autowired
    private PlatformCustomRoleRepository roles;

    @Autowired
    private PlatformStaffRoleAssignmentRepository assignments;

    @Autowired
    private PlatformStaffPermissionGrantRepository grants;

    @Autowired
    private PlatformTransactionManager transactionManager;

    // ---------------------------------------------------------------- catalog vs schema

    @Test
    void grantTableCheckConstraintsAdmitExactlyTheGrantableCatalog() {
        Set<String> expected = PlatformPermission.grantable().stream().map(Enum::name).collect(Collectors.toSet());

        for (String constraint : List.of(
                "ck_platform_custom_role_permissions_grantable", "ck_platform_staff_permission_grants_grantable")) {
            String definition = jdbcTemplate.queryForObject(
                    "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = ?", String.class, constraint);
            Set<String> admitted = new java.util.HashSet<>();
            Matcher matcher = Pattern.compile("'([A-Z_]+)'").matcher(definition);
            while (matcher.find()) {
                admitted.add(matcher.group(1));
            }
            assertThat(admitted).as(constraint).isEqualTo(expected);
        }
    }

    // ---------------------------------------------------------------- compatibility

    @Test
    void existingSystemGrantsKeepTheirMeaningAfterTheMigration() {
        UUID superAdmin = activeUser("c1-legacy-sa");
        UUID officer = activeUser("c1-legacy-vo");
        insertSystemRole(superAdmin, "SUPER_ADMIN");
        insertSystemRole(officer, "VERIFICATION_OFFICER");

        EffectivePlatformAccess sa = authorization.resolve(superAdmin);
        EffectivePlatformAccess vo = authorization.resolve(officer);

        assertThat(sa.isSuperAdmin()).isTrue();
        assertThat(sa.permissions()).isEqualTo(PlatformPermission.available());
        assertThat(vo.isSuperAdmin()).isFalse();
        assertThat(vo.permissions()).isEqualTo(PlatformAccessPolicy.VERIFICATION_OFFICER_PERMISSIONS);
    }

    @Test
    void studentAndTenantRolesImplyNoPlatformPermissions() {
        UUID universityId = insertUniversity();
        UUID organizationId = insertOrganization();
        UUID departmentId = insertDepartment(universityId);

        List<UUID> tenantAccounts = new ArrayList<>();
        for (String role : List.of("UNIVERSITY_ADMIN", "DEPARTMENT_COORDINATOR", "UNIVERSITY_SUPERVISOR")) {
            UUID user = activeUser("c1-" + role.toLowerCase());
            insertUniversityMembership(universityId, user, role);
            tenantAccounts.add(user);
        }
        for (String role : List.of("ORGANIZATION_ADMIN", "RECRUITER", "ORGANIZATION_SUPERVISOR")) {
            UUID user = activeUser("c1-" + role.toLowerCase());
            insertOrganizationMembership(organizationId, user, role);
            tenantAccounts.add(user);
        }
        UUID student = activeUser("c1-student");
        insertVerifiedEnrollment(student, universityId, departmentId);
        tenantAccounts.add(student);
        tenantAccounts.add(activeUser("c1-plain"));

        for (UUID account : tenantAccounts) {
            EffectivePlatformAccess access = authorization.resolve(account);
            assertThat(access.isPlatformStaff()).as(account.toString()).isFalse();
            assertThatThrownBy(() -> authorization.requirePermission(account, PlatformPermission.INSTITUTION_REVIEW_READ))
                    .isInstanceOf(ApiException.class);
        }
    }

    // ---------------------------------------------------------------- resolution

    @Test
    void customRolesAndDirectGrantsUnionForADedicatedStaffAccount() {
        UUID grantor = activeUser("c1-grantor");
        UUID staff = activeUser("c1-staff");
        PlatformCustomRole compliance = roles.save(PlatformCustomRole.create("Compliance " + UUID.randomUUID(), null,
                List.of(PlatformPermission.PRIVACY_REQUEST_PROCESS, PlatformPermission.AUDIT_READ), grantor));
        assignments.save(PlatformStaffRoleAssignment.assign(staff, compliance.getId(), grantor));
        grants.save(PlatformStaffPermissionGrant.grant(staff, PlatformPermission.INSTITUTION_SUSPEND, grantor));

        EffectivePlatformAccess access = authorization.resolve(staff);

        assertThat(access.permissions()).containsExactlyInAnyOrder(
                PlatformPermission.PRIVACY_REQUEST_PROCESS, PlatformPermission.AUDIT_READ, PlatformPermission.INSTITUTION_SUSPEND);
        assertThat(access.isSuperAdmin()).isFalse();
        assertThatThrownBy(() -> authorization.requireRoot(staff, PlatformRootCapability.PLATFORM_ACCESS_MANAGE))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void revokedAssignmentsAndGrantsStopContributingImmediately() {
        UUID grantor = activeUser("c1-revoker");
        UUID staff = activeUser("c1-revoked");
        PlatformCustomRole auditors = roles.save(PlatformCustomRole.create("Auditors " + UUID.randomUUID(), null,
                List.of(PlatformPermission.AUDIT_READ), grantor));
        PlatformStaffRoleAssignment assignment = assignments.save(PlatformStaffRoleAssignment.assign(staff, auditors.getId(), grantor));
        PlatformStaffPermissionGrant grant = grants.save(PlatformStaffPermissionGrant.grant(staff, PlatformPermission.USER_ACCOUNT_READ, grantor));
        assertThat(authorization.resolve(staff).permissions()).hasSize(2);

        assignment.revoke(grantor);
        assignments.save(assignment);
        grant.revoke(grantor);
        grants.save(grant);

        assertThat(authorization.resolve(staff).isPlatformStaff()).isFalse();
        // History is kept, not deleted.
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_staff_role_assignments WHERE user_id = ? AND revoked_at IS NOT NULL",
                Integer.class, staff)).isEqualTo(1);
    }

    @Test
    void deactivatingARoleRemovesItsPermissionsFromEveryHolder() {
        UUID grantor = activeUser("c1-deactivator");
        UUID first = activeUser("c1-holder-a");
        UUID second = activeUser("c1-holder-b");
        PlatformCustomRole moderators = roles.save(PlatformCustomRole.create("Moderators " + UUID.randomUUID(), null,
                List.of(PlatformPermission.TESTIMONIAL_MODERATE), grantor));
        assignments.save(PlatformStaffRoleAssignment.assign(first, moderators.getId(), grantor));
        assignments.save(PlatformStaffRoleAssignment.assign(second, moderators.getId(), grantor));
        assertThat(assignments.findActiveByCustomRoleId(moderators.getId())).hasSize(2);

        PlatformCustomRole reloaded = roles.findById(moderators.getId()).orElseThrow();
        reloaded.deactivate(grantor);
        roles.save(reloaded);

        assertThat(authorization.resolve(first).isPlatformStaff()).isFalse();
        assertThat(authorization.resolve(second).isPlatformStaff()).isFalse();
    }

    @Test
    void anInactiveAccountHoldsNothingEvenAsSuperAdmin() {
        String email = uniqueEmail("c1-suspended-sa");
        registerAndVerify(email, "Password123");
        UUID superAdmin = userIdOf(email);
        insertSystemRole(superAdmin, "SUPER_ADMIN");
        suspendUser(email);

        assertThat(authorization.resolve(superAdmin).isPlatformStaff()).isFalse();
        assertThatThrownBy(() -> authorization.requireRoot(superAdmin, PlatformRootCapability.SYSTEM_ROLE_MANAGE))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void aMixedAccountGainsNothingFromCustomGrantsButKeepsItsLegacySystemRole() {
        UUID grantor = activeUser("c1-mixed-grantor");
        UUID mixed = activeUser("c1-mixed");
        insertOrganizationMembership(insertOrganization(), mixed, "RECRUITER");
        insertSystemRole(mixed, "VERIFICATION_OFFICER");
        grants.save(PlatformStaffPermissionGrant.grant(mixed, PlatformPermission.AUDIT_READ, grantor));

        assertThat(authorization.resolve(mixed).permissions()).isEqualTo(PlatformAccessPolicy.VERIFICATION_OFFICER_PERMISSIONS);
    }

    // ---------------------------------------------------------------- protected Super Admin

    @Test
    void accountPermissionsCannotTargetPlatformStaffWithoutSuperAdmin() {
        UUID grantor = activeUser("c1-acct-grantor");
        UUID operator = activeUser("c1-acct-operator");
        grants.save(PlatformStaffPermissionGrant.grant(operator, PlatformPermission.USER_ACCOUNT_SUSPEND, grantor));
        grants.save(PlatformStaffPermissionGrant.grant(operator, PlatformPermission.USER_ACCOUNT_REACTIVATE, grantor));

        String saEmail = uniqueEmail("c1-target-sa");
        registerAndVerify(saEmail, "Password123");
        UUID superAdmin = userIdOf(saEmail);
        insertSystemRole(superAdmin, "SUPER_ADMIN");
        UUID ordinary = activeUser("c1-target-plain");

        assertThat(authorization.requireAuthorityOverAccount(operator, ordinary, PlatformPermission.USER_ACCOUNT_SUSPEND)).isNotNull();
        assertThatThrownBy(() -> authorization.requireAuthorityOverAccount(operator, superAdmin, PlatformPermission.USER_ACCOUNT_SUSPEND))
                .isInstanceOf(ApiException.class);
        // Still protected while suspended: a suspended Super Admin cannot be reactivated by the operator.
        suspendUser(saEmail);
        assertThatThrownBy(() -> authorization.requireAuthorityOverAccount(operator, superAdmin, PlatformPermission.USER_ACCOUNT_REACTIVATE))
                .isInstanceOf(ApiException.class);

        UUID otherSuperAdmin = activeUser("c1-acting-sa");
        insertSystemRole(otherSuperAdmin, "SUPER_ADMIN");
        assertThat(authorization.requireAuthorityOverAccount(otherSuperAdmin, superAdmin, PlatformPermission.USER_ACCOUNT_REACTIVATE))
                .isNotNull();
    }

    // ---------------------------------------------------------------- database constraints

    @Test
    void theDatabaseRefusesNonGrantableAndUnknownPermissionCodes() {
        UUID grantor = activeUser("c1-db-grantor");
        UUID staff = activeUser("c1-db-staff");
        UUID roleId = roles.save(PlatformCustomRole.create("DB " + UUID.randomUUID(), null,
                List.of(PlatformPermission.AUDIT_READ), grantor)).getId();

        for (String code : List.of("INSTITUTION_REVOKE", "INSTITUTION_REINSTATE", "SUPPORT_REQUEST_HANDLE",
                "SUPER_ADMIN", "SYSTEM_ROLE_MANAGE", "audit_read", "ANYTHING")) {
            assertThatThrownBy(() -> jdbcTemplate.update(
                    "INSERT INTO platform_custom_role_permissions (role_id, permission) VALUES (?, ?)", roleId, code))
                    .as(code).isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbcTemplate.update(
                    "INSERT INTO platform_staff_permission_grants (id, user_id, permission, granted_by_user_id) VALUES (?, ?, ?, ?)",
                    UUID.randomUUID(), staff, code, grantor))
                    .as(code).isInstanceOf(DataIntegrityViolationException.class);
        }
    }

    @Test
    void theDatabaseRefusesSelfGrantsReservedNamesAndDuplicates() {
        UUID grantor = activeUser("c1-dup-grantor");
        UUID staff = activeUser("c1-dup-staff");
        String name = "Dup " + UUID.randomUUID();
        UUID roleId = roles.save(PlatformCustomRole.create(name, null, List.of(PlatformPermission.AUDIT_READ), grantor)).getId();

        // Self-grant.
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO platform_staff_permission_grants (id, user_id, permission, granted_by_user_id) VALUES (?, ?, 'AUDIT_READ', ?)",
                UUID.randomUUID(), staff, staff)).isInstanceOf(DataIntegrityViolationException.class);
        // A system-role name, bypassing Java validation.
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO platform_custom_roles (id, name, created_by_user_id) VALUES (?, 'Super_Admin', ?)",
                UUID.randomUUID(), grantor)).isInstanceOf(DataIntegrityViolationException.class);
        // Case-insensitive duplicate name.
        assertThatThrownBy(() -> roles.save(PlatformCustomRole.create(name.toUpperCase(), null,
                List.of(PlatformPermission.AUDIT_READ), grantor))).isInstanceOf(DataIntegrityViolationException.class);
        // A second ACTIVE assignment of the same role; re-assignment after revocation is allowed.
        PlatformStaffRoleAssignment first = assignments.save(PlatformStaffRoleAssignment.assign(staff, roleId, grantor));
        assertThatThrownBy(() -> assignments.save(PlatformStaffRoleAssignment.assign(staff, roleId, grantor)))
                .isInstanceOf(DataIntegrityViolationException.class);
        first.revoke(grantor);
        assignments.save(first);
        assertThat(assignments.save(PlatformStaffRoleAssignment.assign(staff, roleId, grantor)).isActive()).isTrue();
    }

    // ---------------------------------------------------------------- concurrency

    @Test
    void concurrentEditsOfTheSameRoleAreDetectedNotSilentlyMerged() {
        UUID grantor = activeUser("c1-occ");
        UUID roleId = roles.save(PlatformCustomRole.create("OCC " + UUID.randomUUID(), null,
                List.of(PlatformPermission.AUDIT_READ), grantor)).getId();
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        // Two administrators open the same role.
        PlatformCustomRole first = tx.execute(status -> roles.findById(roleId).orElseThrow());
        PlatformCustomRole second = tx.execute(status -> roles.findById(roleId).orElseThrow());

        first.replacePermissions(List.of(PlatformPermission.AUDIT_READ, PlatformPermission.USER_ACCOUNT_READ));
        tx.executeWithoutResult(status -> roles.save(first));

        second.replacePermissions(List.of(PlatformPermission.TESTIMONIAL_MODERATE));
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> roles.save(second)))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);

        PlatformCustomRole stored = tx.execute(status -> roles.findById(roleId).orElseThrow());
        assertThat(stored.getPermissions()).containsExactlyInAnyOrder(
                PlatformPermission.AUDIT_READ, PlatformPermission.USER_ACCOUNT_READ);
        assertThat(stored.getVersion()).isGreaterThan(0);
    }

    @Test
    void concurrentIdenticalAssignmentsProduceExactlyOneActiveRow() throws Exception {
        UUID grantor = activeUser("c1-race-grantor");
        UUID staff = activeUser("c1-race-staff");
        UUID roleId = roles.save(PlatformCustomRole.create("Race " + UUID.randomUUID(), null,
                List.of(PlatformPermission.AUDIT_READ), grantor)).getId();
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        int attempts = 6;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                Callable<Boolean> attempt = () -> {
                    start.await();
                    try {
                        tx.executeWithoutResult(status -> assignments.save(PlatformStaffRoleAssignment.assign(staff, roleId, grantor)));
                        return true;
                    } catch (DataIntegrityViolationException duplicate) {
                        return false;
                    }
                };
                results.add(pool.submit(attempt));
            }
            start.countDown();
            long succeeded = 0;
            for (Future<Boolean> result : results) {
                if (result.get()) {
                    succeeded++;
                }
            }
            assertThat(succeeded).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platform_staff_role_assignments WHERE user_id = ? AND revoked_at IS NULL",
                Integer.class, staff)).isEqualTo(1);
    }

    // ---------------------------------------------------------------- fixtures

    private UUID activeUser(String prefix) {
        String email = uniqueEmail(prefix);
        registerAndVerify(email, "Password123");
        return userIdOf(email);
    }

    private UUID userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    private void insertSystemRole(UUID userId, String role) {
        jdbcTemplate.update("INSERT INTO platform_admins (id, user_id, role, granted_at) VALUES (?, ?, ?, now())",
                UUID.randomUUID(), userId, role);
    }

    private UUID insertUniversity() {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO universities (id, name, slug, city, status, created_at, updated_at) "
                + "VALUES (?, ?, ?, 'Mogadishu', 'VERIFIED', now(), now())", id, "C1 University " + id, "c1-univ-" + id);
        return id;
    }

    private UUID insertDepartment(UUID universityId) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO departments (id, university_id, name, code, created_at) VALUES (?, ?, 'CS', 'CS', now())",
                id, universityId);
        return id;
    }

    private UUID insertOrganization() {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO organizations (id, name, slug, type, verification_status, created_at, updated_at) "
                + "VALUES (?, ?, ?, 'COMPANY', 'VERIFIED', now(), now())", id, "C1 Org " + id, "c1-org-" + id);
        return id;
    }

    private void insertUniversityMembership(UUID universityId, UUID userId, String role) {
        jdbcTemplate.update("INSERT INTO university_memberships (id, university_id, user_id, role, assigned_at) VALUES (?, ?, ?, ?, now())",
                UUID.randomUUID(), universityId, userId, role);
    }

    private void insertOrganizationMembership(UUID organizationId, UUID userId, String role) {
        jdbcTemplate.update("INSERT INTO organization_memberships (id, organization_id, user_id, role, assigned_at) VALUES (?, ?, ?, ?, now())",
                UUID.randomUUID(), organizationId, userId, role);
    }

    private void insertVerifiedEnrollment(UUID studentUserId, UUID universityId, UUID departmentId) {
        jdbcTemplate.update("INSERT INTO student_enrollments (id, student_user_id, university_id, department_id, student_number, "
                        + "program, academic_year, verification_status, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, 'BSc', '2026', 'VERIFIED', now(), now())",
                UUID.randomUUID(), studentUserId, universityId, departmentId, "SN-" + UUID.randomUUID().toString().substring(0, 8));
    }
}
