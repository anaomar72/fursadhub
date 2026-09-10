package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.ApplicationCvService;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/opportunities/{opportunityId}/application-cv")
public class ApplicationCvController {
    private final ApplicationCvService service;
    public ApplicationCvController(ApplicationCvService service) { this.service = service; }
    @PostMapping
    public ApplicationCvService.Uploaded upload(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID opportunityId, @RequestParam("file") MultipartFile file) {
        return service.upload(UUID.fromString(jwt.getSubject()), opportunityId, file);
    }
    @DeleteMapping("/{uploadId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID opportunityId, @PathVariable UUID uploadId) {
        service.remove(UUID.fromString(jwt.getSubject()), opportunityId, uploadId);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/{uploadId}/document")
    public ResponseEntity<InputStreamResource> document(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID opportunityId, @PathVariable UUID uploadId, HttpServletRequest request) {
        var document = service.openOwn(UUID.fromString(jwt.getSubject()), opportunityId, uploadId,
                RequestMetadata.clientIp(request), RequestMetadata.userAgent(request));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }
}
