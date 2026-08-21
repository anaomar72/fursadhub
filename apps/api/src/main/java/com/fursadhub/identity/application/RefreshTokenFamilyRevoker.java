package com.fursadhub.identity.application;

import com.fursadhub.identity.domain.RefreshToken;
import com.fursadhub.identity.domain.RefreshTokenRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Revokes every active member of a refresh-token family when replay is detected. Runs in its own
 * transaction (REQUIRES_NEW): {@link RefreshTokenService#refresh} always throws after calling
 * this on the reuse path, and since Spring rolls back the whole enclosing transaction when a
 * RuntimeException propagates out of a {@code @Transactional} method, the revocation itself would
 * otherwise be undone right along with the rejected request — exactly the family it needs to kill
 * (CLAUDE.md section 18).
 */
@Component
public class RefreshTokenFamilyRevoker {

    private final RefreshTokenRepository refreshTokens;

    public RefreshTokenFamilyRevoker(RefreshTokenRepository refreshTokens) {
        this.refreshTokens = refreshTokens;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamily(UUID familyId) {
        for (RefreshToken token : refreshTokens.findActiveByFamilyId(familyId)) {
            token.revoke();
            refreshTokens.save(token);
        }
    }
}
