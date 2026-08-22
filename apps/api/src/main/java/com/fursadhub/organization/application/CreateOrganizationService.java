package com.fursadhub.organization.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import com.fursadhub.organization.domain.OrganizationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Self-service organization registration (CLAUDE.md section 26 workflow: "Organization creates
 * opportunity" begins with the organization existing). The registering user becomes the founding
 * {@code ORGANIZATION_ADMIN}. The organization starts {@code DRAFT}-verified and cannot publish
 * opportunities until verified (CLAUDE.md section 6/31).
 */
@Service
public class CreateOrganizationService {

    private final OrganizationRepository organizations;
    private final OrganizationMembershipRepository memberships;
    private final AuditService audit;

    public CreateOrganizationService(
            OrganizationRepository organizations, OrganizationMembershipRepository memberships, AuditService audit) {
        this.organizations = organizations;
        this.memberships = memberships;
        this.audit = audit;
    }

    @Transactional
    public Organization create(
            UUID actingUserId, String name, OrganizationType type, String registrationNumber, String website,
            String description, String ipAddress, String userAgent) {
        String base = SlugGenerator.base(name);
        String slug = organizations.existsBySlug(base) ? SlugGenerator.withSuffix(base) : base;

        Organization organization = Organization.create(name, slug, type, registrationNumber, website, description);
        organizations.save(organization);

        OrganizationMembership membership =
                OrganizationMembership.assign(organization.getId(), actingUserId, OrganizationRole.ORGANIZATION_ADMIN);
        memberships.save(membership);

        audit.record("ORGANIZATION_CREATED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organization.getId());

        return organization;
    }
}
