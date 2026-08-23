package com.fursadhub.organization.infrastructure.persistence;

import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class OrganizationMembershipRepositoryAdapter implements OrganizationMembershipRepository {

    private final JpaOrganizationMembershipRepository jpaRepository;

    OrganizationMembershipRepositoryAdapter(JpaOrganizationMembershipRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public OrganizationMembership save(OrganizationMembership membership) {
        return jpaRepository.save(membership);
    }

    @Override
    public Optional<OrganizationMembership> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<OrganizationMembership> findActiveByOrganizationIdAndUserId(UUID organizationId, UUID userId) {
        return jpaRepository.findByOrganizationIdAndUserIdAndRevokedAtIsNull(organizationId, userId);
    }

    @Override
    public List<OrganizationMembership> findByOrganizationId(UUID organizationId) {
        return jpaRepository.findByOrganizationId(organizationId);
    }

    @Override
    public List<OrganizationMembership> findActiveByUserId(UUID userId) {
        return jpaRepository.findByUserIdAndRevokedAtIsNull(userId);
    }

    @Override
    public boolean existsActiveByOrganizationIdAndUserId(UUID organizationId, UUID userId) {
        return jpaRepository.existsByOrganizationIdAndUserIdAndRevokedAtIsNull(organizationId, userId);
    }
}
