package com.fursadhub.internshipmanagement.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.internshipmanagement.application.AttendanceService;
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
 * Attendance (CLAUDE.md section 43).
 *
 * <p>Each confirmation transition is its own named command — {@code /confirm}, {@code /dispute},
 * {@code /resolve} — so there is no way for a client to move a record into an arbitrary status, and
 * a disputed record cannot be quietly flipped back to confirmed without a resolution.
 *
 * <p>Nothing here accepts a coordinate, a device identifier or a biometric signal, by design.
 */
@RestController
@RequestMapping("/api/v1")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    /** Every record for a placement — the student's own, or a supervisor's/university's view. */
    @GetMapping("/placements/{placementId}/attendance")
    public List<AttendanceResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId) {
        return attendanceService.list(currentUserId(jwt), placementId).stream()
                .map(AttendanceResponse::from)
                .toList();
    }

    /** Records one day. Assigned organization supervisor only; the date must be within the placement. */
    @PostMapping("/placements/{placementId}/attendance")
    public AttendanceResponse record(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID placementId,
            @Valid @RequestBody RecordAttendanceRequest request) {
        return AttendanceResponse.from(attendanceService.record(
                currentUserId(jwt), placementId, request.attendanceDate(),
                request.attendanceValue(), request.notes()));
    }

    /** RECORDED to CONFIRMED. Assigned organization supervisor only. Idempotent. */
    @PostMapping("/attendance/{recordId}/confirm")
    public AttendanceResponse confirm(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID recordId, HttpServletRequest httpRequest) {
        return AttendanceResponse.from(attendanceService.confirm(
                currentUserId(jwt), recordId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /**
     * RECORDED or CONFIRMED to DISPUTED. The owning STUDENT only.
     *
     * <p>Disputing an already-confirmed record is allowed on purpose: an error is often noticed only
     * after confirmation, and an attendance record nobody can challenge is not acceptable.
     */
    @PostMapping("/attendance/{recordId}/dispute")
    public AttendanceResponse dispute(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID recordId,
            @Valid @RequestBody DisputeAttendanceRequest request, HttpServletRequest httpRequest) {
        return AttendanceResponse.from(attendanceService.dispute(
                currentUserId(jwt), recordId, request.reason(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** DISPUTED to RESOLVED, optionally correcting the value. The student's reason is preserved. */
    @PostMapping("/attendance/{recordId}/resolve")
    public AttendanceResponse resolve(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID recordId,
            @Valid @RequestBody(required = false) ResolveAttendanceRequest request,
            HttpServletRequest httpRequest) {
        return AttendanceResponse.from(attendanceService.resolve(
                currentUserId(jwt), recordId,
                request == null ? null : request.correctedValue(),
                request == null ? null : request.resolutionNote(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
