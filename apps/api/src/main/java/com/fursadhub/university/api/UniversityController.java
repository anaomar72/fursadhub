package com.fursadhub.university.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.university.application.CreateDepartmentService;
import com.fursadhub.university.application.CreateUniversityService;
import com.fursadhub.university.application.UniversityLogoService;
import com.fursadhub.university.application.UniversityQueryService;
import com.fursadhub.university.application.UniversityVerificationEvidenceService;
import com.fursadhub.university.application.UpdateDepartmentService;
import com.fursadhub.university.application.UpdateUniversityService;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.university.domain.Department;
import com.fursadhub.university.domain.University;
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

import java.util.List;
import java.util.UUID;

/**
 * The university/department directory plus self-service university registration and verification
 * (CLAUDE.md sections 25, 31).
 *
 * <p>The directory reads stay as they were — the student enrollment claim form depends on them.
 * Every route on this controller requires a valid JWT, which is the default for everything outside
 * {@code /api/v1/auth/**} and {@code /api/v1/public/**} in {@code SecurityConfig}; nothing about the
 * new write routes changes that, in either direction.
 *
 * <p>Verification transitions are explicit command endpoints, never a status PATCH (CLAUDE.md
 * section 10). Registration is JSON and evidence upload is multipart, so they are two calls; the
 * frontend presents them as one wizard.
 */
@RestController
@RequestMapping("/api/v1/universities")
public class UniversityController {

    private final UniversityQueryService queryService;
    private final CreateUniversityService createService;
    private final UpdateUniversityService updateService;
    private final UniversityVerificationEvidenceService evidenceService;
    private final CreateDepartmentService createDepartmentService;
    private final UpdateDepartmentService updateDepartmentService;
    private final UniversityLogoService logoService;

    public UniversityController(
            UniversityQueryService queryService,
            CreateUniversityService createService,
            UpdateUniversityService updateService,
            UniversityVerificationEvidenceService evidenceService,
            CreateDepartmentService createDepartmentService,
            UpdateDepartmentService updateDepartmentService,
            UniversityLogoService logoService) {
        this.queryService = queryService;
        this.createService = createService;
        this.updateService = updateService;
        this.evidenceService = evidenceService;
        this.createDepartmentService = createDepartmentService;
        this.updateDepartmentService = updateDepartmentService;
        this.logoService = logoService;
    }

    // ---------------------------------------------------------------- directory

    @GetMapping
    public List<UniversityResponse> list() {
        return queryService.listUniversities().stream().map(UniversityResponse::from).toList();
    }

    /** Management detail for the university's own staff — see {@link UniversityQueryService#getForMember}. */
    @GetMapping("/{universityId}")
    public UniversityDetailResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId) {
        return UniversityDetailResponse.from(queryService.getForMember(currentUserId(jwt), universityId));
    }

    @GetMapping("/{universityId}/departments")
    public List<DepartmentResponse> departments(@PathVariable UUID universityId) {
        return queryService.listDepartments(universityId).stream().map(DepartmentResponse::from).toList();
    }

    /** {@code UNIVERSITY_ADMIN} only — see {@link CreateDepartmentService}. */
    @PostMapping("/{universityId}/departments")
    public ResponseEntity<DepartmentResponse> createDepartment(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody CreateDepartmentRequest request, HttpServletRequest httpRequest) {
        Department department = createDepartmentService.create(
                currentUserId(jwt), universityId, request.name(), request.code(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(DepartmentResponse.from(department));
    }

    /** {@code UNIVERSITY_ADMIN} or the department's own {@code DEPARTMENT_COORDINATOR} — see {@link UpdateDepartmentService}. */
    @PatchMapping("/{universityId}/departments/{departmentId}")
    public DepartmentResponse updateDepartment(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID departmentId,
            @Valid @RequestBody UpdateDepartmentRequest request, HttpServletRequest httpRequest) {
        Department department = updateDepartmentService.update(
                currentUserId(jwt), universityId, departmentId, request.name(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return DepartmentResponse.from(department);
    }

    // ---------------------------------------------------------------- self-service registration

    /**
     * Registers a university with the caller as its founding {@code UNIVERSITY_ADMIN}.
     *
     * <p>The caller is taken from the authenticated principal, never from the body (CLAUDE.md
     * section 12).
     */
    @PostMapping
    public ResponseEntity<UniversityDetailResponse> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateUniversityRequest request,
            HttpServletRequest httpRequest) {
        University university = createService.create(
                currentUserId(jwt), request.name(), request.city(), request.registrationNumber(),
                request.website(), request.description(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(UniversityDetailResponse.from(university));
    }

    @PatchMapping("/{universityId}")
    public UniversityDetailResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody UpdateUniversityRequest request, HttpServletRequest httpRequest) {
        University university = updateService.update(
                currentUserId(jwt), universityId, request.name(), request.city(), request.registrationNumber(),
                request.website(), request.description(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return UniversityDetailResponse.from(university);
    }

    @PostMapping("/{universityId}/verification/submit")
    public UniversityDetailResponse submitForVerification(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, HttpServletRequest httpRequest) {
        University university = updateService.submitForVerification(
                currentUserId(jwt), universityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return UniversityDetailResponse.from(university);
    }

    // ---------------------------------------------------------------- verification evidence

    /**
     * Uploads or replaces the university's registration/accreditation document. PDF only; it is
     * private, gets a random storage key, and is never given a URL (CLAUDE.md sections 47-48).
     */
    @PostMapping("/{universityId}/verification/evidence")
    public UniversityEvidenceResponse uploadEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @RequestParam("file") MultipartFile file, HttpServletRequest httpRequest) {
        evidenceService.upload(currentUserId(jwt), universityId, file,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new UniversityEvidenceResponse(true);
    }

    @GetMapping("/{universityId}/verification/evidence/document")
    public ResponseEntity<InputStreamResource> downloadEvidence(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, HttpServletRequest httpRequest) {
        UniversityVerificationEvidenceService.Document document = evidenceService.openOwn(
                currentUserId(jwt), universityId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    /**
     * Uploads or replaces the university's public logo (Phase 8). Fetched back through the public,
     * unauthenticated {@code /api/v1/public/universities/{id}/logo/document} route, not this one.
     */
    @PostMapping("/{universityId}/logo")
    public UniversityLogoResponse uploadLogo(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @RequestParam("file") MultipartFile file) {
        logoService.upload(currentUserId(jwt), universityId, file);
        return new UniversityLogoResponse(true);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
