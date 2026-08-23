package com.fursadhub.candidacy.api;

import com.fursadhub.candidacy.application.OfferResponseService;
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
 * The student's response to an internship offer (CLAUDE.md Phase 4 section 16).
 *
 * <p>No student id is accepted: ownership is proven by walking offer -> candidacy -> student and
 * comparing against the authenticated caller, so one student can never accept another's offer.
 */
@RestController
@RequestMapping("/api/v1/offers/{offerId}")
public class OfferController {

    private final OfferResponseService offerResponseService;

    public OfferController(OfferResponseService offerResponseService) {
        this.offerResponseService = offerResponseService;
    }

    /**
     * Accepts the offer and creates exactly one placement, atomically. A repeated call (double
     * click, retry) returns the same placement with {@code alreadyAccepted=true} rather than
     * creating a second one.
     */
    @PostMapping("/accept")
    public OfferAcceptanceResponse accept(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID offerId, HttpServletRequest httpRequest) {
        return OfferAcceptanceResponse.from(offerResponseService.accept(
                currentUserId(jwt), offerId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    @PostMapping("/decline")
    public InternshipOfferResponse decline(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID offerId, HttpServletRequest httpRequest) {
        return InternshipOfferResponse.from(offerResponseService.decline(
                currentUserId(jwt), offerId, RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
