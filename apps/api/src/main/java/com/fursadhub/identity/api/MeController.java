package com.fursadhub.identity.api;

import com.fursadhub.identity.application.MeQueryService;
import com.fursadhub.identity.domain.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class MeController {

    private final MeQueryService meQueryService;

    public MeController(MeQueryService meQueryService) {
        this.meQueryService = meQueryService;
    }

    @GetMapping("/api/v1/me")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        User user = meQueryService.getById(UUID.fromString(jwt.getSubject()));
        return new MeResponse(user.getId(), user.getEmail(), user.getStatus().name(), user.getPreferredLocale(), user.getEmailVerifiedAt());
    }
}
