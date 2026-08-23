package com.fursadhub.placement.domain;

/**
 * Placement states — CLAUDE.md section 39. The full frozen set is declared here so Phase 5 does not
 * need to redefine it, but Phase 4 only ever produces {@link #PLANNED}: the rest of the lifecycle
 * (start/cancel/terminate/complete) is Phase 5 scope.
 *
 * <p>{@code CANCELLED} means the placement never properly started; {@code TERMINATED} means it
 * started but ended early.
 */
public enum PlacementStatus {
    PLANNED,
    ACTIVE,
    COMPLETION_PENDING,
    COMPLETED,
    CANCELLED,
    TERMINATED
}
