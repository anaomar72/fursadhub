package com.fursadhub.verification.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.verification.application.ConsumeVerificationChallengeService;
import com.fursadhub.verification.application.VerificationEvidenceService;
import com.fursadhub.verification.application.VerificationQueryService;
import com.fursadhub.verification.application.VerificationReviewService;
import com.fursadhub.verification.domain.StudentVerificationStatus;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * University-staff verification queue and review actions (CLAUDE.md section 25/29). Authorization
 * (membership + department scope) is enforced inside each application service, never here.
 */
@RestController
@RequestMapping("/api/v1/universities/{universityId}")
public class UniversityVerificationController {

    private final VerificationQueryService queryService;
    private final VerificationReviewService reviewService;
    private final ConsumeVerificationChallengeService challengeService;
    private final VerificationEvidenceService evidenceService;

    public UniversityVerificationController(
            VerificationQueryService queryService,
            VerificationReviewService reviewService,
            ConsumeVerificationChallengeService challengeService,
            VerificationEvidenceService evidenceService) {
        this.queryService = queryService;
        this.reviewService = reviewService;
        this.challengeService = challengeService;
        this.evidenceService = evidenceService;
    }

    @GetMapping("/students")
    public List<StudentRowResponse> students(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @RequestParam(required = false) UUID departmentId) {
        return queryService.listStudents(currentUserId(jwt), universityId, departmentId).stream()
                .map(StudentRowResponse::from)
                .toList();
    }

    @GetMapping("/verification-cases")
    public List<VerificationCaseResponse> queue(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @RequestParam(required = false) StudentVerificationStatus status) {
        return queryService.queue(currentUserId(jwt), universityId, status).stream()
                .map(VerificationCaseResponse::from)
                .toList();
    }

    @GetMapping("/verification-cases/{caseId}")
    public VerificationCaseResponse detail(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId) {
        return VerificationCaseResponse.from(queryService.caseDetail(currentUserId(jwt), universityId, caseId));
    }

    @PostMapping("/verification-cases/{caseId}/begin-review")
    public MessageResponse beginReview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId, HttpServletRequest httpRequest) {
        reviewService.beginReview(currentUserId(jwt), universityId, caseId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Case moved to under review.");
    }

    @PostMapping("/verification-cases/{caseId}/request-more-evidence")
    public MessageResponse requestMoreEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        reviewService.requestMoreEvidence(currentUserId(jwt), universityId, caseId, request.notes(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("More evidence requested from the student.");
    }

    @PostMapping("/verification-cases/{caseId}/verify")
    public MessageResponse verify(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId, HttpServletRequest httpRequest) {
        reviewService.approve(currentUserId(jwt), universityId, caseId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Student enrollment verified.");
    }

    @PostMapping("/verification-cases/{caseId}/reject")
    public MessageResponse reject(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        reviewService.reject(currentUserId(jwt), universityId, caseId, request.notes(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Verification case rejected.");
    }

    @PostMapping("/verification-cases/{caseId}/revoke")
    public MessageResponse revoke(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        reviewService.revoke(currentUserId(jwt), universityId, caseId, request.notes(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Verification revoked.");
    }

    /**
     * Hands a case this university cannot resolve to the platform (Phase 7).
     *
     * <p>Does not change the case's status — the frozen state machine is untouched. It changes who
     * may act, so a coordinator facing a disputed identity has somewhere to send it. The university
     * keeps its own access throughout.
     */
    @PostMapping("/verification-cases/{caseId}/escalate")
    public MessageResponse escalate(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        reviewService.escalate(currentUserId(jwt), universityId, caseId, request.notes(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Case escalated to FursadHub.");
    }

    /**
     * Streams the student's private verification evidence to a scoped reviewer (Phase 7).
     *
     * <p>Three checks inside the service, all against current data: the case belongs to THIS
     * university, the caller holds a reviewing role here, and a coordinator's departments include
     * this enrollment. Organization users have no route to this document at all
     * (CLAUDE.md sections 31, 60).
     */
    @GetMapping("/verification-cases/{caseId}/evidence/document")
    public ResponseEntity<InputStreamResource> downloadEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId,
            HttpServletRequest httpRequest) {
        VerificationEvidenceService.Document document = evidenceService.openForUniversityReviewer(
                currentUserId(jwt), universityId, caseId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    @PostMapping("/verification-cases/{caseId}/consume-challenge")
    public MessageResponse consumeChallenge(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID caseId,
            @Valid @RequestBody ConsumeChallengeRequest request, HttpServletRequest httpRequest) {
        challengeService.consume(currentUserId(jwt), universityId, caseId, request.code(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Account binding confirmed.");
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
