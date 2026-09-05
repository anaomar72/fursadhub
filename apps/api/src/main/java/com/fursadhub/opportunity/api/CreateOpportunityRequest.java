package com.fursadhub.opportunity.api;

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
 * Backend Phase B3 widened this additively — every new field is optional, so a client sending only
 * the original eleven continues to create opportunities exactly as before.
 *
 * <p>Create needs no presence-aware wrapper: there is no stored value to preserve, so omitted and
 * null mean the same thing here. The distinction only matters on update — see
 * {@link UpdateOpportunityRequest}.
 */
public record CreateOpportunityRequest(
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
        @Valid CompensationRequest compensation,

        /**
         * Bounds are checked twice on purpose: the count here so an over-long list is a field error
         * naming {@code skills}, and again in the domain after blanks and duplicates are removed,
         * because that is the count that actually reaches the database.
         */
        @Size(max = OpportunitySkill.MAX_SKILLS_PER_OPPORTUNITY,
                message = "An opportunity supports at most 20 skills.")
        List<@Size(max = OpportunitySkill.MAX_SKILL_LENGTH) String> skills,

        @Size(max = OpportunityPerk.MAX_PERKS_PER_OPPORTUNITY,
                message = "An opportunity supports at most 15 perks.")
        List<@Size(max = OpportunityPerk.MAX_PERK_LENGTH) String> perks,

        @Min(value = InternshipOpportunity.MIN_HOURS_PER_WEEK, message = "Hours per week must be at least 1.")
        @Max(value = InternshipOpportunity.MAX_HOURS_PER_WEEK, message = "Hours per week is not valid.")
        Integer hoursPerWeek) {
}
