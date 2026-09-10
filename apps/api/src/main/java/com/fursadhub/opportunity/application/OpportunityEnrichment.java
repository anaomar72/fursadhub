package com.fursadhub.opportunity.application;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.opportunity.domain.Compensation;

import java.util.List;

/**
 * The Backend Phase B3 additions as a client ASKED to change them, still carrying the distinction
 * between "omitted" and "cleared".
 *
 * <p>Separate from the resolved values the entity and the collection tables ultimately store, in the
 * same shape B2 used for institution profiles: the request keeps presence, the domain keeps values,
 * and the service in between is the only place both the request and the stored state are in scope.
 *
 * <p>Used only by the update path. Create has no stored value to preserve, so it passes plain
 * values.
 */
public record OpportunityEnrichment(
        PatchField<Compensation> compensation,
        PatchField<List<String>> skills,
        PatchField<List<String>> perks,
        PatchField<Integer> hoursPerWeek) {

    /**
     * Normalises every component to a non-null {@link PatchField}. A raw null means the field was
     * never set, which is ABSENT — the reading that preserves data rather than destroying it.
     */
    public OpportunityEnrichment {
        compensation = PatchField.orAbsent(compensation);
        skills = PatchField.orAbsent(skills);
        perks = PatchField.orAbsent(perks);
        hoursPerWeek = PatchField.orAbsent(hoursPerWeek);
    }
}
