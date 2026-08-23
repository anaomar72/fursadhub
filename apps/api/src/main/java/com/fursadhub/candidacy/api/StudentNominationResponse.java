package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.NominationQueryService;
import com.fursadhub.candidacy.domain.Nomination;

/**
 * Nomination as the nominated student sees it. Deliberately omits any other student's data — a
 * student only ever sees their own nominations (CLAUDE.md section 12).
 */
public record StudentNominationResponse(
        String id,
        String opportunityId,
        String opportunityTitle,
        String organizationName,
        String status,
        String note,
        String createdAt,
        String respondedAt) {

    public static StudentNominationResponse from(NominationQueryService.StudentNominationRow row) {
        Nomination nomination = row.nomination();
        return new StudentNominationResponse(
                nomination.getId().toString(),
                nomination.getOpportunityId().toString(),
                row.opportunityTitle(),
                row.organizationName(),
                nomination.getStatus().name(),
                nomination.getNote(),
                nomination.getCreatedAt().toString(),
                nomination.getRespondedAt() == null ? null : nomination.getRespondedAt().toString());
    }
}
