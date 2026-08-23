package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.NominationQueryService;
import com.fursadhub.candidacy.domain.Nomination;

/** Nomination as university staff see it — includes the nominated student's identity. */
public record NominationResponse(
        String id,
        String opportunityId,
        String opportunityTitle,
        String organizationName,
        String studentUserId,
        String studentEmail,
        String studentFullName,
        String departmentId,
        String status,
        String note,
        String createdAt,
        String respondedAt) {

    public static NominationResponse from(NominationQueryService.NominationRow row) {
        Nomination nomination = row.nomination();
        return new NominationResponse(
                nomination.getId().toString(),
                nomination.getOpportunityId().toString(),
                row.opportunityTitle(),
                row.organizationName(),
                nomination.getStudentUserId().toString(),
                row.studentEmail(),
                row.studentFullName(),
                nomination.getDepartmentId().toString(),
                nomination.getStatus().name(),
                nomination.getNote(),
                nomination.getCreatedAt().toString(),
                nomination.getRespondedAt() == null ? null : nomination.getRespondedAt().toString());
    }

    /** Minimal projection for the write endpoints, which have no enriched row to hand. */
    public static NominationResponse from(Nomination nomination) {
        return new NominationResponse(
                nomination.getId().toString(),
                nomination.getOpportunityId().toString(),
                null,
                null,
                nomination.getStudentUserId().toString(),
                null,
                null,
                nomination.getDepartmentId().toString(),
                nomination.getStatus().name(),
                nomination.getNote(),
                nomination.getCreatedAt().toString(),
                nomination.getRespondedAt() == null ? null : nomination.getRespondedAt().toString());
    }
}
