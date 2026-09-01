package com.fursadhub.university.api;

import com.fursadhub.university.application.UniversityLogoService;
import com.fursadhub.university.application.UniversityQueryService;
import com.fursadhub.university.domain.University;
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
import java.time.Duration;
import java.util.UUID;

/**
 * A university's public profile (Phase 8) — the exact counterpart of
 * {@code PublicOrganizationController}. No authentication required.
 */
@RestController
@RequestMapping("/api/v1/public/universities")
public class PublicUniversityController {

    private final UniversityQueryService queryService;
    private final UniversityLogoService logoService;

    public PublicUniversityController(UniversityQueryService queryService, UniversityLogoService logoService) {
        this.queryService = queryService;
        this.logoService = logoService;
    }

    @GetMapping("/{universityId}")
    public PublicUniversityResponse get(@PathVariable UUID universityId) {
        University university = queryService.getUniversity(universityId);
        return PublicUniversityResponse.from(university);
    }

    @GetMapping("/{universityId}/logo/document")
    public ResponseEntity<InputStreamResource> logo(@PathVariable UUID universityId) {
        UniversityLogoService.Document document = logoService.openPublic(universityId);
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(document.metadata().getOriginalFilename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)))
                .contentType(MediaType.parseMediaType(document.metadata().getContentType()))
                .contentLength(document.metadata().getSizeBytes())
                .body(new InputStreamResource(document.content()));
    }
}
