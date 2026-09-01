package com.fursadhub.organization.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.organization.application.CreateOrganizationService;
import com.fursadhub.organization.application.OrganizationLogoService;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.application.OrganizationVerificationEvidenceService;
import com.fursadhub.organization.application.UpdateOrganizationService;
import com.fursadhub.organization.domain.Organization;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/** Self-service organization registration and management (CLAUDE.md section 26). */
@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private final CreateOrganizationService createService;
    private final UpdateOrganizationService updateService;
    private final OrganizationQueryService queryService;
    private final OrganizationVerificationEvidenceService evidenceService;
    private final OrganizationLogoService logoService;

    public OrganizationController(
            CreateOrganizationService createService, UpdateOrganizationService updateService,
            OrganizationQueryService queryService, OrganizationVerificationEvidenceService evidenceService,
            OrganizationLogoService logoService) {
        this.createService = createService;
        this.updateService = updateService;
        this.queryService = queryService;
        this.evidenceService = evidenceService;
        this.logoService = logoService;
    }

    @PostMapping
    public ResponseEntity<OrganizationResponse> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateOrganizationRequest request, HttpServletRequest httpRequest) {
        Organization organization = createService.create(
                currentUserId(jwt), request.name(), request.type(), request.registrationNumber(), request.website(),
                request.description(), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(OrganizationResponse.from(organization));
    }

    @GetMapping("/{organizationId}")
    public OrganizationResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return OrganizationResponse.from(queryService.getForMember(currentUserId(jwt), organizationId));
    }

    @PatchMapping("/{organizationId}")
    public OrganizationResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody UpdateOrganizationRequest request, HttpServletRequest httpRequest) {
        Organization organization = updateService.update(
                currentUserId(jwt), organizationId, request.name(), request.registrationNumber(), request.website(),
                request.description(), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return OrganizationResponse.from(organization);
    }

    @PostMapping("/{organizationId}/verification/submit")
    public OrganizationResponse submitForVerification(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, HttpServletRequest httpRequest) {
        Organization organization = updateService.submitForVerification(
                currentUserId(jwt), organizationId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return OrganizationResponse.from(organization);
    }

    /**
     * Uploads or replaces the registration license a platform reviewer will read (Phase 7.5).
     *
     * <p>PDF only. The document is private, gets a random storage key, and is never given a URL —
     * reviewers reach it through their own authorized route (CLAUDE.md sections 31, 47).
     */
    @PostMapping("/{organizationId}/verification/evidence")
    public OrganizationEvidenceResponse uploadEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @RequestParam("file") MultipartFile file, HttpServletRequest httpRequest) {
        evidenceService.upload(currentUserId(jwt), organizationId, file,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new OrganizationEvidenceResponse(true);
    }

    @GetMapping("/{organizationId}/verification/evidence/document")
    public ResponseEntity<InputStreamResource> downloadOwnEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, HttpServletRequest httpRequest) {
        OrganizationVerificationEvidenceService.Document document = evidenceService.openOwn(
                currentUserId(jwt), organizationId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    /**
     * Uploads or replaces the organization's public logo (Phase 8). Unlike the license above, this
     * is brand identity, not evidence — it is fetched back through the public, unauthenticated
     * {@code /api/v1/public/organizations/{id}/logo/document} route, not this one.
     */
    @PostMapping("/{organizationId}/logo")
    public OrganizationLogoResponse uploadLogo(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, @RequestParam("file") MultipartFile file) {
        logoService.upload(currentUserId(jwt), organizationId, file);
        return new OrganizationLogoResponse(true);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
