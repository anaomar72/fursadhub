package com.fursadhub.organization.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationMembershipRepository {

    OrganizationMembership save(OrganizationMembership membership);

    Optional<OrganizationMembership> findById(UUID id);

    Optional<OrganizationMembership> findActiveByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    List<OrganizationMembership> findByOrganizationId(UUID organizationId);

    List<OrganizationMembership> findActiveByUserId(UUID userId);

    boolean existsActiveByOrganizationIdAndUserId(UUID organizationId, UUID userId);
}
