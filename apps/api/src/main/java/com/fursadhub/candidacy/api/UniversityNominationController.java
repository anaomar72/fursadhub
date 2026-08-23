package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.NominationQueryService;
import com.fursadhub.candidacy.application.NominationService;
import com.fursadhub.common.web.RequestMetadata;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
 * University-side nomination management (CLAUDE.md Phase 4 section 4/26).
 *
 * <p>The university id is in the path, mirroring the Phase 2 university endpoints, but it is never
 * trusted on its own: every call re-verifies an active membership at that university AND department
 * scope over the specific student involved.
 */
@RestController
@RequestMapping("/api/v1/universities/{universityId}")
public class UniversityNominationController {

    private final NominationService nominationService;
    private final NominationQueryService nominationQueryService;

    public UniversityNominationController(
            NominationService nominationService, NominationQueryService nominationQueryService) {
        this.nominationService = nominationService;
        this.nominationQueryService = nominationQueryService;
    }

    /** Published opportunities targeting this university, awaiting nominations. */
    @GetMapping("/opportunity-requests")
    public List<TargetRequestResponse> listTargetRequests(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId) {
        return nominationQueryService.listTargetRequests(currentUserId(jwt), universityId).stream()
                .map(TargetRequestResponse::from)
                .toList();
    }

    /** Students the caller may legitimately nominate for one target, within their own scope. */
    @GetMapping("/opportunity-requests/{targetId}/eligible-students")
    public List<EligibleStudentResponse> listEligibleStudents(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID targetId) {
        return nominationQueryService.listEligibleStudents(currentUserId(jwt), universityId, targetId).stream()
                .map(EligibleStudentResponse::from)
                .toList();
    }

    @GetMapping("/nominations")
    public List<NominationResponse> listNominations(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId) {
        return nominationQueryService.listForUniversity(currentUserId(jwt), universityId).stream()
                .map(NominationResponse::from)
                .toList();
    }

    @PostMapping("/nominations")
    public ResponseEntity<NominationResponse> nominate(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId,
            @Valid @RequestBody CreateNominationRequest request, HttpServletRequest httpRequest) {
        var nomination = nominationService.nominate(
                currentUserId(jwt), universityId, request.opportunityId(), request.studentUserId(), request.note(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(NominationResponse.from(nomination));
    }

    @PostMapping("/nominations/{nominationId}/withdraw")
    public NominationResponse withdraw(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId, @PathVariable UUID nominationId,
            HttpServletRequest httpRequest) {
        return NominationResponse.from(nominationService.withdraw(
                currentUserId(jwt), universityId, nominationId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
