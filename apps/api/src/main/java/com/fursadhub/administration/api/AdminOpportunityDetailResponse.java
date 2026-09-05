package com.fursadhub.administration.api;

import com.fursadhub.opportunity.api.CompensationResponse;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import com.fursadhub.organization.domain.Organization;

import java.util.List;

/**
 * One opportunity in full, for a platform administrator (Backend Phase B6).
 *
 * <p>Separate from {@link AdminOpportunitySummaryResponse} rather than one DTO doing both jobs: the
 * authored prose and the Backend Phase B3 enrichment are what an operator opens a record to read,
 * and are exactly what would bloat a twenty-row table. The summary is embedded rather than copied,
 * so the two can never disagree about status or public discoverability.
 *
 * <p><strong>The same privacy boundary as the summary, and for the same reason.</strong> This adds
 * only content the ORGANIZATION authored for publication. It exposes no applicant, no candidacy, no
 * screening answers, no student record, no verification evidence and no stored-file identifier —
 * this endpoint is opportunity oversight, and the fields it would need to leak such data do not
 * exist on it.
 */
public record AdminOpportunityDetailResponse(
        AdminOpportunitySummaryResponse summary,
        String description,
        String responsibilities,
        String requirements,
        CompensationResponse compensation,
        List<String> skills,
        List<String> perks,
        Integer hoursPerWeek) {

    public static AdminOpportunityDetailResponse from(
            InternshipOpportunity opportunity, Organization organization,
            List<String> skills, List<String> perks) {
        return new AdminOpportunityDetailResponse(
                AdminOpportunitySummaryResponse.from(opportunity, organization),
                opportunity.getDescription(),
                opportunity.getResponsibilities(),
                opportunity.getRequirements(),
                CompensationResponse.from(opportunity.getCompensation()),
                skills,
                perks,
                opportunity.getHoursPerWeek());
    }
}
