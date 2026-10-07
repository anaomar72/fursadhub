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

    /**
     * Ends the login session the presented cookie belongs to — its whole token family, not only the
     * presented token. Idempotent: a missing, unknown or already-ended cookie is not an error.
     *
     * <p>Revoking only the presented token left a race open. Another tab of the same browser can be
     * refreshing at the moment of logout: if the refresh is processed first it rotates the presented
     * token into a successor, the logout then finds the presented token already revoked and did
     * nothing, and the successor — possibly re-set in the browser by the refresh response arriving
     * after the logout's cookie clear — stayed valid for its full lifetime. The family is exactly one
     * login session (rotation continues it, CLAUDE.md section 18), so ending all of it is precisely
     * what "log out of this session" means, and leaves every other session of the user untouched.
     */
    @Transactional
    public void logout(String rawRefreshToken, String ip, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String hash = tokenGenerator.hash(rawRefreshToken);
        refreshTokens.findByTokenHashForUpdate(hash).ifPresent(presented -> {
            boolean revokedAny = false;
            if (!presented.isRevoked()) {
                presented.revoke();
                refreshTokens.save(presented);
                revokedAny = true;
            }
            for (RefreshToken successor : refreshTokens.findActiveByFamilyId(presented.getFamilyId())) {
                successor.revoke();
                refreshTokens.save(successor);
                revokedAny = true;
            }
            if (revokedAny) {
                audit.record("LOGOUT", presented.getUserId(), ip, userAgent, null);
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
