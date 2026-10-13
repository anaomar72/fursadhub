package com.fursadhub.administration.domain;

import com.fursadhub.identity.domain.UserStatus;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Effective platform permission resolution (Phase C1) — a pure function of a
 * {@link PlatformAccessSnapshot}, so every rule is unit-testable without a database.
 *
 * <ol>
 *   <li>A non-ACTIVE (or missing) account holds nothing, whatever it has been granted.</li>
 *   <li>An active {@code SUPER_ADMIN} grant confers every AVAILABLE permission — including the
 *       Super-Admin-only ones — and every {@link PlatformRootCapability}.</li>
 *   <li>An active {@code VERIFICATION_OFFICER} grant confers the fixed
 *       {@link #VERIFICATION_OFFICER_PERMISSIONS} set.</li>
 *   <li>Custom-role and direct-grant permissions count ONLY for a dedicated platform identity — an
 *       account with no tenant membership and no student enrollment — and only if grantable. A
 *       student, university or organization account can never gain platform authority through
 *       these new mechanisms, even if a row were inserted for it by mistake.</li>
 *   <li>Reserved permissions are never effective, and unrecognised codes are ignored.</li>
 * </ol>
 *
 * <p>Revoked grants and deactivated roles never reach this class: the snapshot only carries active
 * rows. Nothing here reads a JWT claim.
 */
public final class PlatformAccessPolicy {

    /**
     * The predefined Verification Officer role (decision D-5): normal verification review only.
     * Suspension needs an explicit grant; revocation and reinstatement are Super Admin only.
     */
    public static final Set<PlatformPermission> VERIFICATION_OFFICER_PERMISSIONS = Collections.unmodifiableSet(EnumSet.of(
            PlatformPermission.INSTITUTION_REVIEW_READ,
            PlatformPermission.INSTITUTION_REVIEW_DECIDE,
            PlatformPermission.STUDENT_ESCALATION_REVIEW));

    private PlatformAccessPolicy() {
    }

    public static EffectivePlatformAccess resolve(PlatformAccessSnapshot snapshot) {
        if (snapshot == null || snapshot.accountStatus() != UserStatus.ACTIVE) {
            return EffectivePlatformAccess.none();
        }

        Set<PlatformRole> roles = snapshot.systemRoles();
        boolean superAdmin = roles.contains(PlatformRole.SUPER_ADMIN);
        Map<PlatformPermission, Set<EffectivePlatformAccess.Source>> sources = new EnumMap<>(PlatformPermission.class);

        if (superAdmin) {
            PlatformPermission.available().forEach(p -> add(sources, p, EffectivePlatformAccess.Source.SUPER_ADMIN));
        }
        if (roles.contains(PlatformRole.VERIFICATION_OFFICER)) {
            VERIFICATION_OFFICER_PERMISSIONS.forEach(p -> add(sources, p, EffectivePlatformAccess.Source.VERIFICATION_OFFICER));
        }
        if (!snapshot.hasTenantOrStudentTies()) {
            addGrantable(sources, snapshot.customRolePermissionCodes(), EffectivePlatformAccess.Source.CUSTOM_ROLE);
            addGrantable(sources, snapshot.directPermissionCodes(), EffectivePlatformAccess.Source.DIRECT_GRANT);
        }

        return new EffectivePlatformAccess(superAdmin, roles, sources);
    }

    private static void addGrantable(
            Map<PlatformPermission, Set<EffectivePlatformAccess.Source>> sources, Set<String> codes,
            EffectivePlatformAccess.Source source) {
        for (String code : codes) {
            PlatformPermission permission = parse(code);
            if (permission != null && permission.isGrantable()) {
                add(sources, permission, source);
            }
        }
    }

    private static PlatformPermission parse(String code) {
        try {
            return code == null ? null : PlatformPermission.valueOf(code);
        } catch (IllegalArgumentException unknown) {
            return null;
        }
    }

    private static void add(
            Map<PlatformPermission, Set<EffectivePlatformAccess.Source>> sources, PlatformPermission permission,
            EffectivePlatformAccess.Source source) {
        sources.computeIfAbsent(permission, ignored -> EnumSet.noneOf(EffectivePlatformAccess.Source.class)).add(source);
    }
}
