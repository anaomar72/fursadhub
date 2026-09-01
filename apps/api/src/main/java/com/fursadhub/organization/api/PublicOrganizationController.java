package com.fursadhub.organization.api;

import com.fursadhub.organization.application.OrganizationLogoService;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.domain.Organization;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * An organization's public profile (Phase 8) — no authentication required, the same way
 * {@code PublicOpportunityController} needs none. This is the trust surface the verified badge
 * exists for: a student deciding whether to trust an opportunity, or simply curious about who is
 * hiring, can see the organization's own name, description, logo and verification status without
 * an account.
 *
 * <p>Only public-safe fields are ever returned here — see {@link OrganizationSummaryResponse}'s own
 * rationale, which this extends with the two fields a trust page actually needs: verification
 * status and logo presence. Nothing here reveals membership, registration number, or anything an
 * organization has not already chosen to present publicly.
 */
@RestController
@RequestMapping("/api/v1/public/organizations")
public class PublicOrganizationController {

    private final OrganizationQueryService queryService;
    private final OrganizationLogoService logoService;

    public PublicOrganizationController(OrganizationQueryService queryService, OrganizationLogoService logoService) {
        this.queryService = queryService;
        this.logoService = logoService;
    }

    @GetMapping("/{organizationId}")
    public PublicOrganizationResponse get(@PathVariable UUID organizationId) {
        Organization organization = queryService.getOrThrow(organizationId);
        return PublicOrganizationResponse.from(organization);
    }

    /**
     * The logo bytes. Cacheable and inline (unlike private documents, which are always
     * attachment-disposition) — a logo is meant to render directly in a page, and it carries no
     * sensitive content.
     */
    @GetMapping("/{organizationId}/logo/document")
    public ResponseEntity<InputStreamResource> logo(@PathVariable UUID organizationId) {
        OrganizationLogoService.Document document = logoService.openPublic(organizationId);
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(document.metadata().getOriginalFilename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)))
                .contentType(MediaType.parseMediaType(document.metadata().getContentType()))
                .contentLength(document.metadata().getSizeBytes())
                .body(new InputStreamResource(document.content()));
    }
}
