package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.common.config.AuthProperties;
import com.fursadhub.common.ratelimit.InMemoryRateLimiter;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.RefreshToken;
import com.fursadhub.identity.domain.RefreshTokenRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UsernamePolicy;
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

    /**
     * Authenticates by EMAIL or by USERNAME (Backend Phase B5.5) — exactly one, never both.
     *
     * <p>The two identifiers only differ in how the account is RESOLVED and which rate-limit bucket
     * the attempt consumes. Everything after resolution — password verification, suspended/closed
     * handling, token issuance, refresh-token family creation, auditing — is the single pipeline
     * below, shared by both paths, so an authentication rule can never apply to one and not the
     * other.
     */
    @Transactional
    public LoginResult login(String rawEmail, String rawUsername, String rawPassword, String ip, String userAgent) {
        boolean hasEmail = rawEmail != null && !rawEmail.isBlank();
        boolean hasUsername = rawUsername != null && !rawUsername.isBlank();
        if (hasEmail == hasUsername) {
            // Covers {}, both-null, both-blank AND both-supplied. Ambiguity is refused rather than
            // resolved by precedence: a caller sending both does not know which account it means.
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Provide exactly one of email or username.");
        }

        // The IP limiter applies to every attempt regardless of identifier, and the per-identifier
        // bucket is chosen to match the credential actually being tried. A username-enabled account
        // can only be reached through its username (see resolveByEmail), so the two buckets cannot be
        // alternated to double one account's password-attempt budget.
        String identifierBucket = hasEmail
                ? "login:email:" + EmailNormalizer.normalize(rawEmail)
                : "login:username:" + rawUsername.strip().toLowerCase(java.util.Locale.ROOT);
        boolean withinIdentifierLimit = rateLimiter.tryConsume(
                identifierBucket, authProperties.loginMaxAttemptsPerEmail(), Duration.ofMinutes(15));
        boolean withinIpLimit = rateLimiter.tryConsume(
                "login:ip:" + safeIp(ip), authProperties.loginMaxAttemptsPerIp(), Duration.ofMinutes(15));
        if (!withinIdentifierLimit || !withinIpLimit) {
            throw new ApiException("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.");
        }

        Optional<User> maybeUser = hasEmail ? resolveByEmail(rawEmail) : resolveByUsername(rawUsername);
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

    /**
     * Resolves an email login, refusing it for an account that has moved to username authentication.
     *
     * <p>Returning EMPTY — rather than a distinct "use your username" error — is the point. The
     * caller gets the same {@code INVALID_CREDENTIALS} as an unknown address or a wrong password, so
     * the response never reveals that an email belongs to a managed staff account, nor that such an
     * account exists at all.
     *
     * <p>It also closes the credential-alias hole: once a username exists, the email is not a second
     * working way in, so an attacker cannot alternate the two identifiers to get twice the
     * password-attempt budget against one account.
     *
     * <p>An account with no username — every self-service user, and every managed account not yet
     * transitioned — takes the original path completely unchanged.
     */
    private Optional<User> resolveByEmail(String rawEmail) {
        return users.findByEmail(EmailNormalizer.normalize(rawEmail))
                .filter(user -> !user.hasUsername());
    }

    /**
     * Resolves a username login. A syntactically impossible username simply matches nothing rather
     * than reporting a validation error, so probing the login endpoint cannot be used to learn the
     * username rules or distinguish "malformed" from "no such account".
     */
    private Optional<User> resolveByUsername(String rawUsername) {
        String canonical;
        try {
            canonical = UsernamePolicy.canonicalize(rawUsername);
        } catch (ApiException malformed) {
            return Optional.empty();
        }
        return users.findByUsername(canonical);
    }

    private ApiException invalidCredentials() {
        return new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "Invalid credentials.");
    }

    private String safeIp(String ip) {
        return (ip == null || ip.isBlank()) ? "unknown" : ip;
    }
}
