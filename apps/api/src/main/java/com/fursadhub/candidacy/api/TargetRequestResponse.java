package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.NominationQueryService;

import java.util.List;
import java.util.UUID;

/** A published targeted opportunity as it appears in a university's nomination work queue. */
public record TargetRequestResponse(
        String targetId,
        String opportunityId,
        String opportunityTitle,
        String organizationName,
        String mode,
        int requestedNominees,
        int liveNominationCount,
        String nominationDeadline,
        String targetStatus,
        List<String> eligibleDepartmentIds,
        String startDate,
        String endDate) {

    public static TargetRequestResponse from(NominationQueryService.TargetRequestRow row) {
        return new TargetRequestResponse(
                row.target().getId().toString(),
                row.opportunity().getId().toString(),
                row.opportunity().getTitle(),
                row.organizationName(),
                row.opportunity().getMode().name(),
                row.target().getRequestedNominees(),
                row.liveNominationCount(),
                row.target().getNominationDeadline().toString(),
                row.target().getStatus().name(),
                row.eligibleDepartmentIds().stream().map(UUID::toString).toList(),
                row.opportunity().getStartDate().toString(),
                row.opportunity().getEndDate().toString());
    }
}
