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
 * The university's view of its students' placements (CLAUDE.md section 25).
 *
 * <p>The university id sits in the path, mirroring the Phase 2/4 university endpoints, but it is
 * never trusted on its own: the service re-reads the caller's active membership at THAT university
 * and narrows the result by their real role — an admin sees the whole university, a coordinator only
 * their assigned departments, a supervisor only the placements they are actively assigned to.
 *
 * <p>The narrowing happens in the query, not as a filter over a wider result, so an out-of-scope
 * placement is never loaded in the first place. Department isolation is a backend boundary here,
 * not a UI convenience.
 */
@RestController
@RequestMapping("/api/v1/universities/{universityId}/placements")
public class UniversityPlacementController {

    private final PlacementQueryService queryService;

    public UniversityPlacementController(PlacementQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<PlacementResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId) {
        return queryService.listForUniversity(currentUserId(jwt), universityId).stream()
                .map(PlacementResponse::from)
                .toList();
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
