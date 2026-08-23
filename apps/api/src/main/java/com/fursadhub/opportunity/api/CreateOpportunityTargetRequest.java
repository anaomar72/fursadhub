package com.fursadhub.opportunity.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateOpportunityTargetRequest(
        @NotNull UUID universityId,
        List<UUID> departmentIds,
        @Min(1) int requestedNominees,
        @NotNull LocalDate nominationDeadline) {
}
