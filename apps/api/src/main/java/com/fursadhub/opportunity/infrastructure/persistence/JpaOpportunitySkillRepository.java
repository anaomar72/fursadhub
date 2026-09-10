package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunitySkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaOpportunitySkillRepository extends JpaRepository<OpportunitySkill, UUID> {

    List<OpportunitySkill> findByOpportunityIdOrderByPositionAsc(UUID opportunityId);

    List<OpportunitySkill> findByOpportunityIdInOrderByOpportunityIdAscPositionAsc(List<UUID> opportunityIds);

    void deleteByOpportunityId(UUID opportunityId);
}
