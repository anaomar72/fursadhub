package com.fursadhub.organization.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Organization profile management, restricted to {@code ORGANIZATION_ADMIN} (CLAUDE.md section 26). */
@Service
public class UpdateOrganizationService {

    private final OrganizationRepository organizations;
    private final OrganizationQueryService queryService;
    private final OrganizationAuthorization authorization;
    private final AuditService audit;

    public UpdateOrganizationService(
            OrganizationRepository organizations, OrganizationQueryService queryService,
            OrganizationAuthorization authorization, AuditService audit) {
        this.organizations = organizations;
        this.queryService = queryService;
        this.authorization = authorization;
        this.audit = audit;
    }

    @Transactional
    public Organization update(
            UUID actingUserId, UUID organizationId, String name, String registrationNumber, String website,
            String description, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        Organization organization = queryService.getOrThrow(organizationId);
        organization.updateProfile(name, registrationNumber, website, description);
        organizations.save(organization);

        audit.record("ORGANIZATION_PROFILE_UPDATED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId);

        return organization;
    }

    @Transactional
    public Organization submitForVerification(UUID actingUserId, UUID organizationId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        Organization organization = queryService.getOrThrow(organizationId);
        organization.submitForVerification();
        organizations.save(organization);

        audit.record("ORGANIZATION_VERIFICATION_SUBMITTED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId);

        return organization;
    }
}
