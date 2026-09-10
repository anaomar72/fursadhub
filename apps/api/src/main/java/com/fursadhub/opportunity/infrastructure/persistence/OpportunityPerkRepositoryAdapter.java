package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunityPerk;
import com.fursadhub.opportunity.domain.OpportunityPerkRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/** Mirrors {@code OpportunitySkillRepositoryAdapter} — see it for the delete-then-flush rationale. */
@Repository
class OpportunityPerkRepositoryAdapter implements OpportunityPerkRepository {

    private final JpaOpportunityPerkRepository jpaRepository;

    OpportunityPerkRepositoryAdapter(JpaOpportunityPerkRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public List<OpportunityPerk> findByOpportunityIdOrderByPosition(UUID opportunityId) {
        return jpaRepository.findByOpportunityIdOrderByPositionAsc(opportunityId);
    }

    @Override
    public List<OpportunityPerk> findByOpportunityIds(List<UUID> opportunityIds) {
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findByOpportunityIdInOrderByOpportunityIdAscPositionAsc(opportunityIds);
    }

    @Override
    public void replaceAll(UUID opportunityId, List<OpportunityPerk> perks) {
        jpaRepository.deleteByOpportunityId(opportunityId);
        jpaRepository.flush();
        if (!perks.isEmpty()) {
            jpaRepository.saveAll(perks);
        }
    }

    @Override
    public void deleteByOpportunityId(UUID opportunityId) {
        jpaRepository.deleteByOpportunityId(opportunityId);
    }
}
