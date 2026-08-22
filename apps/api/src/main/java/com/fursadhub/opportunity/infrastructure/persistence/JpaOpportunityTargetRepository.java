package com.fursadhub.opportunity.infrastructure.persistence;

import com.fursadhub.opportunity.domain.OpportunityTarget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface JpaOpportunityTargetRepository extends JpaRepository<OpportunityTarget, UUID> {

    List<OpportunityTarget> findByOpportunityId(UUID opportunityId);

    boolean existsByOpportunityIdAndUniversityId(UUID opportunityId, UUID universityId);
}
