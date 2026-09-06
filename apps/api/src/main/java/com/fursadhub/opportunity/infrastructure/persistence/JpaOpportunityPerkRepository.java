package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunityPerk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaOpportunityPerkRepository extends JpaRepository<OpportunityPerk, UUID> {

    List<OpportunityPerk> findByOpportunityIdOrderByPositionAsc(UUID opportunityId);

    List<OpportunityPerk> findByOpportunityIdInOrderByOpportunityIdAscPositionAsc(List<UUID> opportunityIds);

    void deleteByOpportunityId(UUID opportunityId);
}
