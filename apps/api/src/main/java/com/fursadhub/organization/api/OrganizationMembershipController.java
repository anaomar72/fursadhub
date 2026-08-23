package com.fursadhub.organization.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
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

/** Organization-admin-only staff management for the caller's own organization (CLAUDE.md section 26). */
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

    @PostMapping
    public ResponseEntity<OrganizationMemberResponse> assign(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody AssignOrganizationMemberRequest request, HttpServletRequest httpRequest) {
        OrganizationMembershipService.Member member = membershipService.assign(
                currentUserId(jwt), organizationId, request.email(), request.role(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(OrganizationMemberResponse.from(member));
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
