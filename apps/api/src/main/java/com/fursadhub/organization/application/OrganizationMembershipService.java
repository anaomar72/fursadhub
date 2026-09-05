package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.application.LogoutService;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.DisplayNamePolicy;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.identity.infrastructure.TemporaryPasswordGenerator;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Organization-admin-scoped managed staff provisioning (CLAUDE.md section 26A), mirroring
 * {@code UniversityStaffService}'s pattern with no department-scope concept — organization roles
 * carry no sub-tenant scope. The account is created already {@code ACTIVE}: the admin who typed
 * this person's email is vouching for it directly, so there is no separate contact-verification
 * step to repeat.
 *
 * <p>{@code ORGANIZATION_ADMIN} is never an assignable role here — {@link #requireAssignableRole}
 * enforces that on every create and role change, closing the path an organization admin could
 * otherwise use to mint another organization admin (CLAUDE.md section 23).
 */
@Service
public class OrganizationMembershipService {

    private static final Set<OrganizationRole> ASSIGNABLE_ROLES =
            Set.of(OrganizationRole.RECRUITER, OrganizationRole.ORGANIZATION_SUPERVISOR);

    private final OrganizationAuthorization authorization;
    private final OrganizationMembershipRepository memberships;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final LogoutService logoutService;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;
    private final AuditService audit;

    public OrganizationMembershipService(
            OrganizationAuthorization authorization,
            OrganizationMembershipRepository memberships,
            UserRepository users,
            PasswordEncoder passwordEncoder,
            LogoutService logoutService,
            TemporaryPasswordGenerator temporaryPasswordGenerator,
            AuditService audit) {
        this.authorization = authorization;
        this.memberships = memberships;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.logoutService = logoutService;
        this.temporaryPasswordGenerator = temporaryPasswordGenerator;
        this.audit = audit;
    }

    public record Member(OrganizationMembership membership, String displayName, String email, UserStatus status) {
    }

    public record MemberCredential(String email, String temporaryPassword) {
    }

    /**
     * Creates a brand-new staff account and its membership in one transaction. The email must not
     * already belong to any FursadHub identity — this endpoint provisions new people, it does not
     * attach a role to an existing account (CLAUDE.md section 26A "Duplicate Email").
     */
    @Transactional
    public Member create(
            UUID actingUserId, UUID organizationId, String rawEmail, String password, String confirmPassword,
            String rawDisplayName, OrganizationRole role, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);
        requireAssignableRole(role);
        if (!password.equals(confirmPassword)) {
            throw new ApiException("STAFF_PASSWORD_CONFIRMATION_MISMATCH", HttpStatus.BAD_REQUEST,
                    "Password and confirmation do not match.");
        }

        String email = EmailNormalizer.normalize(rawEmail);
        if (users.existsByEmail(email)) {
            throw new ApiException("STAFF_EMAIL_ALREADY_EXISTS", HttpStatus.CONFLICT,
                    "An account with this email already exists.");
        }

        User staffUser = User.register(email, passwordEncoder.encode(password), "en");
        // The creating admin is vouching for this person's identity and email directly — no
        // separate contact-verification step, and no verification email sent (CLAUDE.md section
        // 26A "Contact Verification").
        staffUser.markEmailVerified();
        staffUser.changeDisplayName(DisplayNamePolicy.normalize(rawDisplayName));
        users.save(staffUser);

        OrganizationMembership membership = OrganizationMembership.assign(organizationId, staffUser.getId(), role);
        memberships.save(membership);

        audit.record("ORGANIZATION_STAFF_CREATED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";targetUserId=" + staffUser.getId() + ";role=" + role);

        return new Member(membership, staffUser.getDisplayName(), staffUser.getEmail(), staffUser.getStatus());
    }

    @Transactional
    public Member changeRole(
            UUID actingUserId, UUID organizationId, UUID membershipId, OrganizationRole newRole,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);
        requireAssignableRole(newRole);
        OrganizationMembership membership = requireOwnedMembership(organizationId, membershipId);

        membership.changeRole(newRole);
        memberships.save(membership);

        audit.record("ORGANIZATION_STAFF_ROLE_CHANGED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";membershipId=" + membershipId + ";role=" + newRole);

        User staffUser = requireUser(membership.getUserId());
        return new Member(membership, staffUser.getDisplayName(), staffUser.getEmail(), staffUser.getStatus());
    }

    /** Blocks the staff member's authentication without ending their staff relationship. Idempotent. */
    @Transactional
    public void suspend(UUID actingUserId, UUID organizationId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);
        OrganizationMembership membership = requireOwnedMembership(organizationId, membershipId);
        User staffUser = requireUser(membership.getUserId());

        if (staffUser.getStatus() == UserStatus.SUSPENDED) {
            return;
        }
        if (staffUser.getStatus() == UserStatus.CLOSED) {
            throw new ApiException("USER_CLOSED", HttpStatus.CONFLICT, "A closed account cannot be suspended.");
        }

        staffUser.suspend();
        users.save(staffUser);
        logoutService.logoutAll(staffUser.getId(), ipAddress, userAgent);

        audit.record("ORGANIZATION_STAFF_SUSPENDED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";membershipId=" + membershipId + ";targetUserId=" + staffUser.getId());
    }

    /** Lifts a suspension. Idempotent, and refuses a closed account (closure is permanent). */
    @Transactional
    public void reactivate(UUID actingUserId, UUID organizationId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);
        OrganizationMembership membership = requireOwnedMembership(organizationId, membershipId);
        User staffUser = requireUser(membership.getUserId());

        if (staffUser.getStatus() == UserStatus.CLOSED) {
            throw new ApiException("USER_CLOSED", HttpStatus.CONFLICT, "A closed account cannot be reactivated.");
        }
        if (!staffUser.reactivate()) {
            return;
        }
        users.save(staffUser);

        audit.record("ORGANIZATION_STAFF_REACTIVATED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";membershipId=" + membershipId + ";targetUserId=" + staffUser.getId());
    }

    /**
     * Issues a fresh server-generated temporary password, revoking existing sessions. Unlike
     * account creation, the resetting admin does not choose the value — it is returned exactly
     * once in this method's result and never again.
     */
    @Transactional
    public MemberCredential resetPassword(
            UUID actingUserId, UUID organizationId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);
        OrganizationMembership membership = requireOwnedMembership(organizationId, membershipId);
        User staffUser = requireUser(membership.getUserId());

        String newPassword = temporaryPasswordGenerator.generate();
        staffUser.changePasswordHash(passwordEncoder.encode(newPassword));
        users.save(staffUser);
        logoutService.logoutAll(staffUser.getId(), ipAddress, userAgent);

        audit.record("ORGANIZATION_STAFF_PASSWORD_RESET", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";membershipId=" + membershipId + ";targetUserId=" + staffUser.getId());

        return new MemberCredential(staffUser.getEmail(), newPassword);
    }

    @Transactional
    public void revoke(UUID actingUserId, UUID organizationId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);
        OrganizationMembership membership = requireOwnedMembership(organizationId, membershipId);

        membership.revoke();
        memberships.save(membership);

        audit.record("ORGANIZATION_STAFF_REVOKED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";membershipId=" + membershipId);
    }

    @Transactional(readOnly = true)
    public List<Member> listMembers(UUID actingUserId, UUID organizationId) {
        authorization.requireMembership(actingUserId, organizationId);

        return memberships.findByOrganizationId(organizationId).stream()
                .filter(OrganizationMembership::isActive)
                .map(membership -> {
                    User staffUser = users.findById(membership.getUserId()).orElse(null);
                    return new Member(
                            membership,
                            staffUser == null ? null : staffUser.getDisplayName(),
                            staffUser == null ? null : staffUser.getEmail(),
                            staffUser == null ? null : staffUser.getStatus());
                })
                .toList();
    }


    /**
     * Sets or clears a managed staff member's display name (Backend Phase B5).
     *
     * <p>Same three guards as the university counterpart: admin of THIS organization, target
     * resolved through a membership this organization owns (identical not-found for another
     * tenant's membership), and the membership's CURRENT role restricted to the assignable managed
     * roles.
     *
     * <p>That last guard is what stops this being a general user-editing capability: only
     * {@code RECRUITER} and {@code ORGANIZATION_SUPERVISOR} are assignable, so an
     * {@code ORGANIZATION_ADMIN} — a self-registered founder who may belong to several tenants and
     * may also be a student — can never have their global display name rewritten here. The user id
     * is never taken from the request.
     */
    @Transactional
    public Member changeDisplayName(
            UUID actingUserId, UUID organizationId, UUID membershipId, String rawDisplayName,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);
        OrganizationMembership membership = requireOwnedMembership(organizationId, membershipId);
        requireAssignableRole(membership.getRole());

        User staffUser = requireUser(membership.getUserId());
        staffUser.changeDisplayName(DisplayNamePolicy.normalize(rawDisplayName));
        users.save(staffUser);

        // Identifiers only in audit metadata — never the name itself (CLAUDE.md section 68).
        audit.record("ORGANIZATION_STAFF_DISPLAY_NAME_CHANGED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";membershipId=" + membershipId
                        + ";targetUserId=" + staffUser.getId());

        return new Member(membership, staffUser.getDisplayName(), staffUser.getEmail(), staffUser.getStatus());
    }
    // ---------------------------------------------------------------- internals

    private void requireAssignableRole(OrganizationRole role) {
        if (!ASSIGNABLE_ROLES.contains(role)) {
            throw new ApiException("STAFF_ROLE_NOT_ASSIGNABLE", HttpStatus.FORBIDDEN,
                    "Organization admins may only assign Recruiter or Organization Supervisor.");
        }
    }

    /**
     * Resolves a membership that both exists and belongs to {@code organizationId}, returning the
     * identical not-found error either way — a caller in Organization A must not be able to tell a
     * Organization B membership id from one that doesn't exist at all (CLAUDE.md section 26A).
     */
    private OrganizationMembership requireOwnedMembership(UUID organizationId, UUID membershipId) {
        return memberships.findById(membershipId)
                .filter(m -> m.getOrganizationId().equals(organizationId))
                .filter(OrganizationMembership::isActive)
                .orElseThrow(() -> new ApiException("STAFF_MEMBERSHIP_NOT_FOUND", HttpStatus.NOT_FOUND, "Staff membership not found."));
    }

    private User requireUser(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Membership references a missing user: " + userId));
    }
}
