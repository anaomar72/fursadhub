package com.fursadhub.opportunity.application;

import com.fursadhub.opportunity.domain.OpportunityPerk;
import com.fursadhub.opportunity.domain.OpportunityPerkRepository;
import com.fursadhub.opportunity.domain.OpportunitySkill;
import com.fursadhub.opportunity.domain.OpportunitySkillRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reads and writes an opportunity's two authored value lists (Backend Phase B3).
 *
 * <p>One service for both because they are the same operation twice; splitting them would duplicate
 * the batch-loading logic that keeps the public listing at a fixed number of queries.
 *
 * <p>Deliberately holds NO authorization of its own. It is called only from
 * {@code CreateOpportunityService} and {@code UpdateOpportunityService}, both of which have already
 * established that the caller is an {@code ORGANIZATION_ADMIN} or {@code RECRUITER} of the owning
 * organization. Re-checking here would imply this is a public entry point, which it is not.
 */
@Service
public class OpportunityTagService {

    private final OpportunitySkillRepository skills;
    private final OpportunityPerkRepository perks;

    public OpportunityTagService(OpportunitySkillRepository skills, OpportunityPerkRepository perks) {
        this.skills = skills;
        this.perks = perks;
    }

    /** Replaces the whole list; an empty list clears it. Validation/normalisation lives in the domain. */
    @Transactional
    public void replaceSkills(UUID opportunityId, List<String> values) {
        skills.replaceAll(opportunityId, OpportunitySkill.from(opportunityId, values));
    }

    @Transactional
    public void replacePerks(UUID opportunityId, List<String> values) {
        perks.replaceAll(opportunityId, OpportunityPerk.from(opportunityId, values));
    }

    @Transactional(readOnly = true)
    public List<String> skillsOf(UUID opportunityId) {
        return skills.findByOpportunityIdOrderByPosition(opportunityId).stream()
                .map(OpportunitySkill::getValue)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> perksOf(UUID opportunityId) {
        return perks.findByOpportunityIdOrderByPosition(opportunityId).stream()
                .map(OpportunityPerk::getValue)
                .toList();
    }

    /**
     * Loads the skills for a whole page in ONE query, keyed by opportunity.
     *
     * <p>The public listing renders skill chips on every card, so the naive per-row lookup would be
     * a classic N+1: a 20-row page would issue 20 extra queries. This mirrors how
     * {@code PublicOpportunityController} already batches organization summaries (Backend Phase B1).
     *
     * <p>An opportunity with no skills is simply absent from the map; callers substitute an empty
     * list rather than storing empty entries.
     */
    @Transactional(readOnly = true)
    public Map<UUID, List<String>> skillsByOpportunity(List<UUID> opportunityIds) {
        return group(skills.findByOpportunityIds(opportunityIds),
                OpportunitySkill::getOpportunityId, OpportunitySkill::getValue);
    }

    @Transactional(readOnly = true)
    public Map<UUID, List<String>> perksByOpportunity(List<UUID> opportunityIds) {
        return group(perks.findByOpportunityIds(opportunityIds),
                OpportunityPerk::getOpportunityId, OpportunityPerk::getValue);
    }

    /**
     * Groups rows by owner while preserving each list's authored order — the repository query
     * already returns them ordered by opportunity then position, and {@code groupingBy} into a list
     * keeps encounter order.
     */
    private static <T> Map<UUID, List<String>> group(
            List<T> rows, Function<T, UUID> owner, Function<T, String> value) {
        return rows.stream().collect(Collectors.groupingBy(owner, Collectors.mapping(value, Collectors.toList())));
    }
}
