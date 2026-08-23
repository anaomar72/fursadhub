package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.CandidacyQueryService;
import com.fursadhub.candidacy.domain.Candidacy;

/**
 * One row of the organization's UNIFIED candidate pool. {@code source} tells the recruiter how the
 * candidate arrived (SELF_APPLICATION / UNIVERSITY_NOMINATION / BOTH) — it is a display and filter
 * dimension of one pipeline, not a separate pipeline (CLAUDE.md section 36).
 */
public record CandidateRowResponse(
        String candidacyId,
        String studentUserId,
        String studentEmail,
        String studentFullName,
        String source,
        String status,
        String createdAt,
        InternshipOfferResponse liveOffer) {

    public static CandidateRowResponse from(CandidacyQueryService.CandidateRow row) {
        Candidacy candidacy = row.candidacy();
        return new CandidateRowResponse(
                candidacy.getId().toString(),
                candidacy.getStudentUserId().toString(),
                row.studentEmail(),
                row.studentFullName(),
                candidacy.getSource().name(),
                candidacy.getStatus().name(),
                candidacy.getCreatedAt().toString(),
                row.liveOffer().map(InternshipOfferResponse::from).orElse(null));
    }
}
