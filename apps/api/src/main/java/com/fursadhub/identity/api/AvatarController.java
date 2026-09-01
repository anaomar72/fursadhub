package com.fursadhub.identity.api;

import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.identity.application.AvatarService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Profile pictures (Phase 8). Upload is self-service only (CLAUDE.md section 12 — the caller is
 * always taken from the JWT, never a path variable); viewing is open to any authenticated caller,
 * for any account, which is what {@link AvatarService} enforces — this controller decides nothing
 * about authorization itself.
 */
@RestController
public class AvatarController {

    private final AvatarService avatarService;

    public AvatarController(AvatarService avatarService) {
        this.avatarService = avatarService;
    }

    @PostMapping("/api/v1/me/avatar")
    public AvatarResponse upload(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) {
        avatarService.upload(currentUserId(jwt), file);
        return new AvatarResponse(true);
    }

    @GetMapping("/api/v1/users/{userId}/avatar/document")
    public ResponseEntity<InputStreamResource> download(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId, HttpServletRequest httpRequest) {
        AvatarService.Document document = avatarService.open(
                userId, currentUserId(jwt), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
