package com.fursadhub.opportunity.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.opportunity.application.OpportunityTargetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Target-university management for a draft opportunity (CLAUDE.md section 9/10). */
@RestController
@RequestMapping("/api/v1/opportunities/{opportunityId}/targets")
public class OpportunityTargetController {

    private final OpportunityTargetService targetService;

    public OpportunityTargetController(OpportunityTargetService targetService) {
        this.targetService = targetService;
    }

    @GetMapping
    public List<OpportunityTargetResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId) {
        return targetService.listTargets(currentUserId(jwt), opportunityId).stream()
                .map(OpportunityTargetResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<OpportunityTargetResponse> add(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId,
            @Valid @RequestBody CreateOpportunityTargetRequest request, HttpServletRequest httpRequest) {
        OpportunityTargetService.TargetWithDepartments target = targetService.addTarget(
                currentUserId(jwt), opportunityId, request.universityId(), request.departmentIds(), request.requestedNominees(),
                request.nominationDeadline(), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(OpportunityTargetResponse.from(target));
    }

    @DeleteMapping("/{targetId}")
    public MessageResponse remove(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID opportunityId, @PathVariable UUID targetId,
            HttpServletRequest httpRequest) {
        targetService.removeTarget(currentUserId(jwt), opportunityId, targetId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Target removed.");
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
