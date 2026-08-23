package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.domain.Candidacy;

public record CandidacyResponse(
        String id,
        String opportunityId,
        String organizationId,
        String source,
        String status,
        String createdAt,
        String updatedAt) {

    public static CandidacyResponse from(Candidacy candidacy) {
        return new CandidacyResponse(
                candidacy.getId().toString(),
                candidacy.getOpportunityId().toString(),
                candidacy.getOrganizationId().toString(),
                candidacy.getSource().name(),
                candidacy.getStatus().name(),
                candidacy.getCreatedAt().toString(),
                candidacy.getUpdatedAt().toString());
    }
}
