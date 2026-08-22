package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.UUID;

/**
 * Dedicated authorization component for organization-scoped resources (CLAUDE.md section 24/26).
 * Every check re-reads current PostgreSQL membership data rather than trusting JWT claims — a
 * role string alone never implies access; an active membership at the specific organization must
 * be verified for every request, and a recruiter/admin at Organization A must never reach
 * Organization B resources by changing an id in the URL.
 */
@Component
public class OrganizationAuthorization {

    private final OrganizationMembershipRepository memberships;

    public OrganizationAuthorization(OrganizationMembershipRepository memberships) {
        this.memberships = memberships;
    }

    /** Requires an active membership at {@code organizationId}, optionally restricted to specific roles. */
    public OrganizationMembership requireMembership(UUID userId, UUID organizationId, OrganizationRole... allowedRoles) {
        OrganizationMembership membership = memberships.findActiveByOrganizationIdAndUserId(organizationId, userId)
                .orElseThrow(this::accessDenied);

        if (allowedRoles.length > 0 && Arrays.stream(allowedRoles).noneMatch(role -> role == membership.getRole())) {
            throw accessDenied();
        }
        return membership;
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
