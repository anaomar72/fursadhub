package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.organization.api.OrganizationSummaryResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Safe public fields only — no draft/internal/organization-private data (CLAUDE.md section 12). */
public record PublicOpportunityResponse(
        String id,
        OrganizationSummaryResponse organization,
        String title,
        String description,
        String responsibilities,
        String requirements,
        String mode,
        int numberOfOpenings,
        String workMode,
        String location,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate applicationDeadline,

        // ---------------------------------------------------------------- Backend Phase B3
        // All four are things a student needs BEFORE deciding to apply, and all four are authored by
        // the organization for publication — so they belong here. Nothing internal joins them: no
        // createdBy, no status, no draft content, and no counts of who else applied.
        CompensationResponse compensation,
        List<String> skills,
        List<String> perks,
        Integer hoursPerWeek,

        Instant publishedAt) {

    public static PublicOpportunityResponse from(
            InternshipOpportunity opportunity, OrganizationSummaryResponse organization,
            List<String> skills, List<String> perks) {
        return new PublicOpportunityResponse(
                opportunity.getId().toString(),
                organization,
                opportunity.getTitle(),
                opportunity.getDescription(),
                opportunity.getResponsibilities(),
                opportunity.getRequirements(),
                opportunity.getMode().name(),
                opportunity.getNumberOfOpenings(),
                opportunity.getWorkMode().name(),
                opportunity.getLocation(),
                opportunity.getStartDate(),
                opportunity.getEndDate(),
                opportunity.getApplicationDeadline(),
                CompensationResponse.from(opportunity.getCompensation()),
                skills == null ? List.of() : skills,
                perks == null ? List.of() : perks,
                opportunity.getHoursPerWeek(),
                opportunity.getPublishedAt());
    }
}
