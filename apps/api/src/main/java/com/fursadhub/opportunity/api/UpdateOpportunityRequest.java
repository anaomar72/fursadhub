package com.fursadhub.opportunity.api;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.OpportunityPerk;
import com.fursadhub.opportunity.domain.OpportunitySkill;
import com.fursadhub.opportunity.domain.WorkMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * The editable opportunity. Backend Phase B3 widened it additively.
 *
 * <p><strong>Two update semantics in one request, exactly as Backend Phase B2 established for
 * institution profiles.</strong>
 *
 * <ul>
 *   <li>The eleven ORIGINAL fields keep FULL REPLACEMENT: {@code title}, {@code description},
 *       {@code mode}, {@code numberOfOpenings}, {@code workMode}, {@code startDate} and
 *       {@code endDate} are required, and omitting {@code responsibilities},
 *       {@code requirements}, {@code location} or {@code applicationDeadline} CLEARS it. Callers
 *       written against that contract may rely on it, so B3 does not touch it.
 *   <li>Every field B3 ADDED is a {@link PatchField}: omitting one PRESERVES the stored value, and
 *       only an explicit {@code null} clears it.
 * </ul>
 *
 * <p>This is the B2 lesson applied before it could bite again rather than after. The existing
 * frontend {@code updateOpportunity} sends exactly the original eleven fields and knows nothing
 * about compensation, skills, perks or hours; under plain full replacement every save from that
 * form would silently erase all four. The audit found this endpoint had precisely the shape B2's
 * profile PATCH did, so it gets precisely the same treatment.
 *
 * <p>Clearing a LIST is an explicit empty array, and clearing compensation is an explicit null.
 * Both are distinguishable from omission — that is the entire point of the wrapper.
 */
public record UpdateOpportunityRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 4000) String description,
        @Size(max = 4000) String responsibilities,
        @Size(max = 4000) String requirements,
        @NotNull OpportunityMode mode,
        @Min(1) int numberOfOpenings,
        @NotNull WorkMode workMode,
        @Size(max = 255) String location,
        @NotNull @Future LocalDate startDate,
        @NotNull @Future LocalDate endDate,
        LocalDate applicationDeadline,

        // ---------------------------------------------------------------- Backend Phase B3
        // Presence-aware from here down. Omitted => preserved; explicit null/[] => cleared.
        @Valid PatchField<CompensationRequest> compensation,

        @Size(max = OpportunitySkill.MAX_SKILLS_PER_OPPORTUNITY,
                message = "An opportunity supports at most 20 skills.")
        PatchField<List<@Size(max = OpportunitySkill.MAX_SKILL_LENGTH) String>> skills,

        @Size(max = OpportunityPerk.MAX_PERKS_PER_OPPORTUNITY,
                message = "An opportunity supports at most 15 perks.")
        PatchField<List<@Size(max = OpportunityPerk.MAX_PERK_LENGTH) String>> perks,

        @Min(value = InternshipOpportunity.MIN_HOURS_PER_WEEK, message = "Hours per week must be at least 1.")
        @Max(value = InternshipOpportunity.MAX_HOURS_PER_WEEK, message = "Hours per week is not valid.")
        PatchField<Integer> hoursPerWeek) {
}
