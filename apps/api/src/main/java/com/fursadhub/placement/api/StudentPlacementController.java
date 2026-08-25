package com.fursadhub.placement.api;

import com.fursadhub.placement.application.PlacementQueryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * A student's own placements (CLAUDE.md section 12 — self-service).
 *
 * <p>Rooted at {@code /students/me/...} and scoped to the authenticated caller. No student id is
 * accepted anywhere, and the detail route reports another student's placement as NOT FOUND rather
 * than FORBIDDEN, so probing UUIDs cannot even confirm that someone else's placement exists.
 *
 * <p>Students read their placement; they do not drive its lifecycle. Starting, cancelling,
 * terminating and requesting completion all live on {@link PlacementController} behind organization
 * authority.
 */
@RestController
@RequestMapping("/api/v1/students/me/placements")
public class StudentPlacementController {

    private final PlacementQueryService queryService;

    public StudentPlacementController(PlacementQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<PlacementResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return queryService.listForStudent(currentUserId(jwt)).stream()
                .map(PlacementResponse::from)
                .toList();
    }

    @GetMapping("/{placementId}")
    public PlacementResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return PlacementResponse.from(queryService.getForStudent(currentUserId(jwt), placementId));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
