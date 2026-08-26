package com.fursadhub.administration.api;

import com.fursadhub.administration.application.AdminAuditQueryService;
import com.fursadhub.common.api.PageResponse;
import com.fursadhub.common.audit.AuditEvent;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.compliance.api.LegalDocumentResponse;
import com.fursadhub.compliance.api.PrivacyRequestResponse;
import com.fursadhub.compliance.api.ResolutionNoteRequest;
import com.fursadhub.compliance.application.LegalDocumentService;
import com.fursadhub.compliance.application.PrivacyRequestService;
import com.fursadhub.compliance.domain.PrivacyRequest;
import com.fursadhub.compliance.domain.PrivacyRequestState;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * The compliance half of the admin console: privacy requests, legal documents, and audit viewing
 * (CLAUDE.md sections 49-51).
 *
 * <p>All SUPER_ADMIN. Note what is NOT here: there is no way to edit or delete an audit event, and no
 * way to edit or unpublish a legal document. Both are append-only for the same reason — a record an
 * administrator can revise is not a record.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminComplianceController {

    private static final int MAX_PAGE_SIZE = 100;

    private final PrivacyRequestService privacyRequestService;
    private final LegalDocumentService legalDocumentService;
    private final AdminAuditQueryService auditQueryService;

    public AdminComplianceController(
            PrivacyRequestService privacyRequestService,
            LegalDocumentService legalDocumentService,
            AdminAuditQueryService auditQueryService) {
        this.privacyRequestService = privacyRequestService;
        this.legalDocumentService = legalDocumentService;
        this.auditQueryService = auditQueryService;
    }

    // ---------------------------------------------------------------- privacy requests

    @GetMapping("/privacy-requests")
    public PageResponse<PrivacyRequestResponse> privacyRequests(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) PrivacyRequestState state,
            @PageableDefault(size = 25) Pageable pageable) {
        Page<PrivacyRequest> page = privacyRequestService.queue(currentUserId(jwt), state, capPageSize(pageable));
        return PageResponse.from(page, PrivacyRequestResponse::from);
    }

    @GetMapping("/privacy-requests/{requestId}")
    public PrivacyRequestResponse privacyRequest(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId) {
        return PrivacyRequestResponse.from(privacyRequestService.get(currentUserId(jwt), requestId));
    }

    @PostMapping("/privacy-requests/{requestId}/begin-review")
    public PrivacyRequestResponse beginReview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId, HttpServletRequest httpRequest) {
        return PrivacyRequestResponse.from(privacyRequestService.beginReview(
                currentUserId(jwt), requestId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** Records that the work was done. Nothing is deleted or exported automatically — see the service. */
    @PostMapping("/privacy-requests/{requestId}/complete")
    public PrivacyRequestResponse complete(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId,
            @Valid @RequestBody ResolutionNoteRequest request, HttpServletRequest httpRequest) {
        return PrivacyRequestResponse.from(privacyRequestService.complete(
                currentUserId(jwt), requestId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/privacy-requests/{requestId}/reject")
    public PrivacyRequestResponse reject(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId,
            @Valid @RequestBody ResolutionNoteRequest request, HttpServletRequest httpRequest) {
        return PrivacyRequestResponse.from(privacyRequestService.reject(
                currentUserId(jwt), requestId, request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    // ---------------------------------------------------------------- legal documents

    @GetMapping("/legal-documents")
    public List<LegalDocumentResponse> legalDocuments(@AuthenticationPrincipal Jwt jwt) {
        return legalDocumentService.listAll(currentUserId(jwt)).stream()
                .map(LegalDocumentResponse::summary)
                .toList();
    }

    /** Publishes a NEW version. There is deliberately no edit or delete counterpart. */
    @PostMapping("/legal-documents")
    public LegalDocumentResponse publishLegalDocument(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PublishLegalDocumentRequest request,
            HttpServletRequest httpRequest) {
        return LegalDocumentResponse.from(legalDocumentService.publish(
                currentUserId(jwt), request.documentType(), request.version(), request.locale(),
                request.title(), request.body(), request.effectiveFrom(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    // ---------------------------------------------------------------- audit

    @GetMapping("/audit-events")
    public PageResponse<AuditEventResponse> auditEvents(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 50) Pageable pageable) {
        Page<AuditEvent> page = auditQueryService.search(
                currentUserId(jwt), eventType, userId, from, to, capPageSize(pageable));
        return PageResponse.from(page, AuditEventResponse::from);
    }

    @GetMapping("/audit-events/types")
    public List<String> auditEventTypes(@AuthenticationPrincipal Jwt jwt) {
        return auditQueryService.eventTypes(currentUserId(jwt));
    }

    /** Sorting is fixed inside each query, so only the page size needs capping. */
    private Pageable capPageSize(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), MAX_PAGE_SIZE));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
