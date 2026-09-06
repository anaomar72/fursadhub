package com.fursadhub.administration.api;

import com.fursadhub.administration.application.PlatformAccountConstraints;
import com.fursadhub.administration.application.PlatformAccountService;
import com.fursadhub.common.web.RequestMetadata;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Super-Admin provisioning of managed platform verification officers (Backend Phase B5.6).
 *
 * <p><strong>A role-specific resource, not a generic platform-account endpoint.</strong> The path
 * names the role, the request body has no {@code role} field, and the service assigns
 * {@code VERIFICATION_OFFICER} itself — so {@code SUPER_ADMIN} is not reachable through any input
 * this controller accepts. That is the same reasoning CLAUDE.md section 10 applies to business
 * transitions: when a value is security-critical, an explicit command beats a mutable field.
 *
 * <p>This sits beside {@code AdminController}'s existing {@code /platform-roles} endpoints rather
 * than replacing them. Those grant a role to an account that ALREADY exists; these create the
 * account. Both remain necessary, and neither can do the other's job.
 *
 * <p>Authorization is enforced in {@code PlatformAccountService}, re-read from PostgreSQL on every
 * call — a Super Admin whose grant was revoked loses this surface on their next request, not when
 * their access token expires (CLAUDE.md section 15).
 */
@RestController
@RequestMapping("/api/v1/admin/verification-officers")
public class AdminVerificationOfficerController {

    private final PlatformAccountService accountService;

    public AdminVerificationOfficerController(PlatformAccountService accountService) {
        this.accountService = accountService;
    }

    /** Active verification officers, excluding any account that also holds {@code SUPER_ADMIN}. */
    @GetMapping
    public List<VerificationOfficerResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return accountService.listVerificationOfficers(currentUserId(jwt)).stream()
                .map(VerificationOfficerResponse::from)
                .toList();
    }

    /**
     * Creates the account, its username and its {@code VERIFICATION_OFFICER} grant in one
     * transaction.
     *
     * <p>The response deliberately carries no credential: the Super Admin typed the password, so
     * returning it would add an exposure without adding information (CLAUDE.md section 26A).
     */
    @PostMapping
    public ResponseEntity<VerificationOfficerResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateVerificationOfficerRequest request,
            HttpServletRequest httpRequest) {
        try {
            PlatformAccountService.PlatformAccount officer = accountService.createVerificationOfficer(
                    currentUserId(jwt), request.displayName(), request.username(), request.email(),
                    request.password(), request.confirmPassword(),
                    RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest));
            return ResponseEntity.status(HttpStatus.CREATED).body(VerificationOfficerResponse.from(officer));
        } catch (DataIntegrityViolationException race) {
            // The service pre-checks both identifiers, so reaching here means a concurrent request
            // won between the check and the flush. Which identifier collided decides the code.
            throw PlatformAccountConstraints.translate(race);
        }
    }

    /** Assigns the one-time login username to an officer who predates Backend Phase B5.6. */
    @PostMapping("/{userId}/username")
    public VerificationOfficerResponse assignUsername(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID userId,
            @Valid @RequestBody AssignPlatformUsernameRequest request,
            HttpServletRequest httpRequest) {
        try {
            return VerificationOfficerResponse.from(accountService.assignUsername(
                    currentUserId(jwt), userId, request.username(),
                    RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
        } catch (DataIntegrityViolationException race) {
            throw PlatformAccountConstraints.translate(race);
        }
    }

    /**
     * Sets or replaces the officer's display name (Backend Phase B5.6).
     *
     * <p>No {@code DataIntegrityViolationException} catch, unlike the two commands around it: a
     * display name has no uniqueness constraint, so there is no race to translate here.
     */
    @PostMapping("/{userId}/display-name")
    public VerificationOfficerResponse changeDisplayName(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID userId,
            @Valid @RequestBody ChangeVerificationOfficerDisplayNameRequest request,
            HttpServletRequest httpRequest) {
        return VerificationOfficerResponse.from(accountService.changeDisplayName(
                currentUserId(jwt), userId, request.displayName(),
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    /** Issues a fresh server-generated temporary password, returned exactly once in this response. */
    @PostMapping("/{userId}/reset-password")
    public PlatformTemporaryCredentialResponse resetPassword(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId, HttpServletRequest httpRequest) {
        return PlatformTemporaryCredentialResponse.from(accountService.resetCredentials(
                currentUserId(jwt), userId,
                RequestMetadata.clientIp(httpRequest), RequestMetadata.userAgent(httpRequest)));
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
