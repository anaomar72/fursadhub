package com.fursadhub.opportunity.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.application.OpportunityStateTransitionService;
import com.fursadhub.opportunity.application.UpdateOpportunityService;
import com.fursadhub.opportunity.domain.InternshipOpportunity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Opportunity management detail, editing, and explicit lifecycle commands (CLAUDE.md section 7/8). */
@RestController
@RequestMapping("/api/v1/opportunities/{opportunityId}")
public class OpportunityController {

    private final OpportunityQueryService queryService;
    private final UpdateOpportunityService updateService;
    private final OpportunityStateTransitionService transitionService;

    public OpportunityController(
            OpportunityQueryService queryService, UpdateOpportunityService updateService,
            OpportunityStateTransitionService transitionService) {
        this.queryService = queryService;
        this.updateService = updateService;
        this.transitionService = transitionService;
    }

    @GetMapping
    public OpportunityResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId) {
        return OpportunityResponse.from(queryService.getForMember(currentUserId(jwt), opportunityId));
    }

    @PatchMapping
    public OpportunityResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId,
            @Valid @RequestBody UpdateOpportunityRequest request, HttpServletRequest httpRequest) {
        InternshipOpportunity opportunity = updateService.update(
                currentUserId(jwt), opportunityId, request.title(), request.description(), request.responsibilities(),
                request.requirements(), request.mode(), request.numberOfOpenings(), request.workMode(), request.location(),
                request.startDate(), request.endDate(), request.applicationDeadline(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return OpportunityResponse.from(opportunity);
    }

    @PostMapping("/publish")
    public OpportunityResponse publish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return OpportunityResponse.from(transitionService.publish(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/pause")
    public OpportunityResponse pause(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return OpportunityResponse.from(transitionService.pause(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/resume")
    public OpportunityResponse resume(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return OpportunityResponse.from(transitionService.resume(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/close")
    public OpportunityResponse close(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return OpportunityResponse.from(transitionService.close(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/cancel")
    public OpportunityResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return OpportunityResponse.from(transitionService.cancel(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
