package com.fursadhub.university.api;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.university.application.MyUniversityMembershipQueryService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class MyUniversityMembershipController {

    private final MyUniversityMembershipQueryService queryService;

    public MyUniversityMembershipController(MyUniversityMembershipQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/api/v1/university-memberships/me")
    public MyMembershipResponse get(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return queryService.getMyMembership(userId)
                .map(MyMembershipResponse::from)
                .orElseThrow(() -> new ApiException("UNIVERSITY_MEMBERSHIP_NOT_FOUND", HttpStatus.NOT_FOUND, "No active university staff membership."));
    }
}
