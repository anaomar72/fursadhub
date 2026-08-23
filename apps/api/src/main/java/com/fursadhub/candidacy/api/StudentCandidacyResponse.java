package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.CandidacyQueryService;
import com.fursadhub.candidacy.domain.Candidacy;

/** A student's own candidacy, with just enough opportunity context to render "My applications". */
public record StudentCandidacyResponse(
        String id,
        String opportunityId,
        String opportunityTitle,
        String source,
        String status,
        String createdAt,
        InternshipOfferResponse liveOffer) {

    public static StudentCandidacyResponse from(CandidacyQueryService.StudentCandidacyRow row) {
        Candidacy candidacy = row.candidacy();
        return new StudentCandidacyResponse(
                candidacy.getId().toString(),
                candidacy.getOpportunityId().toString(),
                row.opportunity().getTitle(),
                candidacy.getSource().name(),
                candidacy.getStatus().name(),
                candidacy.getCreatedAt().toString(),
                row.liveOffer().map(InternshipOfferResponse::from).orElse(null));
    }
}
