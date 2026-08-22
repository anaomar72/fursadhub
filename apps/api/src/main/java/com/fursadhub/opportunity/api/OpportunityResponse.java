package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.InternshipOpportunity;

import java.time.Instant;
import java.time.LocalDate;

/** Organization-management view — never returned from public endpoints. */
public record OpportunityResponse(
        String id,
        String organizationId,
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
        String status,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt) {

    public static OpportunityResponse from(InternshipOpportunity opportunity) {
        return new OpportunityResponse(
                opportunity.getId().toString(),
                opportunity.getOrganizationId().toString(),
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
                opportunity.getStatus().name(),
                opportunity.getPublishedAt(),
                opportunity.getCreatedAt(),
                opportunity.getUpdatedAt());
    }
}
