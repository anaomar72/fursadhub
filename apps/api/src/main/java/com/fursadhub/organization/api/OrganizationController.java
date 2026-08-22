package com.fursadhub.organization.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.organization.application.CreateOrganizationService;
import com.fursadhub.organization.application.OrganizationQueryService;
import com.fursadhub.organization.application.UpdateOrganizationService;
import com.fursadhub.organization.domain.Organization;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Self-service organization registration and management (CLAUDE.md section 26). */
@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private final CreateOrganizationService createService;
    private final UpdateOrganizationService updateService;
    private final OrganizationQueryService queryService;

    public OrganizationController(
            CreateOrganizationService createService, UpdateOrganizationService updateService, OrganizationQueryService queryService) {
        this.createService = createService;
        this.updateService = updateService;
        this.queryService = queryService;
    }

    @PostMapping
    public ResponseEntity<OrganizationResponse> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateOrganizationRequest request, HttpServletRequest httpRequest) {
        Organization organization = createService.create(
                currentUserId(jwt), request.name(), request.type(), request.registrationNumber(), request.website(),
                request.description(), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(OrganizationResponse.from(organization));
    }

    @GetMapping("/{organizationId}")
    public OrganizationResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return OrganizationResponse.from(queryService.getForMember(currentUserId(jwt), organizationId));
    }

    @PatchMapping("/{organizationId}")
    public OrganizationResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId,
            @Valid @RequestBody UpdateOrganizationRequest request, HttpServletRequest httpRequest) {
        Organization organization = updateService.update(
                currentUserId(jwt), organizationId, request.name(), request.registrationNumber(), request.website(),
                request.description(), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return OrganizationResponse.from(organization);
    }

    @PostMapping("/{organizationId}/verification/submit")
    public OrganizationResponse submitForVerification(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId, HttpServletRequest httpRequest) {
        Organization organization = updateService.submitForVerification(
                currentUserId(jwt), organizationId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return OrganizationResponse.from(organization);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
