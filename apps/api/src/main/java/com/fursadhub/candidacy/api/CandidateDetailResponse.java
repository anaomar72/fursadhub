package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.CandidacyQueryService;
import com.fursadhub.candidacy.domain.Candidacy;
import com.fursadhub.candidacy.domain.CandidacyEvent;
import com.fursadhub.candidacy.domain.ScreeningAnswer;

import java.util.List;

/** Full candidate detail for authorized organization staff. */
public record CandidateDetailResponse(
        String candidacyId,
        String opportunityId,
        String studentUserId,
        String studentEmail,
        String studentFullName,
        String source,
        String status,
        String createdAt,
        List<ScreeningAnswerResponse> answers,
        List<InternshipOfferResponse> offers,
        List<CandidacyEventResponse> history) {

    public record ScreeningAnswerResponse(String questionId, String answer) {
    }

    public record CandidacyEventResponse(
            String eventType, String fromStatus, String toStatus, String metadata, String occurredAt) {
    }

    public static CandidateDetailResponse from(CandidacyQueryService.CandidateDetail detail) {
        Candidacy candidacy = detail.candidacy();
        return new CandidateDetailResponse(
                candidacy.getId().toString(),
                candidacy.getOpportunityId().toString(),
                candidacy.getStudentUserId().toString(),
                detail.studentEmail(),
                detail.studentFullName(),
                candidacy.getSource().name(),
                candidacy.getStatus().name(),
                candidacy.getCreatedAt().toString(),
                detail.answers().stream().map(CandidateDetailResponse::toAnswer).toList(),
                detail.offers().stream().map(InternshipOfferResponse::from).toList(),
                detail.history().stream().map(CandidateDetailResponse::toEvent).toList());
    }

    private static ScreeningAnswerResponse toAnswer(ScreeningAnswer answer) {
        return new ScreeningAnswerResponse(answer.getQuestionId().toString(), answer.getAnswerText());
    }

    private static CandidacyEventResponse toEvent(CandidacyEvent event) {
        return new CandidacyEventResponse(
                event.getEventType(),
                event.getFromStatus() == null ? null : event.getFromStatus().name(),
                event.getToStatus() == null ? null : event.getToStatus().name(),
                event.getMetadata(),
                event.getOccurredAt().toString());
    }
}
