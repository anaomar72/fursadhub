package com.fursadhub.university.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.university.application.UniversityStaffService;
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

/** University-admin-only staff management for the caller's own university (CLAUDE.md section 25). */
@RestController
@RequestMapping("/api/v1/universities/{universityId}/staff")
public class UniversityStaffController {

    private final UniversityStaffService staffService;

    public UniversityStaffController(UniversityStaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public List<StaffMemberResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID universityId) {
        return staffService.listStaff(currentUserId(jwt), universityId).stream().map(StaffMemberResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<StaffMemberResponse> assign(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @Valid @RequestBody AssignStaffRequest request,
            HttpServletRequest httpRequest) {
        UniversityStaffService.StaffMember staffMember = staffService.assign(
                currentUserId(jwt), universityId, request.email(), request.role(), request.departmentIds(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(StaffMemberResponse.from(staffMember));
    }

    @PostMapping("/{membershipId}/revoke")
    public ResponseEntity<MessageResponse> revoke(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        staffService.revoke(currentUserId(jwt), universityId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.ok(new MessageResponse("Staff membership revoked."));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
