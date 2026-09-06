package com.fursadhub.administration.application;

import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformAdminRepository;
import com.fursadhub.administration.domain.PlatformRole;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.application.LogoutService;
import com.fursadhub.identity.domain.DisplayNamePolicy;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.identity.domain.UsernamePolicy;
import com.fursadhub.identity.infrastructure.TemporaryPasswordGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Super-Admin-scoped provisioning and credential management for managed platform staff
 * (Backend Phase B5.6).
 *
 * <p><strong>Exactly one role is provisionable: {@code VERIFICATION_OFFICER}.</strong> The role is
 * not a request field — this service assigns it — so there is no input through which a caller could
 * ask for {@code SUPER_ADMIN}. That is deliberate: the cheapest way to prevent a privilege-escalation
 * parameter is not to accept one.
 *
 * <p><strong>Super Admin is never a target.</strong> Every mutation here refuses a user who holds an
 * active {@code SUPER_ADMIN} grant, checked live against PostgreSQL and never from a token claim.
 * The reason is specific and load-bearing: under Backend Phase B5.5, assigning a username
 * immediately disables that account's email login. Applied to a root administrator — including one
 * who merely also happens to hold {@code VERIFICATION_OFFICER} — that would silently change how the
 * platform's recovery account authenticates, which is exactly the account that must stay
 * predictable. Super Admin remains a bootstrap/deliberate-grant identity.
 */
@Service
public class PlatformAccountService {

    /** The only role this service will ever create or manage. */
    private static final PlatformRole MANAGED_ROLE = PlatformRole.VERIFICATION_OFFICER;

    private final PlatformAuthorization authorization;
    private final PlatformAdminRepository platformAdmins;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;
    private final LogoutService logoutService;
    private final AuditService audit;

    public PlatformAccountService(
            PlatformAuthorization authorization, PlatformAdminRepository platformAdmins, UserRepository users,
            PasswordEncoder passwordEncoder, TemporaryPasswordGenerator temporaryPasswordGenerator,
            LogoutService logoutService, AuditService audit) {
        this.authorization = authorization;
        this.platformAdmins = platformAdmins;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.temporaryPasswordGenerator = temporaryPasswordGenerator;
        this.logoutService = logoutService;
        this.audit = audit;
    }

    /** One managed platform account: the user, plus the single role this service grants. */
    public record PlatformAccount(User user, PlatformRole role) {
    }

    /** A one-time credential, returned once to the Super Admin who reset it. */
    public record PlatformCredential(UUID userId, String username, String email, String temporaryPassword) {
    }

    /**
     * Lists the managed verification officers the console may act on (Backend Phase B5.6).
     *
     * <p>Filtered to the exact set the other two commands accept, so the console never renders an
     * "assign username" or "reset credentials" button that the server would refuse: active
     * {@code VERIFICATION_OFFICER} grants, minus anyone who also holds {@code SUPER_ADMIN}.
     *
     * <p>Excluding dual-role accounts here is presentation, not protection — {@link
     * #requireManagedOfficerTarget} refuses them regardless of what the console sends. Both exist
     * because a list is a UX affordance and an authorization check is a boundary, and hiding a row
     * is not a way to secure it.
     */
    @Transactional(readOnly = true)
    public List<PlatformAccount> listVerificationOfficers(UUID actingUserId) {
        authorization.requireSuperAdmin(actingUserId);

        return platformAdmins.findAllOrderByGrantedAtDesc().stream()
                .filter(PlatformAdmin::isActive)
                .filter(grant -> grant.getRole() == MANAGED_ROLE)
                .filter(grant -> platformAdmins
                        .findActiveByUserIdAndRole(grant.getUserId(), PlatformRole.SUPER_ADMIN).isEmpty())
                .flatMap(grant -> users.findById(grant.getUserId()).stream())
                .map(officer -> new PlatformAccount(officer, MANAGED_ROLE))
                .toList();
    }

