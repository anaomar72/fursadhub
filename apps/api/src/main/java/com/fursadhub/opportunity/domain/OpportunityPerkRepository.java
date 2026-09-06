package com.fursadhub.opportunity.domain;

import java.util.List;
import java.util.UUID;

/** Mirrors {@link OpportunitySkillRepository} — perks are written as a whole list, never row by row. */
public interface OpportunityPerkRepository {

    List<OpportunityPerk> findByOpportunityIdOrderByPosition(UUID opportunityId);

    List<OpportunityPerk> findByOpportunityIds(List<UUID> opportunityIds);

    void replaceAll(UUID opportunityId, List<OpportunityPerk> perks);

    void deleteByOpportunityId(UUID opportunityId);
}
