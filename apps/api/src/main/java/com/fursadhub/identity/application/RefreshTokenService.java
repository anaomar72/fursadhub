package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.common.config.AuthProperties;
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

import java.time.Instant;

/**
 * Rotates refresh tokens on every use and detects replay of an already-used/revoked token by
 * revoking the whole token family (CLAUDE.md sections 17-18). The lookup uses a pessimistic
 * row lock ({@link RefreshTokenRepository#findByTokenHashForUpdate}) so two concurrent refresh
 * calls with the same token cannot both succeed and mint duplicate sessions.
 */
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokens;
    private final UserRepository users;
    private final OpaqueTokenGenerator tokenGenerator;
    private final AccessTokenIssuer accessTokenIssuer;
    private final AuditService audit;
    private final AuthProperties authProperties;
    private final RefreshTokenFamilyRevoker familyRevoker;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokens,
            UserRepository users,
            OpaqueTokenGenerator tokenGenerator,
            AccessTokenIssuer accessTokenIssuer,
            AuditService audit,
            AuthProperties authProperties,
            RefreshTokenFamilyRevoker familyRevoker) {
        this.refreshTokens = refreshTokens;
        this.users = users;
        this.tokenGenerator = tokenGenerator;
        this.accessTokenIssuer = accessTokenIssuer;
        this.audit = audit;
        this.authProperties = authProperties;
        this.familyRevoker = familyRevoker;
    }

    public record RefreshResult(String accessToken, long expiresInSeconds, String rawRefreshToken, Instant refreshExpiresAt) {
    }

    @Transactional
    public RefreshResult refresh(String rawRefreshToken, String ip, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw invalidToken();
        }

        String hash = tokenGenerator.hash(rawRefreshToken);
        RefreshToken token = refreshTokens.findByTokenHashForUpdate(hash).orElseThrow(this::invalidToken);

        if (token.isRevoked()) {
            familyRevoker.revokeFamily(token.getFamilyId());
            audit.record("REFRESH_TOKEN_REUSE_DETECTED", token.getUserId(), ip, userAgent, "family_id=" + token.getFamilyId());
            throw new ApiException(
                    "REFRESH_TOKEN_REUSE_DETECTED", HttpStatus.UNAUTHORIZED,
                    "This session was invalidated for security reasons. Please log in again.");
        }
        if (token.isExpired()) {
            throw invalidToken();
        }

        User user = users.findById(token.getUserId()).orElseThrow(this::invalidToken);
        if (user.getStatus() == UserStatus.SUSPENDED || user.getStatus() == UserStatus.CLOSED) {
            throw new ApiException("ACCOUNT_SUSPENDED", HttpStatus.FORBIDDEN, "This account cannot refresh a session.");
        }

        String rawNew = tokenGenerator.generate();
        Instant expiresAt = Instant.now().plus(authProperties.refreshTokenTtl());
        RefreshToken newToken = RefreshToken.continueFamily(
                user.getId(), tokenGenerator.hash(rawNew), token.getFamilyId(), expiresAt, userAgent, ip);
        refreshTokens.save(newToken);

        token.markUsedAndReplacedBy(newToken.getId());
        refreshTokens.save(token);

        AccessTokenIssuer.IssuedAccessToken accessToken = accessTokenIssuer.issueFor(user);

        return new RefreshResult(accessToken.token(), accessToken.expiresInSeconds(), rawNew, expiresAt);
    }

    private ApiException invalidToken() {
        return new ApiException("REFRESH_TOKEN_INVALID", HttpStatus.UNAUTHORIZED, "This session is no longer valid. Please log in again.");
    }
}
