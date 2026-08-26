package com.fursadhub.student.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.file.api.PrivateDocumentResponses;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.student.application.StudentCvService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * The student's CV (CLAUDE.md section 47).
 *
 * <p>Note the two route shapes, which encode the authorization model rather than merely reflecting
 * it. The student's own routes are under {@code /students/me} and carry no id at all. The recruiter's
 * route hangs off a CANDIDACY, not off a student — there is deliberately no
 * {@code /students/{id}/cv}, because such a route would invite exactly the mistake of authorizing by
 * role instead of by relationship, and changing its id would be a working IDOR.
 */
@RestController
public class StudentCvController {

    private final StudentCvService cvService;

    public StudentCvController(StudentCvService cvService) {
        this.cvService = cvService;
    }

    /** Metadata only — whether a CV exists. The bytes come from the download route. */
    @GetMapping("/api/v1/students/me/cv")
    public StudentCvResponse myCv(@AuthenticationPrincipal Jwt jwt) {
        return new StudentCvResponse(cvService.hasCv(currentUserId(jwt)));
    }

    @PostMapping("/api/v1/students/me/cv")
    public StudentCvResponse upload(
            @AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) {
        StoredFile stored = cvService.upload(currentUserId(jwt), file);
        return new StudentCvResponse(stored != null);
    }

    @DeleteMapping("/api/v1/students/me/cv")
    public MessageResponse remove(@AuthenticationPrincipal Jwt jwt) {
        cvService.remove(currentUserId(jwt));
        return new MessageResponse("CV removed.");
    }

    @GetMapping("/api/v1/students/me/cv/document")
    public ResponseEntity<InputStreamResource> downloadOwn(
            @AuthenticationPrincipal Jwt jwt, HttpServletRequest httpRequest) {
        StudentCvService.Document document = cvService.openOwn(
                currentUserId(jwt), RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    /**
     * A recruiter reading the CV of a candidate in their own pipeline.
     *
     * <p>Authorized by Phase 4's candidacy rules: the candidacy must belong to an organization the
     * caller currently recruits for. A recruiter at another organization gets a 403 from the same
     * check that already guards the rest of the candidate's record.
     */
    @GetMapping("/api/v1/candidacies/{candidacyId}/cv")
    public ResponseEntity<InputStreamResource> downloadForCandidacy(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID candidacyId,
            HttpServletRequest httpRequest) {
        StudentCvService.Document document = cvService.openForCandidacy(
                currentUserId(jwt), candidacyId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return PrivateDocumentResponses.attachment(document.metadata(), document.content());
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
