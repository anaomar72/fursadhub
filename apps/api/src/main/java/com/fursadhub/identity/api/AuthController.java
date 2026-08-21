package com.fursadhub.identity.api;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.api.MessageResponse;
import com.fursadhub.common.config.CorsProperties;
import com.fursadhub.identity.application.ForgotPasswordService;
import com.fursadhub.identity.application.LoginService;
import com.fursadhub.identity.application.LogoutService;
import com.fursadhub.identity.application.RefreshTokenService;
import com.fursadhub.identity.application.RegisterUserService;
import com.fursadhub.identity.application.ResendVerificationService;
import com.fursadhub.identity.application.ResetPasswordService;
import com.fursadhub.identity.application.VerifyEmailService;
import com.fursadhub.identity.domain.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Registration/verification/login/refresh/logout/password-reset (CLAUDE.md section 19).
 * Permitted without a JWT on the security filter chain since these endpoints establish identity
 * in the first place — refresh/logout instead rely on the HttpOnly cookie plus Origin validation.
 */
@RestController
public class AuthController {

    private final RegisterUserService registerUserService;
    private final VerifyEmailService verifyEmailService;
    private final ResendVerificationService resendVerificationService;
    private final LoginService loginService;
    private final RefreshTokenService refreshTokenService;
    private final LogoutService logoutService;
    private final ForgotPasswordService forgotPasswordService;
    private final ResetPasswordService resetPasswordService;
    private final RefreshCookieFactory cookieFactory;
    private final CorsProperties corsProperties;

    public AuthController(
            RegisterUserService registerUserService,
            VerifyEmailService verifyEmailService,
            ResendVerificationService resendVerificationService,
            LoginService loginService,
            RefreshTokenService refreshTokenService,
            LogoutService logoutService,
            ForgotPasswordService forgotPasswordService,
            ResetPasswordService resetPasswordService,
            RefreshCookieFactory cookieFactory,
            CorsProperties corsProperties) {
        this.registerUserService = registerUserService;
        this.verifyEmailService = verifyEmailService;
        this.resendVerificationService = resendVerificationService;
        this.loginService = loginService;
        this.refreshTokenService = refreshTokenService;
        this.logoutService = logoutService;
        this.forgotPasswordService = forgotPasswordService;
        this.resetPasswordService = resetPasswordService;
        this.cookieFactory = cookieFactory;
        this.corsProperties = corsProperties;
    }

    @PostMapping("/api/v1/auth/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = registerUserService.register(request.email(), request.password(), request.preferredLocale());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse(user.getEmail(), user.getStatus().name()));
    }

    @PostMapping("/api/v1/auth/email/verify")
    public ResponseEntity<MessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request, HttpServletRequest httpRequest) {
        verifyEmailService.verify(request.email(), request.code(), clientIp(httpRequest), userAgent(httpRequest));
        return ResponseEntity.ok(new MessageResponse("Your email address has been verified."));
    }

    @PostMapping("/api/v1/auth/email/resend")
    public ResponseEntity<MessageResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        resendVerificationService.resend(request.email());
        return ResponseEntity.ok(new MessageResponse("If an account exists for this email and is not yet verified, a new verification email has been sent."));
    }

    @PostMapping("/api/v1/auth/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        LoginService.LoginResult result = loginService.login(
                request.email(), request.password(), clientIp(httpRequest), userAgent(httpRequest));

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookieFactory.build(result.rawRefreshToken(), result.refreshExpiresAt()).toString())
                .body(LoginResponse.bearer(result.accessToken(), result.expiresInSeconds()));
    }

    @PostMapping("/api/v1/auth/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken,
            @RequestHeader(value = "Origin", required = false) String origin,
            HttpServletRequest httpRequest) {
        validateOrigin(origin);

        RefreshTokenService.RefreshResult result = refreshTokenService.refresh(
                refreshToken, clientIp(httpRequest), userAgent(httpRequest));

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookieFactory.build(result.rawRefreshToken(), result.refreshExpiresAt()).toString())
                .body(LoginResponse.bearer(result.accessToken(), result.expiresInSeconds()));
    }

    @PostMapping("/api/v1/auth/logout")
    public ResponseEntity<MessageResponse> logout(
            @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken,
            @RequestHeader(value = "Origin", required = false) String origin,
            HttpServletRequest httpRequest) {
        validateOrigin(origin);

        logoutService.logout(refreshToken, clientIp(httpRequest), userAgent(httpRequest));

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookieFactory.clear().toString())
                .body(new MessageResponse("Logged out."));
    }

    @PostMapping("/api/v1/auth/logout-all")
    public ResponseEntity<MessageResponse> logoutAll(
            @org.springframework.security.core.annotation.AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "Origin", required = false) String origin,
            HttpServletRequest httpRequest) {
        validateOrigin(origin);

        logoutService.logoutAll(java.util.UUID.fromString(jwt.getSubject()), clientIp(httpRequest), userAgent(httpRequest));

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookieFactory.clear().toString())
                .body(new MessageResponse("Logged out of all sessions."));
    }

    @PostMapping("/api/v1/auth/password/forgot")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        forgotPasswordService.forgotPassword(request.email());
        return ResponseEntity.ok(new MessageResponse("If an account exists for this email, a password reset link has been sent."));
    }

    @PostMapping("/api/v1/auth/password/reset")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request, HttpServletRequest httpRequest) {
        resetPasswordService.reset(request.token(), request.newPassword(), clientIp(httpRequest), userAgent(httpRequest));
        return ResponseEntity.ok(new MessageResponse("Your password has been reset. Please log in again."));
    }

    /**
     * Defense-in-depth for the cookie-authenticated endpoints (CLAUDE.md section 21). SameSite=Lax
     * already blocks cross-site fetch/XHR from sending the cookie; this additionally rejects a
     * present-but-foreign Origin header outright. A missing Origin (non-browser clients) is allowed.
     */
    private void validateOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return;
        }
        List<String> allowed = corsProperties.originList();
        if (allowed.stream().noneMatch(o -> o.trim().equalsIgnoreCase(origin.trim()))) {
            throw new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "This request origin is not allowed.");
        }
    }

    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private String userAgent(HttpServletRequest request) {
        String value = request.getHeader("User-Agent");
        return value == null ? null : (value.length() > 255 ? value.substring(0, 255) : value);
    }
}
