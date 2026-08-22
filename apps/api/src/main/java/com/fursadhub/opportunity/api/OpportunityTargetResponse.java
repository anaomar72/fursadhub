package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.application.OpportunityTargetService;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OpportunityTargetResponse(
        String id,
        String universityId,
        List<UUID> departmentIds,
        int requestedNominees,
        LocalDate nominationDeadline,
        String status,
        Instant createdAt) {

    public static OpportunityTargetResponse from(OpportunityTargetService.TargetWithDepartments targetWithDepartments) {
        return new OpportunityTargetResponse(
                targetWithDepartments.target().getId().toString(),
                targetWithDepartments.target().getUniversityId().toString(),
                targetWithDepartments.departmentIds(),
                targetWithDepartments.target().getRequestedNominees(),
                targetWithDepartments.target().getNominationDeadline(),
                targetWithDepartments.target().getStatus().name(),
                targetWithDepartments.target().getCreatedAt());
    }
}
