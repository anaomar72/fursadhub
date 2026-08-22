package com.fursadhub.organization.application;

import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Lets the frontend discover which organization(s) the current user has an active staff
 * membership at, so it knows which {@code /organizations/{organizationId}/...} resources to call
 * (CLAUDE.md section 15 — current membership must come from PostgreSQL, never a JWT claim).
 * Unlike university staff (single-university for the pilot), a user may hold active memberships
 * at more than one organization.
 */
@Service
@Transactional(readOnly = true)
public class MyOrganizationMembershipQueryService {

    private final OrganizationMembershipRepository memberships;

    public MyOrganizationMembershipQueryService(OrganizationMembershipRepository memberships) {
        this.memberships = memberships;
    }

    public List<OrganizationMembership> getMyMemberships(UUID userId) {
        return memberships.findActiveByUserId(userId);
    }
}
