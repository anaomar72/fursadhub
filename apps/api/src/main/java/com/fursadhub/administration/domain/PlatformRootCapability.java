package com.fursadhub.administration.domain;

/**
 * Protected root operations (Phase C1, decision D-7). Held by an active {@code SUPER_ADMIN} and by
 * nobody else, ever.
 *
 * <p>Deliberately a separate type from {@link PlatformPermission}: nothing that stores, lists or
 * grants catalog permissions can express one of these, so no custom role, direct grant or future
 * checkbox UI can confer them. Each maps to existing {@code requireSuperAdmin} call sites.
 */
public enum PlatformRootCapability {
    /** Grant or revoke system roles, including SUPER_ADMIN ({@code PlatformAdminService}). */
    SYSTEM_ROLE_MANAGE,
    /** Create platform staff, set usernames and names, reset credentials ({@code PlatformAccountService}). */
    PLATFORM_STAFF_MANAGE,
    /** Create, edit, deactivate and assign custom roles and direct grants (Phase C2). */
    PLATFORM_ACCESS_MANAGE
}
