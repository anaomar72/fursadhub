package com.fursadhub.organization.infrastructure.persistence;

import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class OrganizationRepositoryAdapter implements OrganizationRepository {

    private final JpaOrganizationRepository jpaRepository;

    OrganizationRepositoryAdapter(JpaOrganizationRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Organization save(Organization organization) {
        return jpaRepository.save(organization);
    }

    @Override
    public Optional<Organization> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return jpaRepository.existsBySlug(slug);
    }
}
