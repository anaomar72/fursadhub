package com.fursadhub.administration.application;

import com.fursadhub.administration.domain.EffectivePlatformAccess;
import com.fursadhub.administration.domain.PlatformAccessPolicy;
import com.fursadhub.administration.domain.PlatformAccessRepository;
import com.fursadhub.administration.domain.PlatformPermission;
import com.fursadhub.administration.domain.PlatformRootCapability;
import com.fursadhub.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Permission-based platform authorization (Phase C1 foundation).
 *
 * <p><strong>Not yet wired to any endpoint.</strong> Every existing admin route still goes through
 * {@link PlatformAuthorization#requireSuperAdmin}/{@link PlatformAuthorization#requireReviewer}, so
 * production behavior is unchanged. Phase C2 migrates call sites to {@link #requirePermission} one
 * capability at a time (see the C1 compatibility map).
 *
 * <p>Every call resolves from current PostgreSQL data — two indexed queries, no cache — so revoking
 * a grant or deactivating a role takes effect on the very next request. Failures are the same opaque
 * {@code ACCESS_DENIED} {@link PlatformAuthorization} uses, so the response never reveals which
 * permission was missing or whether the caller is staff at all.
 */
@Component
public class PlatformPermissionAuthorization {

    private final PlatformAccessRepository accessRepository;

    public PlatformPermissionAuthorization(PlatformAccessRepository accessRepository) {
        this.accessRepository = accessRepository;
    }

    /** The caller's effective access right now. Also the basis of a future effective-access preview. */
    @Transactional(readOnly = true)
    public EffectivePlatformAccess resolve(UUID userId) {
        return PlatformAccessPolicy.resolve(accessRepository.load(userId));
    }

    @Transactional(readOnly = true)
    public EffectivePlatformAccess requirePermission(UUID actingUserId, PlatformPermission permission) {
        EffectivePlatformAccess access = resolve(actingUserId);
        if (!access.has(permission)) {
            throw accessDenied();
        }
        return access;
    }

    /** Root operations: an active SUPER_ADMIN, and nobody else, ever. */
    @Transactional(readOnly = true)
    public EffectivePlatformAccess requireRoot(UUID actingUserId, PlatformRootCapability capability) {
        EffectivePlatformAccess access = resolve(actingUserId);
        if (!access.holds(capability)) {
            throw accessDenied();
        }
        return access;
    }

    /**
     * Account-targeted operations (suspend, reactivate, …). Beyond holding {@code permission}, only a
     * Super Admin may act on an account that holds ANY platform grant — checked against the target's
     * grants regardless of its status, so a suspended Super Admin cannot be reactivated, nor an active
     * one suspended, by someone holding only {@code USER_ACCOUNT_*}.
     */
    @Transactional(readOnly = true)
    public EffectivePlatformAccess requireAuthorityOverAccount(
            UUID actingUserId, UUID targetUserId, PlatformPermission permission) {
        EffectivePlatformAccess access = requirePermission(actingUserId, permission);
        if (!access.isSuperAdmin() && accessRepository.load(targetUserId).holdsAnyPlatformGrant()) {
            throw accessDenied();
        }
        return access;
    }

    private static ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
