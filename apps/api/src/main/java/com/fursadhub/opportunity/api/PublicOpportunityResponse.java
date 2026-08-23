package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.organization.api.OrganizationSummaryResponse;

import java.time.Instant;
import java.time.LocalDate;

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
        Instant publishedAt) {

    public static PublicOpportunityResponse from(InternshipOpportunity opportunity, OrganizationSummaryResponse organization) {
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
                opportunity.getPublishedAt());
    }
}
