package com.fursadhub.internshipmanagement.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.internshipmanagement.application.DefenseService;
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
 * Defense attempts (CLAUDE.md section 46).
 *
 * <p>The listing returns EVERY attempt, oldest first, including cancelled and failed ones — that is
 * the point of modelling attempts as separate rows rather than one overwritable record. A retake is
 * created by POSTing a new attempt; there is deliberately no endpoint that reopens or edits an
 * existing one.
 *
 * <p>Scheduling, cancelling and recording results are university-only. A student can read their own
 * attempts through the same listing but holds no university scope, so no route lets them record an
 * outcome.
 */
@RestController
@RequestMapping("/api/v1")
public class DefenseController {

    private final DefenseService defenseService;

    public DefenseController(DefenseService defenseService) {
        this.defenseService = defenseService;
    }

    /** Full history, oldest first. Cancelled and failed attempts are preserved and returned. */
    @GetMapping("/placements/{placementId}/defense-attempts")
    public List<DefenseAttemptResponse> history(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return defenseService.history(currentUserId(jwt), placementId).stream()
                .map(DefenseAttemptResponse::from)
                .toList();
    }

    /**
     * Schedules the next attempt. A retake is simply another POST here; the attempt number is
     * assigned by the backend and never supplied by the client.
     */
    @PostMapping("/placements/{placementId}/defense-attempts")
    public DefenseAttemptResponse schedule(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody ScheduleDefenseRequest request, HttpServletRequest httpRequest) {
        return DefenseAttemptResponse.from(defenseService.schedule(
                currentUserId(jwt), placementId, request.scheduledAt(), request.locationDetails(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** SCHEDULED to CANCELLED. The attempt row survives; it simply never took place. */
    @PostMapping("/defense-attempts/{attemptId}/cancel")
    public DefenseAttemptResponse cancel(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID attemptId, HttpServletRequest httpRequest) {
        return DefenseAttemptResponse.from(defenseService.cancel(
                currentUserId(jwt), attemptId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /**
     * SCHEDULED to COMPLETED, with the panel's verdict.
     *
     * <p>RETAKE_REQUIRED completes this attempt rather than reopening it — the university then
     * schedules a new one, and this attempt stays exactly as recorded.
     */
    @PostMapping("/defense-attempts/{attemptId}/result")
    public DefenseAttemptResponse recordResult(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID attemptId,
            @Valid @RequestBody DefenseResultRequest request, HttpServletRequest httpRequest) {
        return DefenseAttemptResponse.from(defenseService.recordResult(
                currentUserId(jwt), attemptId, request.result(), request.panelNotes(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
