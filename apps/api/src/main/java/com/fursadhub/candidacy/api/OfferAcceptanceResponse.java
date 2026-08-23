package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.OfferResponseService;

/**
 * The result of accepting an offer: the accepted offer, the now-ACCEPTED candidacy, and the ONE
 * placement created (CLAUDE.md section 38). {@code alreadyAccepted} is true when this call was a
 * safe repeat of an acceptance that had already committed — the client gets the same placement id
 * rather than an error or a duplicate.
 */
public record OfferAcceptanceResponse(
        InternshipOfferResponse offer,
        CandidacyResponse candidacy,
        PlacementSummary placement,
        boolean alreadyAccepted) {

    public record PlacementSummary(String id, String status, String startDate, String endDate, String location) {
    }

    public static OfferAcceptanceResponse from(OfferResponseService.AcceptanceResult result) {
        return new OfferAcceptanceResponse(
                InternshipOfferResponse.from(result.offer()),
                CandidacyResponse.from(result.candidacy()),
                new PlacementSummary(
                        result.placement().getId().toString(),
                        result.placement().getStatus().name(),
                        result.placement().getStartDate().toString(),
                        result.placement().getEndDate().toString(),
                        result.placement().getLocation()),
                result.alreadyAccepted());
    }
}
