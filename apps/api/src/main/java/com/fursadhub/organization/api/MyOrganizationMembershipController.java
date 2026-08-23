package com.fursadhub.organization.api;

import com.fursadhub.organization.application.MyOrganizationMembershipQueryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class MyOrganizationMembershipController {

    private final MyOrganizationMembershipQueryService queryService;

    public MyOrganizationMembershipController(MyOrganizationMembershipQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/api/v1/organization-memberships/me")
    public List<MyOrganizationMembershipResponse> get(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return queryService.getMyMemberships(userId).stream().map(MyOrganizationMembershipResponse::from).toList();
    }
}
