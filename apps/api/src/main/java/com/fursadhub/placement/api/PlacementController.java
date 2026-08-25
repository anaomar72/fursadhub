package com.fursadhub.placement.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.placement.application.PlacementLifecycleService;
import com.fursadhub.placement.application.PlacementQueryService;
import com.fursadhub.placement.application.PlacementSupervisorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * One placement: its detail, its lifecycle, and its supervisors (CLAUDE.md sections 39-40).
 *
 * <p>Every transition is an explicit named command — {@code /start}, {@code /cancel},
 * {@code /terminate}, {@code /request-completion} — never a status field the client may set
 * (CLAUDE.md section 10/33). There is deliberately no {@code PATCH} on this resource and no
 * {@code /complete}: completion is gated on the Phase 6 requirement checks, so shipping that
 * endpoint now would let callers bypass rules that do not exist yet.
 *
 * <p>The placement id in the path is never trusted on its own. Read access resolves the caller's
 * actual relationship to the placement, and each command re-checks the specific authority it needs,
 * so changing a UUID in the URL cannot reach another organization's, university's, department's or
 * student's placement (CLAUDE.md section 24).
 */
@RestController
@RequestMapping("/api/v1/placements/{placementId}")
public class PlacementController {

    private final PlacementQueryService queryService;
    private final PlacementLifecycleService lifecycleService;
    private final PlacementSupervisorService supervisorService;

    public PlacementController(
            PlacementQueryService queryService, PlacementLifecycleService lifecycleService,
            PlacementSupervisorService supervisorService) {
        this.queryService = queryService;
        this.lifecycleService = lifecycleService;
        this.supervisorService = supervisorService;
    }

    // ---------------------------------------------------------------- read

    /** Detail for whichever party the caller actually is — student, university or organization staff. */
    @GetMapping
    public PlacementResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return PlacementResponse.from(queryService.getForActor(currentUserId(jwt), placementId));
    }

    /**
     * The full supervisor history, oldest first, closed assignments included — the point of modelling
     * supervision as an append-only history rather than a pair of overwritable columns.
     */
    @GetMapping("/supervisors")
    public List<SupervisorAssignmentResponse> supervisorHistory(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return supervisorService.history(currentUserId(jwt), placementId).stream()
                .map(queryService::toSupervisorView)
                .map(SupervisorAssignmentResponse::from)
                .toList();
    }

    // ---------------------------------------------------------------- lifecycle

    /** PLANNED to ACTIVE. Idempotent: repeating it on an ACTIVE placement returns it unchanged. */
    @PostMapping("/start")
    public PlacementResponse start(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId, HttpServletRequest httpRequest) {
        lifecycleService.start(currentUserId(jwt), placementId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return reload(jwt, placementId);
    }

    /**
     * PLANNED to CANCELLED — the placement never properly started. A placement that has already
     * begun must be terminated instead; the domain rejects the wrong one of the pair.
     */
    @PostMapping("/cancel")
    public PlacementResponse cancel(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody(required = false) PlacementReasonRequest request, HttpServletRequest httpRequest) {
        lifecycleService.cancel(currentUserId(jwt), placementId, PlacementReasonRequest.reasonOf(request),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return reload(jwt, placementId);
    }

    /** ACTIVE or COMPLETION_PENDING to TERMINATED — the internship started, then ended early. */
    @PostMapping("/terminate")
    public PlacementResponse terminate(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody(required = false) PlacementReasonRequest request, HttpServletRequest httpRequest) {
        lifecycleService.terminate(currentUserId(jwt), placementId, PlacementReasonRequest.reasonOf(request),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return reload(jwt, placementId);
    }

    /**
     * ACTIVE to COMPLETION_PENDING. Phase 5 records the request only — whether the weekly logs,
     * attendance, evaluation, final report and defense requirements are met is Phase 6 work, and the
     * COMPLETED transition they gate is intentionally not reachable over HTTP yet.
     */
    @PostMapping("/request-completion")
    public PlacementResponse requestCompletion(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId, HttpServletRequest httpRequest) {
        lifecycleService.requestCompletion(currentUserId(jwt), placementId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return reload(jwt, placementId);
    }

    // ---------------------------------------------------------------- supervisors

    /**
     * Assigns or reassigns the university supervisor. Reassignment closes the current assignment and
     * opens a new one in the same transaction; nothing is overwritten (CLAUDE.md section 40).
     */
    @PostMapping("/university-supervisor")
    public PlacementResponse assignUniversitySupervisor(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody AssignSupervisorRequest request, HttpServletRequest httpRequest) {
        supervisorService.assignUniversitySupervisor(
                currentUserId(jwt), placementId, request.supervisorUserId(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return reload(jwt, placementId);
    }

    /** Assigns or reassigns the organization supervisor. Same append-only history semantics. */
    @PostMapping("/organization-supervisor")
    public PlacementResponse assignOrganizationSupervisor(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody AssignSupervisorRequest request, HttpServletRequest httpRequest) {
        supervisorService.assignOrganizationSupervisor(
                currentUserId(jwt), placementId, request.supervisorUserId(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return reload(jwt, placementId);
    }

    /** University supervisors the caller may pick for this placement. Convenience, not a boundary. */
    @GetMapping("/eligible-university-supervisors")
    public List<EligibleSupervisorResponse> eligibleUniversitySupervisors(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return queryService.listEligibleUniversitySupervisors(currentUserId(jwt), placementId).stream()
                .map(EligibleSupervisorResponse::from)
                .toList();
    }

    /** Organization supervisors the caller may pick for this placement. */
    @GetMapping("/eligible-organization-supervisors")
    public List<EligibleSupervisorResponse> eligibleOrganizationSupervisors(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return queryService.listEligibleOrganizationSupervisors(currentUserId(jwt), placementId).stream()
                .map(EligibleSupervisorResponse::from)
                .toList();
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Re-reads the placement through the normal read path after a command, so the response carries
     * the refreshed supervisors and resolved context rather than a half-populated view of the row
     * the command happened to hold.
     */
    private PlacementResponse reload(Jwt jwt, UUID placementId) {
        return PlacementResponse.from(queryService.getForActor(currentUserId(jwt), placementId));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
