package com.fursadhub.compliance.api;

import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.web.RequestMetadata;
import com.fursadhub.compliance.application.ConsentService;
import com.fursadhub.compliance.application.PrivacyRequestService;
import com.fursadhub.compliance.application.TermsAcceptanceService;
import com.fursadhub.compliance.domain.ConsentType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * The signed-in user's own compliance surface: terms acceptance, optional consents, and privacy
 * requests (CLAUDE.md sections 49-50).
 *
 * <p>Everything is rooted at {@code /me}. The subject is always the authenticated caller, taken from
 * the JWT and never from a path or body (CLAUDE.md section 12), so there is no route here that could
 * accept or withdraw a consent, or file a privacy request, on someone else's behalf.
 */
@RestController
@RequestMapping("/api/v1/me")
public class MyComplianceController {

    private final TermsAcceptanceService termsAcceptanceService;
    private final ConsentService consentService;
    private final PrivacyRequestService privacyRequestService;

    public MyComplianceController(
            TermsAcceptanceService termsAcceptanceService,
            ConsentService consentService,
            PrivacyRequestService privacyRequestService) {
        this.termsAcceptanceService = termsAcceptanceService;
        this.consentService = consentService;
        this.privacyRequestService = privacyRequestService;
    }

    // ---------------------------------------------------------------- terms

    /** What the user still has to accept. The web app checks this after sign-in and prompts. */
    @GetMapping("/legal-status")
    public LegalStatusResponse legalStatus(
            @AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String locale) {
        List<LegalDocumentResponse> outstanding =
                termsAcceptanceService.outstandingFor(currentUserId(jwt), locale).stream()
                        .map(LegalDocumentResponse::summary)
                        .toList();
        return LegalStatusResponse.of(outstanding);
    }

    @PostMapping("/terms-acceptances")
    public MessageResponse acceptTerms(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AcceptTermsRequest request,
            HttpServletRequest httpRequest) {
        termsAcceptanceService.accept(currentUserId(jwt), request.legalDocumentId(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
        return new MessageResponse("Accepted.");
    }

    // ---------------------------------------------------------------- consents

    @GetMapping("/consents")
    public List<ConsentResponse> consents(@AuthenticationPrincipal Jwt jwt) {
        return consentService.currentFor(currentUserId(jwt)).stream()
                .map(ConsentResponse::from)
                .toList();
    }

    @PutMapping("/consents/{consentType}")
    public ConsentResponse setConsent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable ConsentType consentType,
            @Valid @RequestBody UpdateConsentRequest request,
            HttpServletRequest httpRequest) {
        return ConsentResponse.from(consentService.set(
                currentUserId(jwt), consentType, request.granted(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    // ---------------------------------------------------------------- privacy requests

    @GetMapping("/privacy-requests")
    public List<PrivacyRequestResponse> myPrivacyRequests(@AuthenticationPrincipal Jwt jwt) {
        return privacyRequestService.mine(currentUserId(jwt)).stream()
                .map(PrivacyRequestResponse::from)
                .toList();
    }

    @PostMapping("/privacy-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public PrivacyRequestResponse submitPrivacyRequest(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SubmitPrivacyRequestRequest request,
            HttpServletRequest httpRequest) {
        return PrivacyRequestResponse.from(privacyRequestService.submit(
                currentUserId(jwt), request.requestType(), request.details(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
