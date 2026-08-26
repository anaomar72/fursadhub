package com.fursadhub.verification.api;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.verification.application.IssueVerificationChallengeService;
import com.fursadhub.verification.application.SubmitStudentVerificationService;
import com.fursadhub.verification.application.VerificationEvidenceService;
import com.fursadhub.verification.application.VerificationQueryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/** Self-service only — always acts on the authenticated caller's own enrollment (CLAUDE.md section 12). */
@RestController
public class StudentVerificationController {

    private final SubmitStudentVerificationService submitService;
    private final IssueVerificationChallengeService challengeService;
    private final VerificationQueryService queryService;
    private final VerificationEvidenceService evidenceService;

    public StudentVerificationController(
            SubmitStudentVerificationService submitService,
            IssueVerificationChallengeService challengeService,
            VerificationQueryService queryService,
            VerificationEvidenceService evidenceService) {
        this.submitService = submitService;
        this.challengeService = challengeService;
        this.queryService = queryService;
        this.evidenceService = evidenceService;
    }

    @GetMapping("/api/v1/students/me/verification")
    public VerificationCaseResponse myCase(@AuthenticationPrincipal Jwt jwt) {
        var verificationCase = queryService.myCase(currentUserId(jwt))
                .orElseThrow(() -> new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND, "No verification case in progress."));
        return VerificationCaseResponse.from(verificationCase);
    }

    @PostMapping("/api/v1/students/me/enrollment/submit-verification")
    public VerificationCaseResponse submit(@AuthenticationPrincipal Jwt jwt, HttpServletRequest httpRequest) {
        var verificationCase = submitService.submit(
                currentUserId(jwt), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return VerificationCaseResponse.from(verificationCase);
    }

    @PostMapping("/api/v1/students/me/verification/challenges")
    public ChallengeResponse issueChallenge(@AuthenticationPrincipal Jwt jwt, HttpServletRequest httpRequest) {
        var issued = challengeService.issue(
                currentUserId(jwt), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ChallengeResponse.from(issued);
    }

    /**
     * Uploads or replaces the evidence supporting the caller's own enrollment claim (Phase 7).
     *
     * <p>PDF or a photo of a student card. The document is private, gets a random storage key, and is
     * never given a URL — reviewers reach it only through their own authorized route
     * (CLAUDE.md section 31).
     */
    @PostMapping("/api/v1/students/me/verification/evidence")
    public VerificationEvidenceResponse uploadEvidence(
            @AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) {
        evidenceService.upload(currentUserId(jwt), file);
        return new VerificationEvidenceResponse(true);
    }

    @GetMapping("/api/v1/students/me/verification/evidence/document")
    public ResponseEntity<InputStreamResource> downloadOwnEvidence(
            @AuthenticationPrincipal Jwt jwt, HttpServletRequest httpRequest) {
        VerificationEvidenceService.Document document = evidenceService.openOwn(
                currentUserId(jwt), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
