package com.fursadhub.organization.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.api.TemporaryCredentialResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.identity.domain.DisplayNamePolicy;
import com.fursadhub.organization.application.OrganizationMembershipService;
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

/** Organization-admin-only managed staff provisioning for the caller's own organization (CLAUDE.md section 26A). */
@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/members")
public class OrganizationMembershipController {

    private final OrganizationMembershipService membershipService;

    public OrganizationMembershipController(OrganizationMembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @GetMapping
    public List<OrganizationMemberResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return membershipService.listMembers(currentUserId(jwt), organizationId).stream()
                .map(OrganizationMemberResponse::from)
                .toList();
    }

    /** Creates a brand-new staff account — the email does not need to belong to an existing user. */
    @PostMapping
    public ResponseEntity<OrganizationMemberResponse> create(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody CreateOrganizationMemberRequest request, HttpServletRequest httpRequest) {
        OrganizationMembershipService.Member member = membershipService.create(
                currentUserId(jwt), organizationId, request.email(), request.password(), request.confirmPassword(),
                request.displayName(), request.role(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(OrganizationMemberResponse.from(member));
    }

    @PostMapping("/{membershipId}/role")
    public OrganizationMemberResponse changeRole(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, @PathVariable UUID membershipId,
            @Valid @RequestBody ChangeOrganizationMemberRoleRequest request, HttpServletRequest httpRequest) {
        OrganizationMembershipService.Member member = membershipService.changeRole(
                currentUserId(jwt), organizationId, membershipId, request.role(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return OrganizationMemberResponse.from(member);
    }

    /** Sets or clears a managed staff member's display name (Backend Phase B5). */
    @PostMapping("/{membershipId}/display-name")
    public OrganizationMemberResponse changeDisplayName(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody ChangeOrganizationMemberDisplayNameRequest request,
            HttpServletRequest httpRequest) {
        OrganizationMembershipService.Member member = membershipService.changeDisplayName(
                currentUserId(jwt), organizationId, membershipId, DisplayNamePolicy.requireSubmitted(request.displayName()),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return OrganizationMemberResponse.from(member);
    }

    @PostMapping("/{membershipId}/suspend")
    public MessageResponse suspend(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        membershipService.suspend(currentUserId(jwt), organizationId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Staff account suspended.");
    }

    @PostMapping("/{membershipId}/reactivate")
    public MessageResponse reactivate(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        membershipService.reactivate(currentUserId(jwt), organizationId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Staff account reactivated.");
    }

    /** Issues a fresh server-generated temporary password, returned exactly once in this response. */
    @PostMapping("/{membershipId}/reset-password")
    public TemporaryCredentialResponse resetPassword(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        OrganizationMembershipService.MemberCredential credential = membershipService.resetPassword(
                currentUserId(jwt), organizationId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new TemporaryCredentialResponse(membershipId.toString(), credential.email(), credential.temporaryPassword());
    }

    @PostMapping("/{membershipId}/revoke")
    public MessageResponse revoke(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, @PathVariable UUID membershipId,
            HttpServletRequest httpRequest) {
        membershipService.revoke(currentUserId(jwt), organizationId, membershipId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Staff membership revoked.");
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