    /**
     * Creates a brand-new managed {@code VERIFICATION_OFFICER}, atomically.
     *
     * <p>ONE transaction covers the account, its username, its role grant and the audit record. That
     * matters more here than for institution staff: a half-provisioned PRIVILEGED account — a user
     * with a reviewer grant but no usable credential, or a credential with no grant — is both a
     * security problem and invisible until someone tries to use it. A duplicate username or email
     * therefore rolls the whole thing back, leaving no orphan.
     *
     * <p>{@code saveAndFlush} forces a uniqueness violation to surface HERE rather than at commit,
     * where it could escape the constraint translator as a {@code TransactionSystemException} and
     * become a 500 (the Backend Phase B5.5 lesson).
     *
     * <p>The account is created already {@code ACTIVE} with its email marked verified, matching the
     * institution managed-staff convention (CLAUDE.md section 26A): the Super Admin typed this
     * person's address and is vouching for it, so username login works immediately.
     */
    @Transactional
    public PlatformAccount createVerificationOfficer(
            UUID actingUserId, String rawDisplayName, String rawUsername, String rawEmail,
            String password, String confirmPassword, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);

        if (!password.equals(confirmPassword)) {
            throw new ApiException("PLATFORM_ACCOUNT_PASSWORD_CONFIRMATION_MISMATCH", HttpStatus.BAD_REQUEST,
                    "Password and confirmation do not match.");
        }

