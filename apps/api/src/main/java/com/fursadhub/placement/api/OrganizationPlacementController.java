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
 * The organization's own placements (CLAUDE.md section 26).
 *
 * <p>Membership at the organization in the path is re-read from PostgreSQL on every call, so a
 * member of Organization A cannot reach Organization B's placements by changing the id. Admins and
 * recruiters see the organization's placements; an {@code ORGANIZATION_SUPERVISOR} sees only the
 * placements they are actively assigned to, never the wider pipeline.
 */
@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/placements")
public class OrganizationPlacementController {

    private final PlacementQueryService queryService;

    public OrganizationPlacementController(PlacementQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<PlacementResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return queryService.listForOrganization(currentUserId(jwt), organizationId).stream()
                .map(PlacementResponse::from)
                .toList();
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
