package com.fursadhub.opportunity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One perk an opportunity offers (Backend Phase B3) — "Mentorship", "Transport allowance",
 * "Certificate on completion".
 *
 * <p><strong>Free text, not a fixed set of booleans.</strong> A boolean column per perk would freeze
 * the list at whatever FursadHub imagined in 2026 and would need a migration plus a deploy for every
 * addition; worse, it would push organizations into approximating what they actually offer. The
 * repository has no boolean-flag pattern to follow here, so nothing is lost by staying open.
 *
 * <p>Structurally identical to {@link OpportunitySkill} — same table shape, same hygiene rules via
 * {@code OpportunityTagList}, same position-CHECK cap — because they are the same kind of thing:
 * a short, ordered, author-supplied value list owned by the opportunity. They are two tables rather
 * than one table with a {@code kind} discriminator so each keeps its own cap and its own length
 * bound, and so a query for perks never has to remember to filter by kind.
 *
 * <p>Perks are never inferred. FursadHub does not add "Certificate" because an internship completed
 * successfully, and it does not translate an organization's wording.
 */
@Entity
@Table(name = "opportunity_perks")
public class OpportunityPerk {

    public static final int MAX_PERKS_PER_OPPORTUNITY = 15;
    public static final int MAX_PERK_LENGTH = 80;

    @Id
    private UUID id;

    @Column(name = "opportunity_id", nullable = false)
    private UUID opportunityId;

    @Column(nullable = false, length = MAX_PERK_LENGTH)
    private String value;

    @Column(name = "normalized_value", nullable = false, length = MAX_PERK_LENGTH)
    private String normalizedValue;

    @Column(nullable = false)
    private int position;

    protected OpportunityPerk() {
    }

    public static OpportunityPerk create(UUID opportunityId, String value, int position) {
        OpportunityPerk perk = new OpportunityPerk();
        perk.id = UUID.randomUUID();
        perk.opportunityId = opportunityId;
        perk.value = value;
        perk.normalizedValue = OpportunityTagList.normalizedKey(value);
        perk.position = position;
        return perk;
    }

    public static List<OpportunityPerk> from(UUID opportunityId, List<String> values) {
        List<String> normalized = OpportunityTagList.normalize(
                values, MAX_PERKS_PER_OPPORTUNITY, MAX_PERK_LENGTH, "perks");
        List<OpportunityPerk> perks = new ArrayList<>(normalized.size());
        for (int index = 0; index < normalized.size(); index++) {
            perks.add(create(opportunityId, normalized.get(index), index));
        }
        return perks;
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
