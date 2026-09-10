package com.fursadhub.organization.api;

import com.fursadhub.common.api.PageResponse;
import com.fursadhub.common.api.PublicPageRequests;
import com.fursadhub.common.api.SortAllowlist;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.organization.application.OrganizationCoverService;
import com.fursadhub.organization.application.OrganizationLogoService;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.application.PublicOrganizationDirectoryService;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationType;
import com.fursadhub.organization.domain.PublicOrganizationFilter;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    /**
     * Only these orderings are reachable. A raw {@code Pageable} would let an anonymous caller sort
     * by {@code registrationNumber} or {@code verificationStatus} and infer private values from the
     * resulting order without either field appearing in the body — see {@link SortAllowlist}.
     *
     * <p>Name-ascending is the default: a directory is browsed, and alphabetical is the ordering a
     * visitor can predict. {@code recentlyVerified} sorts by the moment FursadHub attested to the
     * organization, which is a public fact about a public verdict.
     */
    private static final SortAllowlist SORTS = SortAllowlist.forParameter("sort")
            .allow("name", Sort.by(Sort.Direction.ASC, "name"))
            .allow("nameDesc", Sort.by(Sort.Direction.DESC, "name"))
            .allow("recentlyVerified", Sort.by(Sort.Direction.DESC, "verifiedAt").and(Sort.by(Sort.Direction.ASC, "name")))
            .build();

    private final OrganizationQueryService queryService;
    private final OrganizationLogoService logoService;
    private final OrganizationCoverService coverService;
    private final PublicOrganizationDirectoryService directoryService;

    public PublicOrganizationController(
            OrganizationQueryService queryService, OrganizationLogoService logoService,
            OrganizationCoverService coverService, PublicOrganizationDirectoryService directoryService) {
        this.queryService = queryService;
        this.logoService = logoService;
        this.coverService = coverService;
        this.directoryService = directoryService;
    }

    /**
     * The public organization directory (Backend Phase B1).
     *
     * <p>Lists ONLY {@code VERIFIED} organizations — enforced in the repository query, never by
     * filtering a wider result here or in the browser. A verified organization with no current
     * openings still appears: this directory is "organizations FursadHub has attested to", not
     * "organizations hiring right now".
     *
     * <p>Backend Phase B2 added the {@code industry}, {@code city} and {@code country} filters, each
     * only now that a real column backs it. Size and founded-year filters are still absent: they
     * exist in the data model but are not something a student narrows a search on, and B1's rule
     * still applies — a filter earns its place by being used, not by being storable.
     */
    @GetMapping
    public PageResponse<PublicOrganizationSummaryResponse> list(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) OrganizationType type,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Pageable pageable = PublicPageRequests.of(page, size, SORTS.resolve(sort));
        Page<PublicOrganizationDirectoryService.DirectoryEntry> results = directoryService.search(
                new PublicOrganizationFilter(query, type, industry, city, country), pageable);
        return PageResponse.from(results, PublicOrganizationSummaryResponse::from);
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
        return inlineImage(document.metadata(), document.content());
    }

    /**
     * The public profile banner (Backend Phase B2) — same contract as the logo route above:
     * unauthenticated, inline, cacheable, and 404 when the organization has none.
     */
    @GetMapping("/{organizationId}/cover/document")
    public ResponseEntity<InputStreamResource> cover(@PathVariable UUID organizationId) {
        OrganizationCoverService.Document document = coverService.openPublic(organizationId);
        return inlineImage(document.metadata(), document.content());
    }

    /**
     * Cacheable and inline (unlike private documents, which are always attachment-disposition) — a
     * logo or banner is meant to render directly in a page and carries no sensitive content.
     */
    private ResponseEntity<InputStreamResource> inlineImage(StoredFile metadata, java.io.InputStream content) {
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(metadata.getOriginalFilename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)))
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .contentLength(metadata.getSizeBytes())
                .body(new InputStreamResource(content));
    }
}
