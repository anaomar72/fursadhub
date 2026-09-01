package com.fursadhub.administration.api;

import com.fursadhub.administration.application.AdminUniversityVerificationService;
import com.fursadhub.common.api.PageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.university.application.UniversityVerificationEvidenceService;
import com.fursadhub.university.domain.University;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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

import java.util.UUID;

/**
 * Platform review of university verification (CLAUDE.md section 31), the counterpart of
 * {@link AdminOrganizationController}.
 *
 * <p>Every transition is an explicit command endpoint, never a status PATCH (CLAUDE.md section 10):
 * verifying a university is a business decision with consequences — it is what allows organizations
 * to target it with opportunities — not a field edit. The frozen state machine lives on the
 * {@code University} entity and rejects anything invalid regardless of what is called here.
 */
@RestController
@RequestMapping("/api/v1/admin/universities")
public class AdminUniversityController {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminUniversityVerificationService verificationService;
    private final UniversityVerificationEvidenceService evidenceService;

    public AdminUniversityController(
            AdminUniversityVerificationService verificationService,
            UniversityVerificationEvidenceService evidenceService) {
        this.verificationService = verificationService;
        this.evidenceService = evidenceService;
    }

    @GetMapping
    public PageResponse<UniversityVerificationResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) InstitutionVerificationStatus status,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 25) Pageable pageable) {
        Page<University> page = verificationService.list(currentUserId(jwt), status, query, capPageSize(pageable));
        return PageResponse.from(page, UniversityVerificationResponse::from);
    }

    @GetMapping("/{universityId}")
    public UniversityVerificationResponse get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId) {
        return UniversityVerificationResponse.from(verificationService.get(currentUserId(jwt), universityId));
    }

    /**
     * The registration document, streamed to a platform reviewer.
     *
     * <p>Authorization is the evidence service's own {@code requireReviewer} check — the same one the
     * student-evidence route uses — rather than anything this controller decides.
     */
    @GetMapping("/{universityId}/verification/evidence/document")
    public ResponseEntity<InputStreamResource> downloadEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, HttpServletRequest httpRequest) {
        UniversityVerificationEvidenceService.Document document = evidenceService.openForPlatformReviewer(
                currentUserId(jwt), universityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    @PostMapping("/{universityId}/begin-review")
    public UniversityVerificationResponse beginReview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, HttpServletRequest httpRequest) {
        return UniversityVerificationResponse.from(verificationService.beginReview(
                currentUserId(jwt), universityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{universityId}/request-changes")
    public UniversityVerificationResponse requestChanges(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return UniversityVerificationResponse.from(verificationService.requestChanges(
                currentUserId(jwt), universityId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{universityId}/verify")
    public UniversityVerificationResponse verify(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, HttpServletRequest httpRequest) {
        return UniversityVerificationResponse.from(verificationService.verify(
                currentUserId(jwt), universityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{universityId}/reject")
    public UniversityVerificationResponse reject(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return UniversityVerificationResponse.from(verificationService.reject(
                currentUserId(jwt), universityId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{universityId}/suspend")
    public UniversityVerificationResponse suspend(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return UniversityVerificationResponse.from(verificationService.suspend(
                currentUserId(jwt), universityId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{universityId}/revoke")
    public UniversityVerificationResponse revoke(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return UniversityVerificationResponse.from(verificationService.revoke(
                currentUserId(jwt), universityId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private Pageable capPageSize(Pageable pageable) {
        int size = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
        Sort sort = pageable.getSortOr(Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageRequest.of(pageable.getPageNumber(), size, sort);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
