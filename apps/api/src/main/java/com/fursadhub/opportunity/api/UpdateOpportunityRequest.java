package com.fursadhub.opportunity.api;

import com.fursadhub.opportunity.domain.OpportunityMode;
import com.fursadhub.opportunity.domain.WorkMode;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateOpportunityRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 4000) String description,
        @Size(max = 4000) String responsibilities,
        @Size(max = 4000) String requirements,
        @NotNull OpportunityMode mode,
        @Min(1) int numberOfOpenings,
        @NotNull WorkMode workMode,
        @Size(max = 255) String location,
        @NotNull @Future LocalDate startDate,
        @NotNull @Future LocalDate endDate,
        LocalDate applicationDeadline) {
}
