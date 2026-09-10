package com.fursadhub.student.api;

import com.fursadhub.student.application.StudentMarketplaceAccess;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
public class StudentMarketplaceAccessController {
    private final StudentMarketplaceAccess access;

    public StudentMarketplaceAccessController(StudentMarketplaceAccess access) {
        this.access = access;
    }

    public record Access(boolean studentActions) {}

    @GetMapping("/api/v1/students/me/marketplace-access")
    public Access get(@AuthenticationPrincipal Jwt jwt) {
        return new Access(access.canAct(UUID.fromString(jwt.getSubject())));
    }
}