        String displayName = DisplayNamePolicy.normalize(rawDisplayName);
        if (displayName == null) {
            // Required for a NEW managed officer: the console identifies platform staff by name, and
            // nothing derives one from the username or the email address.
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, "A display name is required.");
        }
        String username = UsernamePolicy.canonicalize(rawUsername);
        String email = EmailNormalizer.normalize(rawEmail);

        if (users.existsByEmail(email)) {
            throw new ApiException("PLATFORM_ACCOUNT_EMAIL_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "An account with this email already exists.");
        }
        if (users.existsByUsername(username)) {
            throw new ApiException("USERNAME_ALREADY_EXISTS", HttpStatus.CONFLICT, "That username is already taken.");
        }

        User officer = User.register(email, passwordEncoder.encode(password), "en");
        officer.markEmailVerified();
        officer.changeDisplayName(displayName);
        officer.assignUsername(username);
        users.saveAndFlush(officer);

        platformAdmins.save(PlatformAdmin.grant(officer.getId(), MANAGED_ROLE, actingUserId));

        audit.record("PLATFORM_ACCOUNT_CREATED", actingUserId, ip, userAgent,
                "targetUserId=" + officer.getId() + ";role=" + MANAGED_ROLE);

        return new PlatformAccount(officer, MANAGED_ROLE);
    }

    /**
     * Assigns the login username to an EXISTING verification officer, once (Backend Phase B5.6).
     *
     * <p>The migration path for officers who were self-registered and granted the role before B5.6.
     * It is deliberate and irreversible in one direction: on success the officer's email stops
     * authenticating them and their username starts, with the same password. The Super Admin must
     * therefore tell them their new login identifier — which is why the console warns before doing
     * it. The password is NOT reset as a side effect.
     */
    @Transactional
    public PlatformAccount assignUsername(
            UUID actingUserId, UUID targetUserId, String rawUsername, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);
        User officer = requireManagedOfficerTarget(targetUserId);

        String username = UsernamePolicy.canonicalize(rawUsername);
        if (!username.equals(officer.getUsername()) && users.existsByUsername(username)) {
            throw new ApiException("USERNAME_ALREADY_EXISTS", HttpStatus.CONFLICT, "That username is already taken.");
        }

        if (officer.assignUsername(username)) {
            users.saveAndFlush(officer);
            audit.record("PLATFORM_ACCOUNT_USERNAME_ASSIGNED", actingUserId, ip, userAgent,
                    "targetUserId=" + officer.getId());
        }
        return new PlatformAccount(officer, MANAGED_ROLE);
    }

    /**
     * Sets or replaces a managed officer's display name (Backend Phase B5.6).
     *
     * <p>Two things need it. A legacy officer — granted the role before B5.6 — has no display name at
     * all and would otherwise show in the console as a bare email address forever. And a newly
     * provisioned officer's name is typed once at creation, so without this a typo in someone's name
     * would be permanent, which is a poor thing to do to a colleague.
     *
     * <p><strong>Replacement only: there is no clear.</strong> The normalized result must be a real
     * name, so a caller cannot blank one out — see {@code ChangeVerificationOfficerDisplayNameRequest}
     * for why this differs from the institution command, which does support clearing and therefore
     * needs presence-awareness to distinguish {@code {}} from an explicit null.
     *
     * <p>Nothing is derived from the email address or the username. A name is what a person is
     * called, and guessing it from an account identifier gets it wrong in exactly the market
     * FursadHub serves.
     */
    @Transactional
    public PlatformAccount changeDisplayName(
            UUID actingUserId, UUID targetUserId, String rawDisplayName, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);
        // Checked BEFORE the payload: a super admin target is refused whether or not the name is
        // valid, so the response cannot differ based on what was sent about a protected account.
        User officer = requireManagedOfficerTarget(targetUserId);

        String displayName = DisplayNamePolicy.normalize(rawDisplayName);
        if (displayName == null) {
            // Reachable past @NotBlank only for a value made of Unicode space separators (U+00A0 and
            // friends), which Character.isWhitespace does not recognise but DisplayNamePolicy does.
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, "A display name is required.");
        }

        officer.changeDisplayName(displayName);
        users.save(officer);

        audit.record("PLATFORM_ACCOUNT_DISPLAY_NAME_CHANGED", actingUserId, ip, userAgent,
                "targetUserId=" + officer.getId());

        return new PlatformAccount(officer, MANAGED_ROLE);
    }

    /**
     * Issues a new temporary password for a managed officer (Backend Phase B5.6).
     *
     * <p>Restricted to officers who already authenticate by username: an officer still on email login
     * has the ordinary self-service forgot-password route, and this command exists because a
     * username-managed account has no such route the Super Admin can trigger on their behalf.
     *
     * <p>Every existing session is revoked, so a reset genuinely locks the previous holder out rather
     * than leaving a live refresh token behind. The plaintext is returned exactly once and is never
     * written to the audit trail or the logs (CLAUDE.md section 68).
     */
    @Transactional
    public PlatformCredential resetCredentials(
            UUID actingUserId, UUID targetUserId, String ip, String userAgent) {
        authorization.requireSuperAdmin(actingUserId);
        User officer = requireManagedOfficerTarget(targetUserId);

        if (!officer.hasUsername()) {
            throw new ApiException("PLATFORM_ACCOUNT_NOT_USERNAME_MANAGED", HttpStatus.CONFLICT,
                    "This officer still signs in with their email. Assign a username first.");
        }

        String temporaryPassword = temporaryPasswordGenerator.generate();
        officer.changePasswordHash(passwordEncoder.encode(temporaryPassword));
        users.save(officer);
        logoutService.logoutAll(officer.getId(), ip, userAgent);

        audit.record("PLATFORM_ACCOUNT_CREDENTIAL_RESET", actingUserId, ip, userAgent,
                "targetUserId=" + officer.getId());

        return new PlatformCredential(
                officer.getId(), officer.getUsername(), officer.getEmail(), temporaryPassword);
    }

    /**
     * Resolves a target that this service is permitted to touch: an existing account that holds
     * {@code VERIFICATION_OFFICER} and does NOT hold {@code SUPER_ADMIN}.
     *
     * <p>The Super Admin exclusion is checked SECOND and independently of the officer check, so a
     * dual-role account — someone who holds both — is refused rather than accepted on the strength of
     * the officer grant. Both checks read active grants from PostgreSQL.
     */
    private User requireManagedOfficerTarget(UUID targetUserId) {
        User target = users.findById(targetUserId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "No such account."));

        if (platformAdmins.findActiveByUserIdAndRole(targetUserId, PlatformRole.SUPER_ADMIN).isPresent()) {
            throw new ApiException("PLATFORM_ROOT_ACCOUNT_PROTECTED", HttpStatus.FORBIDDEN,
                    "A super admin account's identity and credentials cannot be managed here.");
        }
        if (platformAdmins.findActiveByUserIdAndRole(targetUserId, MANAGED_ROLE).isEmpty()) {
            throw new ApiException("PLATFORM_ACCOUNT_NOT_MANAGED", HttpStatus.CONFLICT,
                    "This account is not a verification officer.");
        }
        if (target.getStatus() == UserStatus.CLOSED) {
            throw new ApiException("USER_NOT_ACTIVE", HttpStatus.CONFLICT, "This account is closed.");
        }
        return target;
    }
}
