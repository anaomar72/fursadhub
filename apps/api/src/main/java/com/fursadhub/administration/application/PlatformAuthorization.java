package com.fursadhub.administration.application;

import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformAdminRepository;
import com.fursadhub.administration.domain.PlatformRole;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * The single authorization boundary for platform-level administration (CLAUDE.md section 24).
 *
 * <p>Every check re-reads the caller's grants from PostgreSQL. Nothing is decided from a JWT claim,
 * so revoking someone's platform role takes effect on their next request rather than when their
 * access token expires — which matters most in exactly the case you would revoke it for.
 *
 * <p>Two rules beyond "has the role":
 *
 * <ul>
 *   <li>The account itself must be ACTIVE. A SUSPENDED admin holds no authority, so an admin who
 *       suspends a colleague — or is suspended by one — cannot keep administering with an access
 *       token minted moments before.</li>
 *   <li>Authority is split. {@code VERIFICATION_OFFICER} exists to review institutions and escalated
 *       student cases and to read the evidence attached to them. It cannot suspend accounts, grant
 *       platform roles, or publish legal documents — those are {@code SUPER_ADMIN} only. Handing
 *       every reviewer full platform power would make the second role pointless.</li>
 * </ul>
 *
 * <p>There is deliberately no impersonation capability anywhere in this module: Phase 7 forbids it
 * outright, and an admin console that can become another user makes every audit event ambiguous
 * about who actually acted.
 */
@Component
public class PlatformAuthorization {

    /** Roles permitted to review institutions, escalated student cases, and their private evidence. */
    private static final Set<PlatformRole> REVIEWER_ROLES =
            Set.of(PlatformRole.SUPER_ADMIN, PlatformRole.VERIFICATION_OFFICER);

    private final PlatformAdminRepository platformAdmins;
    private final UserRepository users;

    public PlatformAuthorization(PlatformAdminRepository platformAdmins, UserRepository users) {
        this.platformAdmins = platformAdmins;
        this.users = users;
    }

    /**
     * Full platform authority: account suspension, platform-role grants, legal-document publication,
     * privacy-request processing, audit reading and statistics.
     */
    public PlatformAdmin requireSuperAdmin(UUID actingUserId) {
        return require(actingUserId, Set.of(PlatformRole.SUPER_ADMIN));
    }

    /** Verification authority: institution review, escalated student cases, verification evidence. */
    public PlatformAdmin requireReviewer(UUID actingUserId) {
        return require(actingUserId, REVIEWER_ROLES);
    }

    /** True when the caller holds ANY active platform grant. Drives navigation only — never access. */
    public boolean isPlatformAdmin(UUID userId) {
        return accountIsActive(userId) && !platformAdmins.findActiveByUserId(userId).isEmpty();
    }

    public List<PlatformAdmin> activeGrantsOf(UUID userId) {
        return platformAdmins.findActiveByUserId(userId);
    }

    private PlatformAdmin require(UUID actingUserId, Set<PlatformRole> permitted) {
        if (!accountIsActive(actingUserId)) {
            throw accessDenied();
        }
        return platformAdmins.findActiveByUserId(actingUserId).stream()
                .filter(grant -> permitted.contains(grant.getRole()))
                .findFirst()
                .orElseThrow(PlatformAuthorization::accessDenied);
    }

    private boolean accountIsActive(UUID userId) {
        return users.findById(userId).map(User::getStatus).orElse(null) == UserStatus.ACTIVE;
    }

    /**
     * Always the same opaque 403, whether the caller holds the wrong platform role or none at all.
     * Distinguishing those would let anyone probe for who the platform administrators are.
     */
    private static ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
