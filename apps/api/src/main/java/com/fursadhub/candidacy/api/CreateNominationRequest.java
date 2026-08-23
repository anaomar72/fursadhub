package com.fursadhub.candidacy.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * University staff nominating a student. {@code studentUserId} is legitimately supplied here — the
 * caller is acting ON another user, not as them — and every scope check (university, department,
 * verification, target eligibility) is re-verified server side.
 */
public record CreateNominationRequest(
        @NotNull UUID opportunityId,
        @NotNull UUID studentUserId,
        @Size(max = 1000) String note) {
}
