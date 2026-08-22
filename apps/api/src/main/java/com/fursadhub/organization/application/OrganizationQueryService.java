package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class OrganizationQueryService {

    private final OrganizationRepository organizations;
    private final OrganizationAuthorization authorization;

    public OrganizationQueryService(OrganizationRepository organizations, OrganizationAuthorization authorization) {
        this.organizations = organizations;
        this.authorization = authorization;
    }

    /** Management detail: requires the caller to hold an active membership at this organization. */
    public Organization getForMember(UUID actingUserId, UUID organizationId) {
        authorization.requireMembership(actingUserId, organizationId);
        return getOrThrow(organizationId);
    }

    public Organization getOrThrow(UUID organizationId) {
        return organizations.findById(organizationId).orElseThrow(this::organizationNotFound);
    }

    private ApiException organizationNotFound() {
        return new ApiException("ORGANIZATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Organization not found.");
    }
}
