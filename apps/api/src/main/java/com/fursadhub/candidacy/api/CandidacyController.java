package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.CandidacyQueryService;
import com.fursadhub.candidacy.application.CandidacyWorkflowService;
import com.fursadhub.candidacy.application.SendOfferService;
import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
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

import java.util.UUID;

/**
 * Explicit recruitment-stage commands on one candidacy (CLAUDE.md Phase 4 section 6).
 *
 * <p>Note the deliberate absence of any {@code PATCH /candidacies/{id}} that would accept a
 * client-chosen status. Every meaningful transition is its own named command whose legality is
 * validated in the domain (CLAUDE.md section 10).
 *
 * <p>Organization commands require an active ADMIN/RECRUITER membership at the opportunity's own
 * organization; {@code withdraw} is the student's own command and is authorized as the owning
 * student instead.
 */
@RestController
@RequestMapping("/api/v1/candidacies/{candidacyId}")
public class CandidacyController {

    private final CandidacyWorkflowService workflowService;
    private final CandidacyQueryService queryService;
    private final SendOfferService sendOfferService;

    public CandidacyController(
            CandidacyWorkflowService workflowService, CandidacyQueryService queryService, SendOfferService sendOfferService) {
        this.workflowService = workflowService;
        this.queryService = queryService;
        this.sendOfferService = sendOfferService;
    }

    @GetMapping
    public CandidateDetailResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId) {
        return CandidateDetailResponse.from(queryService.getForRecruiter(currentUserId(jwt), candidacyId));
    }

    @PostMapping("/review")
    public CandidacyResponse review(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId, HttpServletRequest httpRequest) {
        return CandidacyResponse.from(workflowService.review(
                currentUserId(jwt), candidacyId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/shortlist")
    public CandidacyResponse shortlist(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId, HttpServletRequest httpRequest) {
        return CandidacyResponse.from(workflowService.shortlist(
                currentUserId(jwt), candidacyId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/interview")
    public CandidacyResponse interview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId, HttpServletRequest httpRequest) {
        return CandidacyResponse.from(workflowService.moveToInterview(
                currentUserId(jwt), candidacyId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/reject")
    public CandidacyResponse reject(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId, HttpServletRequest httpRequest) {
        return CandidacyResponse.from(workflowService.reject(
                currentUserId(jwt), candidacyId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** Student-only: withdraws their own candidacy (CLAUDE.md Phase 4 section 13). */
    @PostMapping("/withdraw")
    public CandidacyResponse withdraw(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId, HttpServletRequest httpRequest) {
        return CandidacyResponse.from(workflowService.withdraw(
                currentUserId(jwt), candidacyId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/offer")
    public ResponseEntity<InternshipOfferResponse> sendOffer(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId,
            @Valid @RequestBody SendOfferRequest request, HttpServletRequest httpRequest) {
        var offer = sendOfferService.sendOffer(
                currentUserId(jwt), candidacyId, request.startDate(), request.endDate(), request.responseDeadline(),
                request.location(), request.details(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(InternshipOfferResponse.from(offer));
    }

    @PostMapping("/offers/{offerId}/withdraw")
    public MessageResponse withdrawOffer(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID candidacyId, @PathVariable UUID offerId,
            HttpServletRequest httpRequest) {
        sendOfferService.withdrawOffer(currentUserId(jwt), candidacyId, offerId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Offer withdrawn.");
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
