package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.InternshipOpportunity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

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

        // ---------------------------------------------------------------- Backend Phase B3
        // Readable here as well as publicly because the management form must be able to display what
        // it edits. Under non_null serialization an opportunity that predates B3 simply omits them.
        CompensationResponse compensation,
        List<String> skills,
        List<String> perks,
        Integer hoursPerWeek,

        String status,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt) {

    /**
     * Skills and perks are passed in rather than read from the entity: they live in their own tables
     * (the entity maps no associations, as nothing in this codebase does), and the caller is the
     * only one positioned to load them for a single opportunity or batch them for a page.
     */
    public static OpportunityResponse from(
            InternshipOpportunity opportunity, List<String> skills, List<String> perks) {
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
                CompensationResponse.from(opportunity.getCompensation()),
                // An empty list is serialized as [] rather than omitted, which is the honest answer:
                // the opportunity exists and has no skills, as opposed to the field not existing.
                skills == null ? List.of() : skills,
                perks == null ? List.of() : perks,
                opportunity.getHoursPerWeek(),
                opportunity.getStatus().name(),
                opportunity.getPublishedAt(),
                opportunity.getCreatedAt(),
                opportunity.getUpdatedAt());
    }
}
