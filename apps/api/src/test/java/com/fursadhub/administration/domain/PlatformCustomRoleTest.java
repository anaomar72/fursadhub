package com.fursadhub.administration.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PlatformCustomRoleTest {

    private final UUID admin = UUID.randomUUID();

    private static String codeOf(Throwable thrown) {
        return ((ApiException) thrown).getCode();
    }

    @Test
    void createsWithTrimmedNameAndTheRequestedPermissions() {
        PlatformCustomRole role = PlatformCustomRole.create("  Compliance desk ", " Privacy queue ",
                List.of(PlatformPermission.PRIVACY_REQUEST_PROCESS, PlatformPermission.AUDIT_READ), admin);

        assertThat(role.getName()).isEqualTo("Compliance desk");
        assertThat(role.getDescription()).isEqualTo("Privacy queue");
        assertThat(role.isActive()).isTrue();
        assertThat(role.getPermissions()).containsExactlyInAnyOrder(
                PlatformPermission.PRIVACY_REQUEST_PROCESS, PlatformPermission.AUDIT_READ);
    }

    @Test
    void everyNonGrantablePermissionIsRefused() {
        Arrays.stream(PlatformPermission.values()).filter(p -> !p.isGrantable()).forEach(p ->
                assertThatThrownBy(() -> PlatformCustomRole.create("Role " + p, null, List.of(p), admin))
                        .satisfies(e -> assertThat(codeOf(e)).isEqualTo("PLATFORM_PERMISSION_NOT_GRANTABLE")));
    }

    @Test
    void anEmptyRoleIsRefused() {
        assertThatThrownBy(() -> PlatformCustomRole.create("Empty", null, Set.of(), admin))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("PLATFORM_CUSTOM_ROLE_EMPTY"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPER_ADMIN", "Super Admin", "super-admin", "VERIFICATION_OFFICER", "Verification  Officer"})
    void systemRoleNamesAreReserved(String name) {
        assertThatThrownBy(() -> PlatformCustomRole.create(name, null, List.of(PlatformPermission.AUDIT_READ), admin))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("PLATFORM_CUSTOM_ROLE_NAME_RESERVED"));
    }

    @Test
    void aDeactivatedRoleCannotBeEditedAndDeactivationIsIdempotent() {
        PlatformCustomRole role = PlatformCustomRole.create("Auditors", null, List.of(PlatformPermission.AUDIT_READ), admin);
        role.deactivate(admin);
        role.deactivate(UUID.randomUUID());

        assertThat(role.isActive()).isFalse();
        assertThat(role.getDeactivatedByUserId()).isEqualTo(admin);
        assertThatThrownBy(() -> role.replacePermissions(List.of(PlatformPermission.USER_ACCOUNT_READ)))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("PLATFORM_CUSTOM_ROLE_INACTIVE"));
    }

    @Test
    void grantsRefuseSelfGrantsAndNonGrantablePermissions() {
        UUID staff = UUID.randomUUID();

        assertThatThrownBy(() -> PlatformStaffPermissionGrant.grant(staff, PlatformPermission.AUDIT_READ, staff))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("PLATFORM_SELF_GRANT_FORBIDDEN"));
        assertThatThrownBy(() -> PlatformStaffPermissionGrant.grant(staff, PlatformPermission.INSTITUTION_REVOKE, admin))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("PLATFORM_PERMISSION_NOT_GRANTABLE"));
        assertThatThrownBy(() -> PlatformStaffRoleAssignment.assign(staff, UUID.randomUUID(), staff))
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo("PLATFORM_SELF_GRANT_FORBIDDEN"));
    }

    @Test
    void revocationIsASoftIdempotentClose() {
        PlatformStaffPermissionGrant grant = PlatformStaffPermissionGrant.grant(UUID.randomUUID(), PlatformPermission.AUDIT_READ, admin);
        grant.revoke(admin);
        var firstRevokedAt = grant.getRevokedAt();
        grant.revoke(UUID.randomUUID());

        assertThat(grant.isActive()).isFalse();
        assertThat(grant.getRevokedAt()).isEqualTo(firstRevokedAt);
        assertThat(grant.getRevokedByUserId()).isEqualTo(admin);
    }
}
