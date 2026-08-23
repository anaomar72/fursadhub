package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.InternshipOpportunityRepository;
import com.fursadhub.opportunity.domain.PublicOpportunityFilter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class InternshipOpportunityRepositoryAdapter implements InternshipOpportunityRepository {

    private final JpaInternshipOpportunityRepository jpaRepository;

    InternshipOpportunityRepositoryAdapter(JpaInternshipOpportunityRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public InternshipOpportunity save(InternshipOpportunity opportunity) {
        return jpaRepository.save(opportunity);
    }

    @Override
    public Optional<InternshipOpportunity> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<InternshipOpportunity> findByOrganizationId(UUID organizationId) {
        return jpaRepository.findByOrganizationId(organizationId);
    }

    @Override
    public Page<InternshipOpportunity> searchPublic(PublicOpportunityFilter filter, Pageable pageable) {
        return jpaRepository.findAll(InternshipOpportunitySpecifications.matching(filter), pageable);
    }

    @Override
    public Optional<InternshipOpportunity> findPublicById(UUID id) {
        return jpaRepository.findOne(InternshipOpportunitySpecifications.publicById(id));
    }
}
