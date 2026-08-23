package com.fursadhub.organization.infrastructure.persistence;

import com.fursadhub.organization.domain.OrganizationMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaOrganizationMembershipRepository extends JpaRepository<OrganizationMembership, UUID> {

    Optional<OrganizationMembership> findByOrganizationIdAndUserIdAndRevokedAtIsNull(UUID organizationId, UUID userId);

    boolean existsByOrganizationIdAndUserIdAndRevokedAtIsNull(UUID organizationId, UUID userId);

    List<OrganizationMembership> findByOrganizationId(UUID organizationId);

    List<OrganizationMembership> findByUserIdAndRevokedAtIsNull(UUID userId);
}
