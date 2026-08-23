package com.fursadhub.opportunity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OpportunityTargetRepository {

    OpportunityTarget save(OpportunityTarget target);

    Optional<OpportunityTarget> findById(UUID id);

    List<OpportunityTarget> findByOpportunityId(UUID opportunityId);

    boolean existsByOpportunityIdAndUniversityId(UUID opportunityId, UUID universityId);

    void delete(OpportunityTarget target);
}
