package com.fursadhub.internshipmanagement.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.internshipmanagement.application.PlacementEvaluationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * The organization's evaluation of the student (CLAUDE.md section 44).
 *
 * <p>Authored only by the ORGANIZATION supervisor actively assigned to this placement. Submitting
 * and finalizing are separate named commands, and there is no route back out of FINAL.
 *
 * <p>A {@code 204 No Content} on the read is deliberate: it is what a student receives while the
 * evaluation is still being drafted, so polling reveals nothing about an unfinished assessment.
 */
@RestController
@RequestMapping("/api/v1/placements/{placementId}/evaluation")
public class PlacementEvaluationController {

    private final PlacementEvaluationService evaluationService;

    public PlacementEvaluationController(PlacementEvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @GetMapping
    public ResponseEntity<EvaluationResponse> get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return evaluationService.findVisibleTo(currentUserId(jwt), placementId)
                .map(EvaluationResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Creates the draft on first call, updates it thereafter. Ratings may be partial while drafting. */
    @PutMapping
    public EvaluationResponse saveDraft(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody EvaluationDraftRequest request) {
        return EvaluationResponse.from(evaluationService.saveDraft(
                currentUserId(jwt), placementId,
                request.professionalismRating(), request.reliabilityRating(), request.communicationRating(),
                request.workPerformanceRating(), request.teamworkRating(), request.overallRating(),
                request.strengths(), request.improvementAreas(), request.finalComments()));
    }

    /** DRAFT to SUBMITTED. Every rating must be present. Idempotent. */
    @PostMapping("/submit")
    public EvaluationResponse submit(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId, HttpServletRequest httpRequest) {
        return EvaluationResponse.from(evaluationService.submit(
                currentUserId(jwt), placementId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** SUBMITTED to FINAL. Terminal, and the state the completion requirement checks for. */
    @PostMapping("/finalize")
    public EvaluationResponse finalizeEvaluation(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId, HttpServletRequest httpRequest) {
        return EvaluationResponse.from(evaluationService.finalizeEvaluation(
                currentUserId(jwt), placementId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
