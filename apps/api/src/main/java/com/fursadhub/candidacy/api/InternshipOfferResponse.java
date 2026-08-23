package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.domain.InternshipOffer;

public record InternshipOfferResponse(
        String id,
        String candidacyId,
        String startDate,
        String endDate,
        String responseDeadline,
        String location,
        String details,
        String status,
        String createdAt,
        String respondedAt) {

    public static InternshipOfferResponse from(InternshipOffer offer) {
        return new InternshipOfferResponse(
                offer.getId().toString(),
                offer.getCandidacyId().toString(),
                offer.getStartDate().toString(),
                offer.getEndDate().toString(),
                offer.getResponseDeadline().toString(),
                offer.getLocation(),
                offer.getDetails(),
                offer.getStatus().name(),
                offer.getCreatedAt().toString(),
                offer.getRespondedAt() == null ? null : offer.getRespondedAt().toString());
    }
}
