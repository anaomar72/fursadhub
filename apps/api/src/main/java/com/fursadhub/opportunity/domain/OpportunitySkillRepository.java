package com.fursadhub.opportunity.domain;

import java.util.List;
import java.util.UUID;

/**
 * Skills are always read and written as a whole list for one opportunity — there is no
 * "edit skill 3" operation — so this interface deliberately offers no single-row save or delete.
 *
 * <p>{@link #findByOpportunityIds} exists to keep the public listing at one query for a page rather
 * than one per row: the same batching reason {@code PublicOpportunityController} already batches
 * organizations (Backend Phase B1).
 */
public interface OpportunitySkillRepository {

    List<OpportunitySkill> findByOpportunityIdOrderByPosition(UUID opportunityId);

    List<OpportunitySkill> findByOpportunityIds(List<UUID> opportunityIds);

    void replaceAll(UUID opportunityId, List<OpportunitySkill> skills);

    void deleteByOpportunityId(UUID opportunityId);
}
