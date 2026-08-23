package com.fursadhub.candidacy.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SendOfferRequest(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull LocalDate responseDeadline,
        @Size(max = 255) String location,
        @Size(max = 2000) String details) {
}
