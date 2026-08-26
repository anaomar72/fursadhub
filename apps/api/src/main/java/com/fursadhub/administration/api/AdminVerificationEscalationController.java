package com.fursadhub.administration.api;

import com.fursadhub.administration.application.AdminVerificationEscalationService;
import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.verification.application.VerificationEvidenceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
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
import java.util.UUID;

/**
 * Escalated student verification cases (Phase 7 "Admin: verification escalation").
 *
 * <p>Only cases a university has explicitly escalated are reachable here. A platform reviewer cannot
 * open an ordinary case that a university is handling perfectly well — the university has to ask
 * first — which keeps this console from becoming a way to read any student's record on a whim.
 *
 * <p>Resolutions use the SAME frozen transitions the university uses (CLAUDE.md section 30). There is
 * no platform-only state and no way around the state machine.
 */
@RestController
@RequestMapping("/api/v1/admin/verification-escalations")
public class AdminVerificationEscalationController {

    private final AdminVerificationEscalationService escalationService;
    private final VerificationEvidenceService evidenceService;

    public AdminVerificationEscalationController(
            AdminVerificationEscalationService escalationService, VerificationEvidenceService evidenceService) {
        this.escalationService = escalationService;
        this.evidenceService = evidenceService;
    }

    @GetMapping
    public List<EscalatedCaseResponse> queue(@AuthenticationPrincipal Jwt jwt) {
        return escalationService.queue(currentUserId(jwt)).stream()
                .map(EscalatedCaseResponse::from)
                .toList();
    }

    @GetMapping("/{caseId}")
    public EscalatedCaseResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID caseId) {
        return EscalatedCaseResponse.from(escalationService.get(currentUserId(jwt), caseId));
    }

    /** The student's private evidence. Audited like every other private read. */
    @GetMapping("/{caseId}/evidence/document")
    public ResponseEntity<InputStreamResource> downloadEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID caseId, HttpServletRequest httpRequest) {
        VerificationEvidenceService.Document document = evidenceService.openForPlatformReviewer(
                currentUserId(jwt), caseId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    @PostMapping("/{caseId}/verify")
    public MessageResponse verify(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID caseId, HttpServletRequest httpRequest) {
        escalationService.verify(currentUserId(jwt), caseId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Student enrollment verified.");
    }

    @PostMapping("/{caseId}/reject")
    public MessageResponse reject(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID caseId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        escalationService.reject(currentUserId(jwt), caseId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Verification case rejected.");
    }

    @PostMapping("/{caseId}/request-more-evidence")
    public MessageResponse requestMoreEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID caseId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        escalationService.requestMoreEvidence(currentUserId(jwt), caseId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("More evidence requested from the student.");
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
