package com.fursadhub.administration.domain;

import com.fursadhub.identity.domain.UserStatus;

import java.util.Set;

/**
 * Everything the effective-access policy needs about one account, read from PostgreSQL in a single
 * pass (Phase C1). Only ACTIVE (unrevoked) grants are included; permission codes are kept as raw
 * strings so the policy — not the loader — decides what an unrecognised code means (it is ignored).
 *
 * @param accountStatus            {@code null} when the account does not exist
 * @param hasTenantOrStudentTies   the account holds an active university/organization membership or a
 *                                 student enrollment — i.e. it is NOT a dedicated platform identity
 * @param systemRoles              active {@code platform_admins} roles
 * @param customRolePermissionCodes permissions of active assignments to ACTIVE custom roles
 * @param directPermissionCodes    active direct permission grants
 */
public record PlatformAccessSnapshot(
        UserStatus accountStatus,
        boolean hasTenantOrStudentTies,
        Set<PlatformRole> systemRoles,
        Set<String> customRolePermissionCodes,
        Set<String> directPermissionCodes) {

    public PlatformAccessSnapshot {
        systemRoles = Set.copyOf(systemRoles);
        customRolePermissionCodes = Set.copyOf(customRolePermissionCodes);
        directPermissionCodes = Set.copyOf(directPermissionCodes);
    }

    /** True when any active platform grant of any kind exists, regardless of account status. */
    public boolean holdsAnyPlatformGrant() {
        return !systemRoles.isEmpty() || !customRolePermissionCodes.isEmpty() || !directPermissionCodes.isEmpty();
    }
}
