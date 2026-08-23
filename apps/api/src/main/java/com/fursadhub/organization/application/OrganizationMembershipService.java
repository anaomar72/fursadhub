package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Organization-admin-scoped staff management for the caller's own organization (CLAUDE.md
 * section 3/26), mirroring {@code UniversityStaffService}'s pattern.
 */
@Service
public class OrganizationMembershipService {

    private final OrganizationAuthorization authorization;
    private final OrganizationMembershipRepository memberships;
    private final UserRepository users;
    private final AuditService audit;

    public OrganizationMembershipService(
            OrganizationAuthorization authorization, OrganizationMembershipRepository memberships,
            UserRepository users, AuditService audit) {
        this.authorization = authorization;
        this.memberships = memberships;
        this.users = users;
        this.audit = audit;
    }

    public record Member(OrganizationMembership membership, String email) {
    }

    @Transactional
    public Member assign(
            UUID actingUserId, UUID organizationId, String rawEmail, OrganizationRole role, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        String email = EmailNormalizer.normalize(rawEmail);
        User target = users.findByEmail(email)
                .orElseThrow(() -> new ApiException("STAFF_USER_NOT_FOUND", HttpStatus.NOT_FOUND, "No account exists for this email."));
        if (target.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException("STAFF_USER_NOT_ACTIVE", HttpStatus.CONFLICT, "This account must be active before it can be assigned a staff role.");
        }
        if (memberships.existsActiveByOrganizationIdAndUserId(organizationId, target.getId())) {
            throw new ApiException("STAFF_ALREADY_ASSIGNED", HttpStatus.CONFLICT, "This user already has an active staff role at this organization.");
        }

        OrganizationMembership membership = OrganizationMembership.assign(organizationId, target.getId(), role);
        memberships.save(membership);

        audit.record("ORGANIZATION_STAFF_ASSIGNED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";targetUserId=" + target.getId() + ";role=" + role);

        return new Member(membership, target.getEmail());
    }

    @Transactional
    public void revoke(UUID actingUserId, UUID organizationId, UUID membershipId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        OrganizationMembership membership = memberships.findById(membershipId)
                .filter(m -> m.getOrganizationId().equals(organizationId))
                .orElseThrow(() -> new ApiException("STAFF_MEMBERSHIP_NOT_FOUND", HttpStatus.NOT_FOUND, "Staff membership not found."));

        if (!membership.isActive()) {
            throw new ApiException("STAFF_MEMBERSHIP_NOT_FOUND", HttpStatus.NOT_FOUND, "Staff membership not found.");
        }

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
                    String email = users.findById(membership.getUserId()).map(User::getEmail).orElse(null);
                    return new Member(membership, email);
                })
                .toList();
    }
}
