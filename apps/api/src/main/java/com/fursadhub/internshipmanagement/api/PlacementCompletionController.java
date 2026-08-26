package com.fursadhub.internshipmanagement.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.internshipmanagement.application.CompletePlacementService;
import com.fursadhub.placement.api.PlacementResponse;
import com.fursadhub.placement.application.PlacementQueryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Placement completion (Phase 6 sections 21-24).
 *
 * <p>Phase 5 deliberately shipped no {@code /complete} route so that completion could be gated on
 * requirements that did not exist yet. This is that route, and it is the ONLY way a placement reaches
 * COMPLETED over HTTP.
 *
 * <p>The checklist endpoint is readable by every party attached to the placement — the student, the
 * university and the host organization — so everyone can see what is outstanding. Performing the
 * completion is university-only: it certifies that the university's own requirements are met.
 */
@RestController
@RequestMapping("/api/v1/placements/{placementId}")
public class PlacementCompletionController {

    private final CompletePlacementService completionService;
    private final PlacementQueryService placementQueryService;

    public PlacementCompletionController(
            CompletePlacementService completionService, PlacementQueryService placementQueryService) {
        this.completionService = completionService;
        this.placementQueryService = placementQueryService;
    }

    /**
     * The backend-computed completion checklist.
     *
     * <p>The UI renders exactly this and never re-derives requirements from the policy, so what a
     * student is shown and what {@link #complete} enforces cannot drift apart.
     */
    @GetMapping("/completion")
    public CompletionStatusResponse status(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return CompletionStatusResponse.from(completionService.status(currentUserId(jwt), placementId));
    }

    /**
     * COMPLETION_PENDING to COMPLETED, in one transaction.
     *
     * <p>Fails with {@code PLACEMENT_COMPLETION_REQUIREMENTS_NOT_MET} and a {@code fieldErrors} entry
     * per outstanding requirement when anything enabled is unmet, so the frontend can list them all
     * without parsing the message. Repeating the call on an already-completed placement returns it
     * unchanged rather than duplicating any side effect.
     */
    @PostMapping("/complete")
    public PlacementResponse complete(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId, HttpServletRequest httpRequest) {
        UUID userId = currentUserId(jwt);
        completionService.complete(userId, placementId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        // Re-read through the normal Phase 5 read path so the response carries the refreshed
        // supervisors and resolved context rather than a partial view of the locked row.
        return PlacementResponse.from(placementQueryService.getForActor(userId, placementId));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
