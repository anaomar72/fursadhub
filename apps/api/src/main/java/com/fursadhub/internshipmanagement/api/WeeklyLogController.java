package com.fursadhub.internshipmanagement.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.internshipmanagement.application.WeeklyLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Weekly logs (CLAUDE.md section 42).
 *
 * <p>Every transition is an explicit named command — {@code /submit}, {@code /review},
 * {@code /return} — never a status field the client may set (CLAUDE.md section 10). There is
 * deliberately no {@code PATCH} that accepts a state.
 *
 * <p>No student id appears anywhere: the owner is resolved from the authenticated session
 * (CLAUDE.md section 12). The placement and log ids in the path are re-authorized on every call, so
 * changing a UUID cannot reach another student's diary.
 */
@RestController
@RequestMapping("/api/v1")
public class WeeklyLogController {

    private final WeeklyLogService weeklyLogService;

    public WeeklyLogController(WeeklyLogService weeklyLogService) {
        this.weeklyLogService = weeklyLogService;
    }

    // ---------------------------------------------------------------- read

    /** All logs for a placement — the student's own, or a university reviewer's queue. */
    @GetMapping("/placements/{placementId}/weekly-logs")
    public List<WeeklyLogResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return weeklyLogService.list(currentUserId(jwt), placementId).stream()
                .map(WeeklyLogResponse::from)
                .toList();
    }

    /**
     * How many weeks this internship has, derived from its own dates, so the UI offers only weeks
     * that exist rather than letting a student invent one the backend will reject.
     */
    @GetMapping("/placements/{placementId}/weekly-logs/expected-weeks")
    public Map<String, Integer> expectedWeeks(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return Map.of("expectedWeekCount", weeklyLogService.expectedWeekCount(currentUserId(jwt), placementId));
    }

    // ---------------------------------------------------------------- student commands

    @PostMapping("/placements/{placementId}/weekly-logs")
    public WeeklyLogResponse create(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody WeeklyLogRequest request) {
        return WeeklyLogResponse.from(weeklyLogService.create(
                currentUserId(jwt), placementId, request.weekNumber(), request.summary(),
                request.activities(), request.challenges(), request.learningOutcomes()));
    }

    /** Edits a DRAFT or RETURNED_FOR_CHANGES log. The week number is fixed at creation. */
    @PutMapping("/weekly-logs/{logId}")
    public WeeklyLogResponse edit(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID logId,
            @Valid @RequestBody WeeklyLogEditRequest request) {
        return WeeklyLogResponse.from(weeklyLogService.edit(
                currentUserId(jwt), logId, request.summary(), request.activities(),
                request.challenges(), request.learningOutcomes()));
    }

    /** DRAFT or RETURNED_FOR_CHANGES to SUBMITTED. Idempotent. */
    @PostMapping("/weekly-logs/{logId}/submit")
    public WeeklyLogResponse submit(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID logId, HttpServletRequest httpRequest) {
        return WeeklyLogResponse.from(weeklyLogService.submit(
                currentUserId(jwt), logId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    // ---------------------------------------------------------------- university commands

    /**
     * SUBMITTED to REVIEWED. University staff in scope only — a student holds no university scope on
     * their own placement, so "cannot review own log" needs no special case.
     */
    @PostMapping("/weekly-logs/{logId}/review")
    public WeeklyLogResponse review(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID logId,
            @Valid @RequestBody(required = false) ReviewCommentRequest request, HttpServletRequest httpRequest) {
        return WeeklyLogResponse.from(weeklyLogService.review(
                currentUserId(jwt), logId, ReviewCommentRequest.commentOf(request),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** SUBMITTED to RETURNED_FOR_CHANGES. The comment is required. */
    @PostMapping("/weekly-logs/{logId}/return")
    public WeeklyLogResponse returnForChanges(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID logId,
            @Valid @RequestBody(required = false) ReviewCommentRequest request, HttpServletRequest httpRequest) {
        return WeeklyLogResponse.from(weeklyLogService.returnForChanges(
                currentUserId(jwt), logId, ReviewCommentRequest.commentOf(request),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
