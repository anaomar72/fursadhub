package com.fursadhub.opportunity.api;

import com.fursadhub.common.api.PatchField;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.opportunity.application.OpportunityEnrichment;
import com.fursadhub.opportunity.application.OpportunityQueryService;
import com.fursadhub.opportunity.application.OpportunityStateTransitionService;
import com.fursadhub.opportunity.application.OpportunityTagService;
import com.fursadhub.opportunity.application.UpdateOpportunityService;
import com.fursadhub.opportunity.domain.Compensation;
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
    private final OpportunityTagService tags;

    public OpportunityController(
            OpportunityQueryService queryService, UpdateOpportunityService updateService,
            OpportunityStateTransitionService transitionService, OpportunityTagService tags) {
        this.queryService = queryService;
        this.updateService = updateService;
        this.transitionService = transitionService;
        this.tags = tags;
    }

    @GetMapping
    public OpportunityResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId) {
        return respond(queryService.getForMember(currentUserId(jwt), opportunityId));
    }

    @PatchMapping
    public OpportunityResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId,
            @Valid @RequestBody UpdateOpportunityRequest request, HttpServletRequest httpRequest) {
        InternshipOpportunity opportunity = updateService.update(
                currentUserId(jwt), opportunityId, request.title(), request.description(), request.responsibilities(),
                request.requirements(), request.mode(), request.numberOfOpenings(), request.workMode(), request.location(),
                request.startDate(), request.endDate(), request.applicationDeadline(),
                enrichmentOf(request),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return respond(opportunity);
    }

    @PostMapping("/publish")
    public OpportunityResponse publish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return respond(transitionService.publish(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/pause")
    public OpportunityResponse pause(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return respond(transitionService.pause(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/resume")
    public OpportunityResponse resume(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return respond(transitionService.resume(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/close")
    public OpportunityResponse close(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return respond(transitionService.close(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/cancel")
    public OpportunityResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, HttpServletRequest httpRequest) {
        return respond(transitionService.cancel(currentUserId(jwt), opportunityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /**
     * Carries the request's PRESENCE information into the application layer intact.
     *
     * <p>{@code compensation} is mapped inside its wrapper rather than around it, so an omitted
     * object stays absent while an explicitly null one becomes a real "clear this" instruction — the
     * distinction the whole mechanism exists to preserve.
     */
    private OpportunityEnrichment enrichmentOf(UpdateOpportunityRequest request) {
        PatchField<CompensationRequest> submitted = PatchField.orAbsent(request.compensation());
        PatchField<Compensation> compensation = submitted.isPresent()
                ? PatchField.of(CompensationRequest.toDomain(submitted.value()))
                : PatchField.absent();

        return new OpportunityEnrichment(
                compensation, request.skills(), request.perks(), request.hoursPerWeek());
    }

    /**
     * Attaches the Backend Phase B3 value lists, which live in their own tables rather than on the
     * entity. One helper for every route on this controller so a new route cannot accidentally
     * return an opportunity whose skills and perks silently read as empty.
     */
    private OpportunityResponse respond(InternshipOpportunity opportunity) {
        return OpportunityResponse.from(
                opportunity, tags.skillsOf(opportunity.getId()), tags.perksOf(opportunity.getId()));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
