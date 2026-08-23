package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.CandidacyQueryService;
import com.fursadhub.candidacy.domain.CandidacySource;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * The organization's candidate pool for one opportunity (CLAUDE.md Phase 4 section 11/27).
 *
 * <p>There is ONE endpoint and one pool. {@code source} is an optional filter over that single
 * pipeline, never a separate "applicants" vs "nominees" endpoint — a BOTH candidacy appears under
 * either filter.
 */
@RestController
@RequestMapping("/api/v1/opportunities/{opportunityId}/candidacies")
public class OpportunityCandidateController {

    private final CandidacyQueryService queryService;

    public OpportunityCandidateController(CandidacyQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<CandidateRowResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID opportunityId,
            @RequestParam(required = false) CandidacySource source) {
        return queryService.listForOpportunity(currentUserId(jwt), opportunityId, source).stream()
                .map(CandidateRowResponse::from)
                .toList();
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
