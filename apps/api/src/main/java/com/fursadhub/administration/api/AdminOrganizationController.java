package com.fursadhub.administration.api;

import com.fursadhub.administration.application.AdminInstitutionVerificationService;
import com.fursadhub.common.api.PageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.organization.application.OrganizationVerificationEvidenceService;
import com.fursadhub.organization.domain.Organization;
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
 * Platform review of organization verification (CLAUDE.md section 31).
 *
 * <p>Every transition is an explicit command endpoint, never a status PATCH (CLAUDE.md section 10):
 * verifying an organization is a business decision with consequences — it is what lets them publish
 * opportunities — not a field edit. The frozen state machine lives on the {@code Organization} entity
 * and rejects anything invalid regardless of what is called here.
 */
@RestController
@RequestMapping("/api/v1/admin/organizations")
public class AdminOrganizationController {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminInstitutionVerificationService verificationService;
    private final OrganizationVerificationEvidenceService evidenceService;

    public AdminOrganizationController(
            AdminInstitutionVerificationService verificationService,
            OrganizationVerificationEvidenceService evidenceService) {
        this.verificationService = verificationService;
        this.evidenceService = evidenceService;
    }

    @GetMapping
    public PageResponse<OrganizationVerificationResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) InstitutionVerificationStatus status,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 25) Pageable pageable) {
        Page<Organization> page = verificationService.list(currentUserId(jwt), status, query, capPageSize(pageable));
        return PageResponse.from(page, OrganizationVerificationResponse::from);
    }

    @GetMapping("/{organizationId}")
    public OrganizationVerificationResponse get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return OrganizationVerificationResponse.from(verificationService.get(currentUserId(jwt), organizationId));
    }

    /**
     * The organization's registration license — the document the whole review is about. Audited like
     * every other private read (CLAUDE.md sections 47, 51).
     */
    @GetMapping("/{organizationId}/verification/evidence/document")
    public ResponseEntity<InputStreamResource> downloadEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, HttpServletRequest httpRequest) {
        OrganizationVerificationEvidenceService.Document document = evidenceService.openForPlatformReviewer(
                currentUserId(jwt), organizationId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    @PostMapping("/{organizationId}/begin-review")
    public OrganizationVerificationResponse beginReview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, HttpServletRequest httpRequest) {
        return OrganizationVerificationResponse.from(verificationService.beginReview(
                currentUserId(jwt), organizationId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{organizationId}/request-changes")
    public OrganizationVerificationResponse requestChanges(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return OrganizationVerificationResponse.from(verificationService.requestChanges(
                currentUserId(jwt), organizationId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{organizationId}/verify")
    public OrganizationVerificationResponse verify(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, HttpServletRequest httpRequest) {
        return OrganizationVerificationResponse.from(verificationService.verify(
                currentUserId(jwt), organizationId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{organizationId}/reject")
    public OrganizationVerificationResponse reject(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return OrganizationVerificationResponse.from(verificationService.reject(
                currentUserId(jwt), organizationId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{organizationId}/suspend")
    public OrganizationVerificationResponse suspend(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return OrganizationVerificationResponse.from(verificationService.suspend(
                currentUserId(jwt), organizationId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/{organizationId}/revoke")
    public OrganizationVerificationResponse revoke(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody ReviewNoteRequest request, HttpServletRequest httpRequest) {
        return OrganizationVerificationResponse.from(verificationService.revoke(
                currentUserId(jwt), organizationId, request.note(),
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
