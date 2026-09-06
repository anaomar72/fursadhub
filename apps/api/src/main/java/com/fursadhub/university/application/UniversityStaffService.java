package com.fursadhub.university.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.application.LogoutService;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.DisplayNamePolicy;
import com.fursadhub.identity.domain.UsernamePolicy;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.identity.infrastructure.TemporaryPasswordGenerator;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipDepartment;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * University-admin-scoped managed staff provisioning (CLAUDE.md section 26A): creating brand-new
 * {@code DEPARTMENT_COORDINATOR}/{@code UNIVERSITY_SUPERVISOR} accounts (the admin-supplied
 * password is hashed; the account is created already {@code ACTIVE} — the admin who typed this
 * person's email is vouching for it directly, so there is no separate contact-verification step
 * to repeat), and managing them afterward (role/scope change, suspend, reactivate, credential
 * reset, revoke).
 *
 * <p>{@code UNIVERSITY_ADMIN} is never an assignable role here — {@link #requireAssignableRole}
 * enforces that on every create and role change, closing the path a university admin could
 * otherwise use to mint another university admin (CLAUDE.md section 23).
 */
@Service
public class UniversityStaffService {

    private static final Set<UniversityRole> ASSIGNABLE_ROLES =
            Set.of(UniversityRole.DEPARTMENT_COORDINATOR, UniversityRole.UNIVERSITY_SUPERVISOR);

    private final UniversityAuthorization authorization;
    private final UniversityMembershipRepository memberships;
    private final UniversityMembershipDepartmentRepository membershipDepartments;
    private final DepartmentRepository departments;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final LogoutService logoutService;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;
    private final AuditService audit;

    public UniversityStaffService(
            UniversityAuthorization authorization,
            UniversityMembershipRepository memberships,
            UniversityMembershipDepartmentRepository membershipDepartments,
            DepartmentRepository departments,
            UserRepository users,
            PasswordEncoder passwordEncoder,
            LogoutService logoutService,
            TemporaryPasswordGenerator temporaryPasswordGenerator,
            AuditService audit) {
        this.authorization = authorization;
        this.memberships = memberships;
        this.membershipDepartments = membershipDepartments;
        this.departments = departments;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.logoutService = logoutService;
        this.temporaryPasswordGenerator = temporaryPasswordGenerator;
        this.audit = audit;
    }

    public record StaffMember(
            UniversityMembership membership, String displayName, String username, String email, UserStatus status,
            List<UUID> departmentIds) {
    }

    public record StaffCredential(String username, String email, String temporaryPassword) {
    }

    /**
     * Creates a brand-new staff account and its membership in one transaction. The email must not
     * already belong to any FursadHub identity — this endpoint provisions new people, it does not
     * attach a role to an existing account (CLAUDE.md section 26A "Duplicate Email": "Never guess
     * or silently replace an existing account type").
     */
    @Transactional
    public StaffMember create(
            UUID actingUserId, UUID universityId, String rawEmail, String password, String confirmPassword,
            String rawDisplayName, String rawUsername, UniversityRole role, List<UUID> departmentIds,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
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
        // Backend Phase B5.5: this is the identifier the staff member will log in with. Validated
        // and lower-cased here; the UNIQUE constraint decides a concurrent collision.
        String canonicalUsername = UsernamePolicy.canonicalize(rawUsername);
        if (users.existsByUsername(canonicalUsername)) {
            throw new ApiException("USERNAME_ALREADY_EXISTS", HttpStatus.CONFLICT, "That username is already taken.");
        }
        staffUser.assignUsername(canonicalUsername);
        // Flushed for the same reason as the assignment path: the username UNIQUE constraint must
        // fail at a known statement so the loser of a race becomes USERNAME_ALREADY_EXISTS.
        users.saveAndFlush(staffUser);

        UniversityMembership membership = UniversityMembership.assign(universityId, staffUser.getId(), role);
        memberships.save(membership);
        List<UUID> scopedDepartmentIds = assignDepartmentScope(departmentIds, universityId, membership.getId());

        audit.record("UNIVERSITY_STAFF_CREATED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";targetUserId=" + staffUser.getId() + ";role=" + role);

        return new StaffMember(membership, staffUser.getDisplayName(), staffUser.getUsername(), staffUser.getEmail(), staffUser.getStatus(), scopedDepartmentIds);
    }

    /** Changes role and (atomically) department scope, so the two can never briefly disagree. */
    @Transactional
    public StaffMember changeRole(
            UUID actingUserId, UUID universityId, UUID membershipId, UniversityRole newRole,
            List<UUID> departmentIds, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        requireAssignableRole(newRole);
        UniversityMembership membership = requireOwnedMembership(universityId, membershipId);

        membership.changeRole(newRole);
        memberships.save(membership);
        membershipDepartments.findActiveByMembershipId(membership.getId())
                .forEach(scope -> {
                    scope.remove();
                    membershipDepartments.save(scope);
                });
        List<UUID> scopedDepartmentIds = assignDepartmentScope(departmentIds, universityId, membership.getId());

        audit.record("UNIVERSITY_STAFF_ROLE_CHANGED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";membershipId=" + membershipId + ";role=" + newRole);

        User staffUser = requireUser(membership.getUserId());
        return new StaffMember(membership, staffUser.getDisplayName(), staffUser.getUsername(), staffUser.getEmail(), staffUser.getStatus(), scopedDepartmentIds);
    }

    /** Blocks the staff member's authentication without ending their staff relationship. Idempotent. */
    @Transactional
    public void suspend(UUID actingUserId, UUID universityId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        UniversityMembership membership = requireOwnedMembership(universityId, membershipId);
        User staffUser = requireUser(membership.getUserId());

        if (staffUser.getStatus() == UserStatus.SUSPENDED) {
            return;
        }
        if (staffUser.getStatus() == UserStatus.CLOSED) {
            throw new ApiException("USER_CLOSED", HttpStatus.CONFLICT, "A closed account cannot be suspended.");
        }

        staffUser.suspend();
        users.save(staffUser);
        // Same transaction as the status change: a suspension without revoking sessions would
        // leave the account working for up to thirty more days on its existing refresh token.
        logoutService.logoutAll(staffUser.getId(), ipAddress, userAgent);

        audit.record("UNIVERSITY_STAFF_SUSPENDED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";membershipId=" + membershipId + ";targetUserId=" + staffUser.getId());
    }

    /** Lifts a suspension. Idempotent, and refuses a closed account (closure is permanent). */
    @Transactional
    public void reactivate(UUID actingUserId, UUID universityId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        UniversityMembership membership = requireOwnedMembership(universityId, membershipId);
        User staffUser = requireUser(membership.getUserId());

        if (staffUser.getStatus() == UserStatus.CLOSED) {
            throw new ApiException("USER_CLOSED", HttpStatus.CONFLICT, "A closed account cannot be reactivated.");
        }
        if (!staffUser.reactivate()) {
            return;
        }
        users.save(staffUser);

        audit.record("UNIVERSITY_STAFF_REACTIVATED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";membershipId=" + membershipId + ";targetUserId=" + staffUser.getId());
    }

    /**
     * Issues a fresh server-generated temporary password, revoking existing sessions. Unlike
     * account creation, the resetting admin does not choose the value (CLAUDE.md section 26A
     * "Staff Password Reset") — it is returned exactly once in this method's result and never
     * again.
     */
    @Transactional
    public StaffCredential resetPassword(
            UUID actingUserId, UUID universityId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        UniversityMembership membership = requireOwnedMembership(universityId, membershipId);
        User staffUser = requireUser(membership.getUserId());

        String newPassword = temporaryPasswordGenerator.generate();
        staffUser.changePasswordHash(passwordEncoder.encode(newPassword));
        users.save(staffUser);
        logoutService.logoutAll(staffUser.getId(), ipAddress, userAgent);

        audit.record("UNIVERSITY_STAFF_PASSWORD_RESET", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";membershipId=" + membershipId + ";targetUserId=" + staffUser.getId());

        return new StaffCredential(staffUser.getUsername(), staffUser.getEmail(), newPassword);
    }

    @Transactional
    public void revoke(UUID actingUserId, UUID universityId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        UniversityMembership membership = requireOwnedMembership(universityId, membershipId);

        membership.revoke();
        memberships.save(membership);

        audit.record("UNIVERSITY_STAFF_REVOKED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";membershipId=" + membershipId);
    }

    @Transactional(readOnly = true)
    public List<StaffMember> listStaff(UUID actingUserId, UUID universityId) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        return memberships.findByUniversityId(universityId).stream()
                .filter(UniversityMembership::isActive)
                .map(membership -> {
                    User staffUser = users.findById(membership.getUserId()).orElse(null);
                    List<UUID> departmentIds = membershipDepartments.findActiveByMembershipId(membership.getId()).stream()
                            .map(UniversityMembershipDepartment::getDepartmentId)
                            .filter(Objects::nonNull)
                            .toList();
                    return new StaffMember(
                            membership,
                            staffUser == null ? null : staffUser.getDisplayName(),
                            staffUser == null ? null : staffUser.getUsername(),
                            staffUser == null ? null : staffUser.getEmail(),
                            staffUser == null ? null : staffUser.getStatus(),
                            departmentIds);
                })
                .toList();
    }


    /**
     * Sets or clears a managed staff member's display name (Backend Phase B5).
     *
     * <p><strong>The write boundary, in three guards.</strong> {@code requireMembership} proves the
     * caller is a {@code UNIVERSITY_ADMIN} of THIS university; {@code requireOwnedMembership}
     * resolves the target through a membership that belongs to it, returning the same not-found
     * error for another university's membership as for one that does not exist; and
     * {@code requireAssignableRole} on the membership's CURRENT role restricts the target to the
     * managed staff roles.
     *
     * <p>That third guard is what keeps this from becoming a general user-editing capability. Only
     * {@code DEPARTMENT_COORDINATOR} and {@code UNIVERSITY_SUPERVISOR} are assignable, so a
     * {@code UNIVERSITY_ADMIN} — a self-registered founder who may hold memberships in several
     * tenants and may also be a student — can never have their global display name rewritten
     * through this route, by their own admin or anyone else's.
     *
     * <p>The user id is never accepted from the request. The target is always reached through a
     * membership the caller demonstrably owns, so there is no raw-user-id bypass.
     */
    @Transactional
    public StaffMember changeDisplayName(
            UUID actingUserId, UUID universityId, UUID membershipId, String rawDisplayName,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        UniversityMembership membership = requireOwnedMembership(universityId, membershipId);
        requireAssignableRole(membership.getRole());

        User staffUser = requireUser(membership.getUserId());
        staffUser.changeDisplayName(DisplayNamePolicy.normalize(rawDisplayName));
        users.save(staffUser);

        // The name itself is never recorded in audit metadata — identifiers only, as everywhere else
        // (CLAUDE.md section 68).
        audit.record("UNIVERSITY_STAFF_DISPLAY_NAME_CHANGED", actingUserId, ipAddress, userAgent,
                "universityId=" + universityId + ";membershipId=" + membershipId + ";targetUserId=" + staffUser.getId());

        List<UUID> departmentIds = membershipDepartments.findActiveByMembershipId(membership.getId()).stream()
                .map(UniversityMembershipDepartment::getDepartmentId)
                .filter(Objects::nonNull)
                .toList();
        return new StaffMember(membership, staffUser.getDisplayName(), staffUser.getUsername(), staffUser.getEmail(), staffUser.getStatus(), departmentIds);
    }

    /**
     * Assigns the login username to an existing managed staff account, ONCE (Backend Phase B5.5).
     *
     * <p>This is the migration path for staff provisioned before B5.5, who currently authenticate by
     * email. Assigning a username moves that account to username authentication permanently: from
     * that moment {@code LoginService} stops accepting its email as a credential.
     *
     * <p>Same three guards as every other managed-staff command: admin of THIS university, target
     * resolved through a membership this university owns, and the membership's CURRENT role
     * restricted to the assignable managed roles — so a {@code UNIVERSITY_ADMIN} founder, whose
     * account is self-service and may span tenants, can never be given a username here.
     *
     * <p>Re-sending the same canonical username is a no-op; a different one is refused as
     * {@code USERNAME_IMMUTABLE} by the entity. B5.5 supports no rename and no clear.
     */
    @Transactional
    public StaffMember assignUsername(
            UUID actingUserId, UUID universityId, UUID membershipId, String rawUsername,
            String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        UniversityMembership membership = requireOwnedMembership(universityId, membershipId);
        requireAssignableRole(membership.getRole());

        String canonicalUsername = UsernamePolicy.canonicalize(rawUsername);
        User staffUser = requireUser(membership.getUserId());
        // Taken by a DIFFERENT account. Re-sending this account's own username stays idempotent
        // rather than colliding with itself.
        if (!canonicalUsername.equals(staffUser.getUsername()) && users.existsByUsername(canonicalUsername)) {
            throw new ApiException("USERNAME_ALREADY_EXISTS", HttpStatus.CONFLICT, "That username is already taken.");
        }

        if (staffUser.assignUsername(canonicalUsername)) {
            // Flush here so a lost race fails on THIS statement as a DataIntegrityViolationException,
            // not later at commit where it could surface as a TransactionSystemException and escape
            // the constraint translator.
            users.saveAndFlush(staffUser);
            // The username is an identifier, not a secret, but audit metadata stays identifiers-only
            // exactly as everywhere else (CLAUDE.md section 68).
            audit.record("UNIVERSITY_STAFF_USERNAME_ASSIGNED", actingUserId, ipAddress, userAgent,
                    "universityId=" + universityId + ";membershipId=" + membershipId
                            + ";targetUserId=" + staffUser.getId());
        }

        List<UUID> departmentIds = membershipDepartments.findActiveByMembershipId(membership.getId()).stream()
                .map(UniversityMembershipDepartment::getDepartmentId)
                .filter(Objects::nonNull)
                .toList();
        return new StaffMember(membership, staffUser.getDisplayName(), staffUser.getUsername(), staffUser.getEmail(), staffUser.getStatus(), departmentIds);
    }
    // ---------------------------------------------------------------- internals

    private void requireAssignableRole(UniversityRole role) {
        if (!ASSIGNABLE_ROLES.contains(role)) {
            throw new ApiException("STAFF_ROLE_NOT_ASSIGNABLE", HttpStatus.FORBIDDEN,
                    "University admins may only assign Department Coordinator or University Supervisor.");
        }
    }

    /** Every assignable role requires at least one department (only reached once the role allowlist above has passed). */
    private List<UUID> assignDepartmentScope(List<UUID> departmentIds, UUID universityId, UUID membershipId) {
        List<UUID> scoped = departmentIds == null ? List.of() : departmentIds;
        if (scoped.isEmpty()) {
            throw new ApiException("STAFF_SCOPE_REQUIRED", HttpStatus.BAD_REQUEST,
                    "At least one department is required for this role.");
        }
        for (UUID departmentId : scoped) {
            if (!departments.existsByIdAndUniversityId(departmentId, universityId)) {
                throw new ApiException("DEPARTMENT_NOT_IN_UNIVERSITY", HttpStatus.BAD_REQUEST,
                        "One or more departments do not belong to this university.");
            }
            membershipDepartments.save(UniversityMembershipDepartment.assign(membershipId, departmentId));
        }
        return scoped;
    }

    /**
     * Resolves a membership that both exists and belongs to {@code universityId}, returning the
     * identical not-found error either way — a caller in University A must not be able to tell a
     * University B membership id from one that doesn't exist at all (CLAUDE.md section 26A).
     */
    private UniversityMembership requireOwnedMembership(UUID universityId, UUID membershipId) {
        return memberships.findById(membershipId)
                .filter(m -> m.getUniversityId().equals(universityId))
                .filter(UniversityMembership::isActive)
                .orElseThrow(() -> new ApiException("STAFF_MEMBERSHIP_NOT_FOUND", HttpStatus.NOT_FOUND, "Staff membership not found."));
    }

    private User requireUser(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Membership references a missing user: " + userId));
    }
}
