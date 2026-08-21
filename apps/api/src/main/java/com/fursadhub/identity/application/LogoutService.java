package com.fursadhub.identity.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.RefreshToken;
import com.fursadhub.identity.domain.RefreshTokenRepository;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class LogoutService {

    private final RefreshTokenRepository refreshTokens;
    private final OpaqueTokenGenerator tokenGenerator;
    private final AuditService audit;

    public LogoutService(RefreshTokenRepository refreshTokens, OpaqueTokenGenerator tokenGenerator, AuditService audit) {
        this.refreshTokens = refreshTokens;
        this.tokenGenerator = tokenGenerator;
        this.audit = audit;
    }

    /** Idempotent — a missing/already-revoked cookie is not an error, logout always "succeeds". */
    @Transactional
    public void logout(String rawRefreshToken, String ip, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String hash = tokenGenerator.hash(rawRefreshToken);
        refreshTokens.findByTokenHashForUpdate(hash).ifPresent(token -> {
            if (!token.isRevoked()) {
                token.revoke();
                refreshTokens.save(token);
                audit.record("LOGOUT", token.getUserId(), ip, userAgent, null);
            }
        });
    }

    @Transactional
    public void logoutAll(UUID userId, String ip, String userAgent) {
        for (RefreshToken token : refreshTokens.findActiveByUserId(userId)) {
            token.revoke();
            refreshTokens.save(token);
        }
        audit.record("LOGOUT_ALL", userId, ip, userAgent, null);
    }
}
