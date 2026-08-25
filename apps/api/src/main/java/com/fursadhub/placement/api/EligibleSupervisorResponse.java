package com.fursadhub.placement.api;

import com.fursadhub.placement.application.PlacementQueryService;

/**
 * A staff member the UI may offer as a supervisor choice for one placement.
 *
 * <p>This list is a convenience so nobody has to paste a UUID — it is NOT the security boundary.
 * {@code SupervisorEligibility} re-validates whatever id the browser actually sends on the write
 * path, so a caller who ignores this list gains nothing (CLAUDE.md section 12/24).
 */
public record EligibleSupervisorResponse(String userId, String email) {

    public static EligibleSupervisorResponse from(PlacementQueryService.EligibleSupervisor supervisor) {
        return new EligibleSupervisorResponse(supervisor.userId().toString(), supervisor.email());
    }
}
