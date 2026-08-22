package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunityTarget;
import com.fursadhub.opportunity.domain.OpportunityTargetRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class OpportunityTargetRepositoryAdapter implements OpportunityTargetRepository {

    private final JpaOpportunityTargetRepository jpaRepository;

    OpportunityTargetRepositoryAdapter(JpaOpportunityTargetRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public OpportunityTarget save(OpportunityTarget target) {
        return jpaRepository.save(target);
    }

    @Override
    public Optional<OpportunityTarget> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<OpportunityTarget> findByOpportunityId(UUID opportunityId) {
        return jpaRepository.findByOpportunityId(opportunityId);
    }

    @Override
    public boolean existsByOpportunityIdAndUniversityId(UUID opportunityId, UUID universityId) {
        return jpaRepository.existsByOpportunityIdAndUniversityId(opportunityId, universityId);
    }

    @Override
    public void delete(OpportunityTarget target) {
        jpaRepository.delete(target);
    }
}
