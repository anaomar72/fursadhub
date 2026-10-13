package com.fursadhub.administration.domain;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Locks the intent of the platform permission catalog (Phase C1). A change here is a security policy
 * change and should be a deliberate, reviewed edit of the expected sets below.
 */
class PlatformPermissionCatalogTest {

    @Test
    void reservedPermissionsAreExactlyTheApprovedButUnbuiltCapabilities() {
        Set<PlatformPermission> reserved = Arrays.stream(PlatformPermission.values())
                .filter(p -> !p.isAvailable())
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(PlatformPermission.class)));

        assertThat(reserved).containsExactlyInAnyOrder(
                PlatformPermission.INSTITUTION_REINSTATE, PlatformPermission.SUPPORT_REQUEST_HANDLE);
    }

    @Test
    void superAdminOnlyPermissionsAreRevocationReinstatementAndLegalPublication() {
        Set<PlatformPermission> superAdminOnly = Arrays.stream(PlatformPermission.values())
                .filter(p -> p.assignability() == PlatformPermission.Assignability.SUPER_ADMIN_ONLY)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(PlatformPermission.class)));

        assertThat(superAdminOnly).containsExactlyInAnyOrder(
                PlatformPermission.INSTITUTION_REVOKE, PlatformPermission.INSTITUTION_REINSTATE,
                PlatformPermission.LEGAL_DOCUMENT_PUBLISH);
    }

    @Test
    void grantableExcludesReservedAndSuperAdminOnlyPermissions() {
        Set<PlatformPermission> grantable = PlatformPermission.grantable();

        assertThat(grantable).hasSize(12)
                .doesNotContain(PlatformPermission.INSTITUTION_REVOKE, PlatformPermission.INSTITUTION_REINSTATE,
                        PlatformPermission.LEGAL_DOCUMENT_PUBLISH, PlatformPermission.SUPPORT_REQUEST_HANDLE);
        assertThat(grantable).allSatisfy(p -> {
            assertThat(p.isAvailable()).isTrue();
            assertThat(p.assignability()).isEqualTo(PlatformPermission.Assignability.ASSIGNABLE);
        });
    }

    @Test
    void availableIsEveryNonReservedPermission() {
        assertThat(PlatformPermission.available())
                .hasSize(PlatformPermission.values().length - 2)
                .contains(PlatformPermission.INSTITUTION_REVOKE)
                .doesNotContain(PlatformPermission.INSTITUTION_REINSTATE, PlatformPermission.SUPPORT_REQUEST_HANDLE);
    }

    @Test
    void everyPermissionHasACategory() {
        assertThat(PlatformPermission.values()).allSatisfy(p -> assertThat(p.category()).isNotNull());
    }

    @Test
    void rootCapabilitiesCanNeverBeExpressedAsCatalogPermissions() {
        Set<String> permissionNames = Arrays.stream(PlatformPermission.values()).map(Enum::name).collect(Collectors.toSet());
        Set<String> systemRoleNames = Arrays.stream(PlatformRole.values()).map(Enum::name).collect(Collectors.toSet());

        assertThat(Arrays.stream(PlatformRootCapability.values()).map(Enum::name))
                .noneMatch(permissionNames::contains);
        // A system role name is never a grantable permission either: SUPER_ADMIN is not a checkbox.
        assertThat(systemRoleNames).noneMatch(permissionNames::contains);
    }

    @Test
    void verificationOfficerHoldsOnlyNormalReviewPermissions() {
        assertThat(PlatformAccessPolicy.VERIFICATION_OFFICER_PERMISSIONS).containsExactlyInAnyOrder(
                PlatformPermission.INSTITUTION_REVIEW_READ,
                PlatformPermission.INSTITUTION_REVIEW_DECIDE,
                PlatformPermission.STUDENT_ESCALATION_REVIEW);
        assertThat(PlatformAccessPolicy.VERIFICATION_OFFICER_PERMISSIONS)
                .allSatisfy(p -> assertThat(p.isAvailable()).isTrue());
    }
}
