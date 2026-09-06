package com.fursadhub.university.api;

import com.fursadhub.common.api.PageResponse;
import com.fursadhub.common.api.PublicPageRequests;
import com.fursadhub.common.api.SortAllowlist;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.university.application.UniversityCoverService;
import com.fursadhub.university.application.UniversityLogoService;
import com.fursadhub.university.application.UniversityQueryService;
import com.fursadhub.university.domain.PublicUniversityFilter;
import com.fursadhub.university.domain.University;
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
import java.time.Duration;
import java.util.UUID;

/**
 * A university's public profile (Phase 8) — the exact counterpart of
 * {@code PublicOrganizationController}. No authentication required.
 */
@RestController
@RequestMapping("/api/v1/public/universities")
public class PublicUniversityController {

    /**
     * Only these orderings are reachable — see {@link SortAllowlist}. A raw {@code Pageable} would
     * let an anonymous caller sort by {@code registrationNumber} or {@code status} and infer private
     * values from the resulting order without either field appearing in the body.
     */
    private static final SortAllowlist SORTS = SortAllowlist.forParameter("sort")
            .allow("name", Sort.by(Sort.Direction.ASC, "name"))
            .allow("nameDesc", Sort.by(Sort.Direction.DESC, "name"))
            .allow("recentlyVerified", Sort.by(Sort.Direction.DESC, "verifiedAt").and(Sort.by(Sort.Direction.ASC, "name")))
            .build();

    private final UniversityQueryService queryService;
    private final UniversityLogoService logoService;
    private final UniversityCoverService coverService;

    public PublicUniversityController(
            UniversityQueryService queryService, UniversityLogoService logoService,
            UniversityCoverService coverService) {
        this.queryService = queryService;
        this.logoService = logoService;
        this.coverService = coverService;
    }

    /**
     * The public university directory (Backend Phase B1).
     *
     * <p>Lists ONLY {@code VERIFIED} universities — enforced in the repository query, never by
     * filtering a wider result here or in the browser. Backend Phase B2 added the {@code city} and
     * {@code country} filters now that both columns exist; there is deliberately no institution-type
     * facet, because no column backs one.
     */
    @GetMapping
    public PageResponse<PublicUniversitySummaryResponse> list(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Pageable pageable = PublicPageRequests.of(page, size, SORTS.resolve(sort));
        Page<University> results =
                queryService.searchPublicDirectory(new PublicUniversityFilter(query, city, country), pageable);
        return PageResponse.from(results, PublicUniversitySummaryResponse::from);
    }

    @GetMapping("/{universityId}")
    public PublicUniversityResponse get(@PathVariable UUID universityId) {
        University university = queryService.getUniversity(universityId);
        return PublicUniversityResponse.from(university);
    }

    @GetMapping("/{universityId}/logo/document")
    public ResponseEntity<InputStreamResource> logo(@PathVariable UUID universityId) {
        UniversityLogoService.Document document = logoService.openPublic(universityId);
        return inlineImage(document.metadata(), document.content());
    }

    /**
     * The public profile banner (Backend Phase B2) — same contract as the logo route above:
     * unauthenticated, inline, cacheable, and 404 when the university has none.
     */
    @GetMapping("/{universityId}/cover/document")
    public ResponseEntity<InputStreamResource> cover(@PathVariable UUID universityId) {
        UniversityCoverService.Document document = coverService.openPublic(universityId);
        return inlineImage(document.metadata(), document.content());
    }

    private ResponseEntity<InputStreamResource> inlineImage(StoredFile metadata, java.io.InputStream content) {
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(metadata.getOriginalFilename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .contentLength(metadata.getSizeBytes())
                .body(new InputStreamResource(content));
    }
}
