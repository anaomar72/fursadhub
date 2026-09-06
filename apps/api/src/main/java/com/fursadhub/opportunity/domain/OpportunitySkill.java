package com.fursadhub.opportunity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.List;
import java.util.UUID;

/**
 * One skill an opportunity asks for (Backend Phase B3) — "Java", "Data Analysis", "Customer
 * Support".
 *
 * <p><strong>A child table, not a comma-separated column.</strong> The approved listing renders
 * these as individual chips and may filter on them; splitting {@code "Java, SQL"} in application
 * code on every read would make the value unindexable and would break the moment a skill legitimately
 * contains a comma.
 *
 * <p>Follows the {@code ScreeningQuestion} pattern this repository already uses for an
 * opportunity-owned collection: a separate entity keyed by a plain {@code opportunity_id} UUID
 * rather than a JPA association (the codebase has no mapped associations anywhere), with a 0-based
 * gapless {@code position} that lets the database cap the row count through a CHECK on the position
 * range instead of trusting service logic alone (see V43, mirroring V18).
 *
 * <p><strong>Not a taxonomy.</strong> This is opportunity-authored text: the organization types what
 * it wants, and FursadHub does not curate a global skill vocabulary in B3 — no admin screens, no
 * synonym table, no recommendation engine. If a controlled vocabulary is ever needed, the migration
 * path is additive: introduce a {@code skills} reference table, add a nullable
 * {@code skill_id} FK here, backfill by matching {@code normalized_value}, and leave this column as
 * the free-text fallback for anything unmatched. Nothing here has to be destroyed to get there.
 */
@Entity
@Table(name = "opportunity_skills")
public class OpportunitySkill {

    /** Enforced here, in {@code OpportunityTagList}, and by the position CHECK in V43. */
    public static final int MAX_SKILLS_PER_OPPORTUNITY = 20;
    public static final int MAX_SKILL_LENGTH = 60;

    @Id
    private UUID id;

    @Column(name = "opportunity_id", nullable = false)
    private UUID opportunityId;

    /** The organization's own spelling, shown on the listing. */
    @Column(nullable = false, length = MAX_SKILL_LENGTH)
    private String value;

    /** Case-folded form; exists so the database can reject duplicates that differ only in case. */
    @Column(name = "normalized_value", nullable = false, length = MAX_SKILL_LENGTH)
    private String normalizedValue;

    @Column(nullable = false)
    private int position;

    protected OpportunitySkill() {
    }

    public static OpportunitySkill create(UUID opportunityId, String value, int position) {
        OpportunitySkill skill = new OpportunitySkill();
        skill.id = UUID.randomUUID();
        skill.opportunityId = opportunityId;
        skill.value = value;
        skill.normalizedValue = OpportunityTagList.normalizedKey(value);
        skill.position = position;
        return skill;
    }

    /**
     * Cleans a submitted list and turns it into rows, in the author's order.
     *
     * <p>Returns rows rather than mutating: skills are replaced wholesale on save (delete-then-insert
     * in {@code OpportunitySkillService}), which keeps {@code position} gapless without a
     * reordering dance.
     */
    public static List<OpportunitySkill> from(UUID opportunityId, List<String> values) {
        List<String> normalized = OpportunityTagList.normalize(
                values, MAX_SKILLS_PER_OPPORTUNITY, MAX_SKILL_LENGTH, "skills");
        List<OpportunitySkill> skills = new java.util.ArrayList<>(normalized.size());
        for (int index = 0; index < normalized.size(); index++) {
            skills.add(create(opportunityId, normalized.get(index), index));
        }
        return skills;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOpportunityId() {
        return opportunityId;
    }

    public String getValue() {
        return value;
    }

    public String getNormalizedValue() {
        return normalizedValue;
    }

    public int getPosition() {
        return position;
    }
}
