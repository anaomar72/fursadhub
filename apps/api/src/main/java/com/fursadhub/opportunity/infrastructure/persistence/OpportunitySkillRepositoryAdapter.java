package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunitySkill;
import com.fursadhub.opportunity.domain.OpportunitySkillRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
class OpportunitySkillRepositoryAdapter implements OpportunitySkillRepository {

    private final JpaOpportunitySkillRepository jpaRepository;

    OpportunitySkillRepositoryAdapter(JpaOpportunitySkillRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public List<OpportunitySkill> findByOpportunityIdOrderByPosition(UUID opportunityId) {
        return jpaRepository.findByOpportunityIdOrderByPositionAsc(opportunityId);
    }

    @Override
    public List<OpportunitySkill> findByOpportunityIds(List<UUID> opportunityIds) {
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            // An empty IN () is invalid SQL in PostgreSQL, and an empty page is a normal outcome.
            return List.of();
        }
        return jpaRepository.findByOpportunityIdInOrderByOpportunityIdAscPositionAsc(opportunityIds);
    }

    /**
     * Delete-then-insert, which is what keeps {@code position} a gapless 0-based sequence without a
     * diffing or renumbering step. The caller is transactional, so a reader never observes the
     * half-deleted state.
     *
     * <p>{@code flush()} between the delete and the insert matters: both statements are otherwise
     * ordered by Hibernate's own action queue, which performs inserts before deletes and would
     * collide with the unique constraints on {@code (opportunity_id, position)} and
     * {@code (opportunity_id, normalized_value)} when a skill is merely reordered or re-submitted.
     */
    @Override
    public void replaceAll(UUID opportunityId, List<OpportunitySkill> skills) {
        jpaRepository.deleteByOpportunityId(opportunityId);
        jpaRepository.flush();
        if (!skills.isEmpty()) {
            jpaRepository.saveAll(skills);
        }
    }

    @Override
    public void deleteByOpportunityId(UUID opportunityId) {
        jpaRepository.deleteByOpportunityId(opportunityId);
    }
}
