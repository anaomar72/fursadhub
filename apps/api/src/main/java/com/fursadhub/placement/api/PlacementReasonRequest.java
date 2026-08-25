package com.fursadhub.placement.api;

import jakarta.validation.constraints.Size;

/**
 * The optional staff explanation recorded with a cancellation or termination. It is stored for the
 * record only — the placement's status, not this text, is what drives any behaviour.
 */
public record PlacementReasonRequest(@Size(max = 1000) String reason) {

    /** Tolerates a completely absent body, so `POST /cancel` with no payload is valid. */
    public static String reasonOf(PlacementReasonRequest request) {
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            return null;
        }
        return request.reason().trim();
    }
}
