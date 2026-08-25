package com.fursadhub.placement.api;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * The chosen supervisor. This id is never trusted: the backend re-validates that the user exists,
 * holds an ACTIVE supervisor membership, and belongs to the placement's own university/organization
 * before anything is written (CLAUDE.md Phase 5 section 13).
 */
public record AssignSupervisorRequest(@NotNull UUID supervisorUserId) {
}
