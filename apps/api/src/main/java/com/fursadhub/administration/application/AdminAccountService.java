package com.fursadhub.administration.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.application.LogoutService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Account suspension and reactivation (Phase 7 "Admin: account suspension").
 *
 * <p>Suspension is only half a security control if the suspended person keeps working: their access
 * token stays valid for up to ten more minutes and their refresh token for thirty more days. So
 * suspending also revokes every active refresh session in the SAME transaction. The worst case
 * becomes a few minutes on an already-issued access token — and every authorization component in
 * FursadHub re-reads account status from PostgreSQL, so even that token buys nothing.
 *
 * <p>There is no impersonation here, deliberately: Phase 7 forbids it, and an admin who can act as
 * another user makes every audit event in the system ambiguous about who really acted.
 */
@Service
public class AdminAccountService {

    private final PlatformAuthorization authorization;
    private final UserRepository users;
    private final LogoutService logoutService;
    private final NotificationService notifications;
    private final AuditService audit;

    public AdminAccountService(
            PlatformAuthorization authorization,
            UserRepository users,
            LogoutService logoutService,
            NotificationService notifications,
            AuditService audit) {
        this.authorization = authorization;
        this.users = users;
        this.logoutService = logoutService;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<User> search(UUID actingUserId, String emailFragment, UserStatus status, Pageable pageable) {
        authorization.requireSuperAdmin(actingUserId);
        return users.search(emailFragment, status, pageable);
    }

    @Transactional(readOnly = true)
    public User get(UUID actingUserId, UUID userId) {
        authorization.requireSuperAdmin(actingUserId);
        return users.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "No such account."));
    }

    /**
     * Suspends an account and kills its sessions. Idempotent: suspending an already-suspended account
     * changes nothing and writes no second audit event.
     */
    @Transactional
    public void suspend(UUID actingUserId, UUID targetUserId, String reason, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        if (actingUserId.equals(targetUserId)) {
            throw new ApiException("CANNOT_SUSPEND_SELF", HttpStatus.CONFLICT,
                    "You cannot suspend your own account.");
        }

        User target = requireUser(targetUserId);
        if (target.getStatus() == UserStatus.SUSPENDED) {
            return;
        }
        if (target.getStatus() == UserStatus.CLOSED) {
            throw new ApiException("USER_CLOSED", HttpStatus.CONFLICT, "A closed account cannot be suspended.");
        }

        target.suspend();
        users.save(target);
        // Same transaction as the status change: a suspension that committed without revoking
        // sessions would leave the account working for another thirty days.
        logoutService.logoutAll(targetUserId, ip, userAgent);
        audit.record("ACCOUNT_SUSPENDED", actingUserId, ip, userAgent,
                "user " + targetUserId + (reason == null || reason.isBlank() ? "" : " - " + reason));
        // The reason is NOT sent to the account holder: it is an internal note for the audit trail,
        // and a suspension reason may concern an investigation that telling them about would harm.
        notifications.notify(targetUserId, NotificationType.ACCOUNT_SUSPENDED, Map.of(), null, target.getEmail());
    }

    /** Lifts a suspension. Idempotent, and refuses anything that is not currently SUSPENDED. */
    @Transactional
    public void reactivate(UUID actingUserId, UUID targetUserId, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        User target = requireUser(targetUserId);
        if (target.getStatus() != UserStatus.SUSPENDED) {
            if (target.getStatus() == UserStatus.CLOSED) {
                throw new ApiException("USER_CLOSED", HttpStatus.CONFLICT,
                        "A closed account cannot be reactivated.");
            }
            return;
        }

        target.reactivate();
        users.save(target);
        audit.record("ACCOUNT_REACTIVATED", actingUserId, ip, userAgent, "user " + targetUserId);
        notifications.notify(targetUserId, NotificationType.ACCOUNT_REACTIVATED, Map.of(), null, target.getEmail());
    }

    private User requireUser(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "No such account."));
    }
}
