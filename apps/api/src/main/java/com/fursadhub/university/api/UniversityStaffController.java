package com.fursadhub.university.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.api.TemporaryCredentialResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.identity.domain.DisplayNamePolicy;
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

/** University-admin-only managed staff provisioning for the caller's own university (CLAUDE.md section 26A). */
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

    /** Creates a brand-new staff account — the email does not need to belong to an existing user. */
    @PostMapping
    public ResponseEntity<StaffMemberResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @Valid @RequestBody CreateStaffRequest request,
            HttpServletRequest httpRequest) {
        UniversityStaffService.StaffMember staffMember = staffService.create(
                currentUserId(jwt), universityId, request.email(), request.password(), request.confirmPassword(),
                request.displayName(), request.role(), request.departmentIds(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(StaffMemberResponse.from(staffMember));
    }

    @PostMapping("/{membershipId}/role")
    public StaffMemberResponse changeRole(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody ChangeStaffRoleRequest request,
            HttpServletRequest httpRequest) {
        UniversityStaffService.StaffMember staffMember = staffService.changeRole(
                currentUserId(jwt), universityId, membershipId, request.role(), request.departmentIds(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return StaffMemberResponse.from(staffMember);
    }

    /** Sets or clears a managed staff member's display name (Backend Phase B5). */
    @PostMapping("/{membershipId}/display-name")
    public StaffMemberResponse changeDisplayName(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody ChangeStaffDisplayNameRequest request,
            HttpServletRequest httpRequest) {
        UniversityStaffService.StaffMember staffMember = staffService.changeDisplayName(
                currentUserId(jwt), universityId, membershipId, DisplayNamePolicy.requireSubmitted(request.displayName()),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return StaffMemberResponse.from(staffMember);
    }

    @PostMapping("/{membershipId}/suspend")
    public MessageResponse suspend(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        staffService.suspend(currentUserId(jwt), universityId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Staff account suspended.");
    }

    @PostMapping("/{membershipId}/reactivate")
    public MessageResponse reactivate(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        staffService.reactivate(currentUserId(jwt), universityId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Staff account reactivated.");
    }

    /** Issues a fresh server-generated temporary password, returned exactly once in this response. */
    @PostMapping("/{membershipId}/reset-password")
    public TemporaryCredentialResponse resetPassword(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID universityId,
            @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        UniversityStaffService.StaffCredential credential = staffService.resetPassword(
                currentUserId(jwt), universityId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new TemporaryCredentialResponse(membershipId.toString(), credential.email(), credential.temporaryPassword());
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
