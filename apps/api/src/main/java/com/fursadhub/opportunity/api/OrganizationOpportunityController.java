package com.fursadhub.opportunity.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.opportunity.application.CreateOpportunityService;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.application.OpportunityTagService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Organization-scoped opportunity creation/listing (CLAUDE.md section 8). */
@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/opportunities")
public class OrganizationOpportunityController {

    private final CreateOpportunityService createService;
    private final OpportunityQueryService queryService;
    private final OpportunityTagService tags;

    public OrganizationOpportunityController(
            CreateOpportunityService createService, OpportunityQueryService queryService, OpportunityTagService tags) {
        this.createService = createService;
        this.queryService = queryService;
        this.tags = tags;
    }

    @PostMapping
    public ResponseEntity<OpportunityResponse> create(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody CreateOpportunityRequest request, HttpServletRequest httpRequest) {
        InternshipOpportunity opportunity = createService.create(
                currentUserId(jwt), organizationId, request.title(), request.description(), request.responsibilities(),
                request.requirements(), request.mode(), request.numberOfOpenings(), request.workMode(), request.location(),
                request.startDate(), request.endDate(), request.applicationDeadline(),
                CompensationRequest.toDomain(request.compensation()), request.skills(), request.perks(),
                request.hoursPerWeek(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(OpportunityResponse.from(
                opportunity, tags.skillsOf(opportunity.getId()), tags.perksOf(opportunity.getId())));
    }

    /**
     * The organization's own opportunity list. Skills and perks are batch-loaded for the whole page
     * in one query each rather than per row — the same N+1 avoidance the public listing uses.
     */
    @GetMapping
    public List<OpportunityResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        List<InternshipOpportunity> opportunities =
                queryService.listForOrganization(currentUserId(jwt), organizationId);
        List<UUID> ids = opportunities.stream().map(InternshipOpportunity::getId).toList();
        Map<UUID, List<String>> skills = tags.skillsByOpportunity(ids);
        Map<UUID, List<String>> perks = tags.perksByOpportunity(ids);

        return opportunities.stream()
                .map(opportunity -> OpportunityResponse.from(
                        opportunity,
                        skills.getOrDefault(opportunity.getId(), List.of()),
                        perks.getOrDefault(opportunity.getId(), List.of())))
                .toList();
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
