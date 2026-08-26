package com.fursadhub.administration.application;

import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformAdminRepository;
import com.fursadhub.administration.domain.PlatformRole;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Grants and revokes platform roles (CLAUDE.md section 23). SUPER_ADMIN only — a
 * VERIFICATION_OFFICER cannot promote anyone, least of all themselves.
 */
@Service
public class PlatformAdminService {

    private final PlatformAuthorization authorization;
    private final PlatformAdminRepository platformAdmins;
    private final UserRepository users;
    private final AuditService audit;

    public PlatformAdminService(
            PlatformAuthorization authorization, PlatformAdminRepository platformAdmins,
            UserRepository users, AuditService audit) {
        this.authorization = authorization;
        this.platformAdmins = platformAdmins;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<PlatformAdmin> list(UUID actingUserId) {
        authorization.requireSuperAdmin(actingUserId);
        return platformAdmins.findAllOrderByGrantedAtDesc();
    }

    /**
     * Grants a platform role.
     *
     * <p>Re-granting a role the target already holds is a no-op rather than an error, and the
     * uniqueness of an active grant is enforced by the partial unique index, not by a read-then-write
     * — two administrators clicking Grant at the same moment produce one grant, not two.
     */
    @Transactional
    public PlatformAdmin grant(UUID actingUserId, UUID targetUserId, PlatformRole role, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        User target = users.findById(targetUserId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "No such account."));
        if (target.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException("USER_NOT_ACTIVE", HttpStatus.CONFLICT,
                    "Only an active account can be granted a platform role.");
        }

        // The ordinary "clicked Grant twice" case is two sequential requests, and this read catches
        // it: re-granting a role the target already holds is a no-op, not a second grant.
        Optional<PlatformAdmin> existing = platformAdmins.findActiveByUserIdAndRole(targetUserId, role);
        if (existing.isPresent()) {
            return existing.get();
        }

        try {
            PlatformAdmin granted = platformAdmins.save(PlatformAdmin.grant(targetUserId, role, actingUserId));
            audit.record("PLATFORM_ROLE_GRANTED", actingUserId, ip, userAgent,
                    role + " granted to user " + targetUserId);
            return granted;
        } catch (DataIntegrityViolationException e) {
            // Two administrators granting the same role at the same instant. The partial unique index
            // — not this Java check — is what guarantees one active grant, so the other request's
            // grant stands and this one reports a conflict.
            //
            // Deliberately NOT re-querying to return the winner: the violation has already marked
            // this transaction rollback-only, so any further read here would fail. A conflict the
            // caller can retry is honest; a fabricated success would not be.
            throw new ApiException("PLATFORM_ROLE_CONFLICT", HttpStatus.CONFLICT,
                    "That platform role was granted by someone else at the same time. Reload and check.");
        }
    }

    /**
     * Revokes a platform role.
     *
     * <p>Refuses to revoke the LAST active SUPER_ADMIN. Without that guard a single mis-click could
     * leave the platform with nobody able to administer it and no supported way back in, since the
     * configuration bootstrap is inert once any grant exists.
     */
    @Transactional
    public void revoke(UUID actingUserId, UUID grantId, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        PlatformAdmin grant = platformAdmins.findById(grantId)
                .orElseThrow(() -> new ApiException("PLATFORM_ROLE_NOT_FOUND", HttpStatus.NOT_FOUND, "No such platform role grant."));
        if (!grant.isActive()) {
            return;
        }
        if (grant.getRole() == PlatformRole.SUPER_ADMIN && isLastSuperAdmin(grant)) {
            throw new ApiException("LAST_SUPER_ADMIN", HttpStatus.CONFLICT,
                    "The last super admin cannot be revoked. Grant the role to another account first.");
        }

        grant.revoke(actingUserId);
        platformAdmins.save(grant);
        audit.record("PLATFORM_ROLE_REVOKED", actingUserId, ip, userAgent,
                grant.getRole() + " revoked from user " + grant.getUserId());
    }

    /** True when no OTHER active SUPER_ADMIN grant exists. */
    private boolean isLastSuperAdmin(PlatformAdmin grant) {
        return platformAdmins.findAllOrderByGrantedAtDesc().stream()
                .filter(PlatformAdmin::isActive)
                .filter(other -> other.getRole() == PlatformRole.SUPER_ADMIN)
                .noneMatch(other -> !other.getId().equals(grant.getId()));
    }
}
