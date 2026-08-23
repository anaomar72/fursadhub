package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.NominationConsentService;
import com.fursadhub.common.web.RequestMetadata;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Student consent to a nomination (CLAUDE.md section 35, Phase 4 section 5).
 *
 * <p>Accepting is what first creates the candidacy and therefore what first exposes the student to
 * the organization. Only the nominated student can call these, proven from the authenticated
 * principal rather than any request field.
 */
@RestController
@RequestMapping("/api/v1/nominations/{nominationId}")
public class StudentNominationController {

    private final NominationConsentService consentService;

    public StudentNominationController(NominationConsentService consentService) {
        this.consentService = consentService;
    }

    @PostMapping("/accept")
    public CandidacyResponse accept(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID nominationId, HttpServletRequest httpRequest) {
        return CandidacyResponse.from(consentService.accept(
                currentUserId(jwt), nominationId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/decline")
    public StudentNominationResponse decline(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID nominationId, HttpServletRequest httpRequest) {
        var nomination = consentService.decline(
                currentUserId(jwt), nominationId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new StudentNominationResponse(
                nomination.getId().toString(),
                nomination.getOpportunityId().toString(),
                null,
                null,
                nomination.getStatus().name(),
                nomination.getNote(),
                nomination.getCreatedAt().toString(),
                nomination.getRespondedAt() == null ? null : nomination.getRespondedAt().toString());
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
