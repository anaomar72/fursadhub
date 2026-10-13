package com.fursadhub.administration.domain;

import com.fursadhub.identity.domain.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PlatformAccessPolicyTest {

    private static PlatformAccessSnapshot snapshot(
            UserStatus status, boolean tenantTies, Set<PlatformRole> roles, Set<String> custom, Set<String> direct) {
        return new PlatformAccessSnapshot(status, tenantTies, roles, custom, direct);
    }

    private static PlatformAccessSnapshot active(Set<PlatformRole> roles, Set<String> custom, Set<String> direct) {
        return snapshot(UserStatus.ACTIVE, false, roles, custom, direct);
    }

    @Test
    void missingAccountHoldsNothing() {
        assertThat(PlatformAccessPolicy.resolve(null).isPlatformStaff()).isFalse();
        assertThat(PlatformAccessPolicy.resolve(snapshot(null, false, Set.of(PlatformRole.SUPER_ADMIN), Set.of(), Set.of()))
                .isPlatformStaff()).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = UserStatus.class, names = {"PENDING_CONTACT_VERIFICATION", "SUSPENDED", "CLOSED"})
    void nonActiveAccountHoldsNothingWhateverItWasGranted(UserStatus status) {
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(snapshot(status, false,
                Set.of(PlatformRole.SUPER_ADMIN, PlatformRole.VERIFICATION_OFFICER),
                Set.of("AUDIT_READ"), Set.of("USER_ACCOUNT_READ")));

        assertThat(access.isSuperAdmin()).isFalse();
        assertThat(access.permissions()).isEmpty();
        assertThat(access.holds(PlatformRootCapability.SYSTEM_ROLE_MANAGE)).isFalse();
    }

    @Test
    void accountWithNoGrantsIsNotPlatformStaff() {
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(active(Set.of(), Set.of(), Set.of()));

        assertThat(access.isPlatformStaff()).isFalse();
        assertThat(access.permissions()).isEmpty();
    }

    @Test
    void superAdminHoldsEveryAvailablePermissionAndEveryRootCapabilityButNoReservedOne() {
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(active(Set.of(PlatformRole.SUPER_ADMIN), Set.of(), Set.of()));

        assertThat(access.isSuperAdmin()).isTrue();
        assertThat(access.permissions()).isEqualTo(PlatformPermission.available());
        assertThat(access.has(PlatformPermission.INSTITUTION_REVOKE)).isTrue();
        assertThat(access.has(PlatformPermission.INSTITUTION_REINSTATE)).isFalse();
        assertThat(access.has(PlatformPermission.SUPPORT_REQUEST_HANDLE)).isFalse();
        for (PlatformRootCapability capability : PlatformRootCapability.values()) {
            assertThat(access.holds(capability)).isTrue();
        }
    }

    @Test
    void verificationOfficerHoldsExactlyTheReviewBundleAndNoRootCapability() {
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(active(Set.of(PlatformRole.VERIFICATION_OFFICER), Set.of(), Set.of()));

        assertThat(access.permissions()).isEqualTo(PlatformAccessPolicy.VERIFICATION_OFFICER_PERMISSIONS);
        assertThat(access.has(PlatformPermission.INSTITUTION_SUSPEND)).isFalse();
        assertThat(access.has(PlatformPermission.INSTITUTION_REVOKE)).isFalse();
        assertThat(access.isSuperAdmin()).isFalse();
        for (PlatformRootCapability capability : PlatformRootCapability.values()) {
            assertThat(access.holds(capability)).isFalse();
        }
    }

    @Test
    void effectiveAccessIsTheUnionOfEverySourceAndRecordsWhereEachCameFrom() {
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(active(
                Set.of(PlatformRole.VERIFICATION_OFFICER),
                Set.of("INSTITUTION_SUSPEND", "INSTITUTION_REVIEW_READ"),
                Set.of("AUDIT_READ")));

        assertThat(access.permissions()).containsExactlyInAnyOrder(
                PlatformPermission.INSTITUTION_REVIEW_READ,
                PlatformPermission.INSTITUTION_REVIEW_DECIDE,
                PlatformPermission.STUDENT_ESCALATION_REVIEW,
                PlatformPermission.INSTITUTION_SUSPEND,
                PlatformPermission.AUDIT_READ);
        assertThat(access.sources().get(PlatformPermission.INSTITUTION_REVIEW_READ)).containsExactlyInAnyOrder(
                EffectivePlatformAccess.Source.VERIFICATION_OFFICER, EffectivePlatformAccess.Source.CUSTOM_ROLE);
        assertThat(access.sources().get(PlatformPermission.AUDIT_READ))
                .containsExactly(EffectivePlatformAccess.Source.DIRECT_GRANT);
        assertThat(access.isSuperAdmin()).isFalse();
    }

    @Test
    void customAndDirectGrantsCanNeverConferRootOrSuperAdminOnlyAuthority() {
        // Even if a bad row reached the snapshot, a non-grantable or unknown code is ignored.
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(active(Set.of(),
                Set.of("INSTITUTION_REVOKE", "SUPER_ADMIN", "SYSTEM_ROLE_MANAGE", "NOT_A_PERMISSION"),
                Set.of("INSTITUTION_REINSTATE", "SUPPORT_REQUEST_HANDLE", "", "audit_read")));

        assertThat(access.permissions()).isEmpty();
        assertThat(access.isSuperAdmin()).isFalse();
        assertThat(access.holds(PlatformRootCapability.PLATFORM_ACCESS_MANAGE)).isFalse();
    }

    @Test
    void holdingEveryGrantablePermissionStillIsNotSuperAdmin() {
        Set<String> everything = PlatformPermission.grantable().stream().map(Enum::name)
                .collect(java.util.stream.Collectors.toSet());

        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(active(Set.of(), everything, everything));

        assertThat(access.permissions()).isEqualTo(PlatformPermission.grantable());
        assertThat(access.isSuperAdmin()).isFalse();
        assertThat(access.has(PlatformPermission.INSTITUTION_REVOKE)).isFalse();
        for (PlatformRootCapability capability : PlatformRootCapability.values()) {
            assertThat(access.holds(capability)).isFalse();
        }
    }

    @Test
    void tenantOrStudentAccountGainsNothingFromCustomRolesOrDirectGrants() {
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(snapshot(UserStatus.ACTIVE, true,
                Set.of(), Set.of("AUDIT_READ"), Set.of("USER_ACCOUNT_SUSPEND")));

        assertThat(access.isPlatformStaff()).isFalse();
    }

    @Test
    void existingSystemRolesOnAMixedAccountKeepTheirCurrentMeaning() {
        // Compatibility (decision D-4): legacy grants on mixed accounts are not silently revoked.
        EffectivePlatformAccess access = PlatformAccessPolicy.resolve(snapshot(UserStatus.ACTIVE, true,
                Set.of(PlatformRole.VERIFICATION_OFFICER), Set.of("AUDIT_READ"), Set.of()));

        assertThat(access.permissions()).isEqualTo(PlatformAccessPolicy.VERIFICATION_OFFICER_PERMISSIONS);
    }
}
