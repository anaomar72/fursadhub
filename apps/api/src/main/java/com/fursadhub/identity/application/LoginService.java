package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.common.config.AuthProperties;
import com.fursadhub.common.ratelimit.InMemoryRateLimiter;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.RefreshToken;
import com.fursadhub.identity.domain.RefreshTokenRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.identity.infrastructure.AccessTokenIssuer;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class LoginService {

    private final UserRepository users;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokens;
    private final OpaqueTokenGenerator tokenGenerator;
    private final AccessTokenIssuer accessTokenIssuer;
    private final AuditService audit;
    private final InMemoryRateLimiter rateLimiter;
    private final AuthProperties authProperties;

    public LoginService(
            UserRepository users,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            RefreshTokenRepository refreshTokens,
            OpaqueTokenGenerator tokenGenerator,
            AccessTokenIssuer accessTokenIssuer,
            AuditService audit,
            InMemoryRateLimiter rateLimiter,
            AuthProperties authProperties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokens = refreshTokens;
        this.tokenGenerator = tokenGenerator;
        this.accessTokenIssuer = accessTokenIssuer;
        this.audit = audit;
        this.rateLimiter = rateLimiter;
        this.authProperties = authProperties;
    }

    public record LoginResult(String accessToken, long expiresInSeconds, String rawRefreshToken, Instant refreshExpiresAt) {
    }

    @Transactional
    public LoginResult login(String rawEmail, String rawPassword, String ip, String userAgent) {
        String email = EmailNormalizer.normalize(rawEmail);

        boolean withinEmailLimit = rateLimiter.tryConsume("login:email:" + email, 10, Duration.ofMinutes(15));
        boolean withinIpLimit = rateLimiter.tryConsume("login:ip:" + safeIp(ip), 30, Duration.ofMinutes(15));
        if (!withinEmailLimit || !withinIpLimit) {
            throw new ApiException("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.");
        }

        Optional<User> maybeUser = users.findByEmail(email);
        if (maybeUser.isEmpty() || !passwordEncoder.matches(rawPassword, maybeUser.get().getPasswordHash())) {
            audit.record("LOGIN_FAILURE", maybeUser.map(User::getId).orElse(null), ip, userAgent, "reason=invalid_credentials");
            throw invalidCredentials();
        }

        User user = maybeUser.get();
        if (user.getStatus() == UserStatus.SUSPENDED) {
            audit.record("LOGIN_FAILURE", user.getId(), ip, userAgent, "reason=suspended");
            throw new ApiException("ACCOUNT_SUSPENDED", HttpStatus.FORBIDDEN, "This account has been suspended.");
        }
        if (user.getStatus() == UserStatus.CLOSED) {
            audit.record("LOGIN_FAILURE", user.getId(), ip, userAgent, "reason=closed");
            throw invalidCredentials();
        }

        AccessTokenIssuer.IssuedAccessToken accessToken = accessTokenIssuer.issueFor(user);

        String rawRefresh = tokenGenerator.generate();
        Instant expiresAt = Instant.now().plus(authProperties.refreshTokenTtl());
        RefreshToken refreshToken = RefreshToken.startNewFamily(
                user.getId(), tokenGenerator.hash(rawRefresh), expiresAt, userAgent, ip);
        refreshTokens.save(refreshToken);

        audit.record("LOGIN_SUCCESS", user.getId(), ip, userAgent, null);

        return new LoginResult(accessToken.token(), accessToken.expiresInSeconds(), rawRefresh, expiresAt);
    }

    private ApiException invalidCredentials() {
        return new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "Invalid email or password.");
    }

    private String safeIp(String ip) {
        return (ip == null || ip.isBlank()) ? "unknown" : ip;
    }
}
