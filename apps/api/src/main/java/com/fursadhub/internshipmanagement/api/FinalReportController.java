package com.fursadhub.internshipmanagement.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.internshipmanagement.application.FinalReportService;
import com.fursadhub.internshipmanagement.domain.FinalReport;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * The student's final internship report (CLAUDE.md sections 45/47).
 *
 * <p><strong>The document is never a URL.</strong> There is no route that returns a storage link,
 * and no pre-signed URL is ever issued. {@link #download} streams the bytes through the API after
 * re-authorizing the caller against this specific placement, and every such read is audited. That is
 * why the download lives here, under the placement, rather than at a generic {@code /files/{id}}
 * route — the placement is the only thing that knows who may read this document.
 */
@RestController
@RequestMapping("/api/v1/placements/{placementId}/final-report")
public class FinalReportController {

    private final FinalReportService finalReportService;

    public FinalReportController(FinalReportService finalReportService) {
        this.finalReportService = finalReportService;
    }

    // ---------------------------------------------------------------- read

    /** Lifecycle plus document metadata. Never a link, a key or a path. */
    @GetMapping
    public ResponseEntity<FinalReportResponse> get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        UUID userId = currentUserId(jwt);
        return finalReportService.find(userId, placementId)
                .map(report -> ResponseEntity.ok(toResponse(userId, placementId, report)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Streams the private document to an authorized caller.
     *
     * <p>Response headers come from {@code PrivateDocumentResponses}, shared with Phase 7's other
     * private-document routes so every one of them is built the same safe way.
     */
    @GetMapping("/document")
    public ResponseEntity<InputStreamResource> download(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId, HttpServletRequest httpRequest) {
        FinalReportService.Document document = finalReportService.openDocument(
                currentUserId(jwt), placementId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));

        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    // ---------------------------------------------------------------- student commands

    /**
     * Uploads or replaces the report PDF. Owning student only, and only while the report is theirs to
     * change (DRAFT or NEEDS_REVISION).
     */
    @PostMapping("/document")
    public FinalReportResponse upload(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @RequestParam("file") MultipartFile file, HttpServletRequest httpRequest) {
        UUID userId = currentUserId(jwt);
        FinalReport report = finalReportService.uploadDocument(
                userId, placementId, file,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return toResponse(userId, placementId, report);
    }

    /** DRAFT or NEEDS_REVISION to SUBMITTED. Idempotent. */
    @PostMapping("/submit")
    public FinalReportResponse submit(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId, HttpServletRequest httpRequest) {
        UUID userId = currentUserId(jwt);
        FinalReport report = finalReportService.submit(
                userId, placementId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return toResponse(userId, placementId, report);
    }

    // ---------------------------------------------------------------- university commands

    /** SUBMITTED to NEEDS_REVISION. University staff in scope only; the comment is required. */
    @PostMapping("/request-revision")
    public FinalReportResponse requestRevision(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody(required = false) ReviewCommentRequest request, HttpServletRequest httpRequest) {
        UUID userId = currentUserId(jwt);
        FinalReport report = finalReportService.requestRevision(
                userId, placementId, ReviewCommentRequest.commentOf(request),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return toResponse(userId, placementId, report);
    }

    /** SUBMITTED to APPROVED. Terminal, and the state the completion requirement checks for. */
    @PostMapping("/approve")
    public FinalReportResponse approve(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody(required = false) ReviewCommentRequest request, HttpServletRequest httpRequest) {
        UUID userId = currentUserId(jwt);
        FinalReport report = finalReportService.approve(
                userId, placementId, ReviewCommentRequest.commentOf(request),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return toResponse(userId, placementId, report);
    }

    // ---------------------------------------------------------------- helpers

    private FinalReportResponse toResponse(UUID userId, UUID placementId, FinalReport report) {
        StoredFile document = finalReportService.findDocumentMetadata(userId, placementId).orElse(null);
        return FinalReportResponse.from(report, document);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
