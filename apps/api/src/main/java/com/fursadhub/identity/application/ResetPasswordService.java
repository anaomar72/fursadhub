package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.PasswordResetToken;
import com.fursadhub.identity.domain.PasswordResetTokenRepository;
import com.fursadhub.identity.domain.RefreshTokenRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResetPasswordService {

    private final PasswordResetTokenRepository tokens;
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final OpaqueTokenGenerator tokenGenerator;
    private final AuditService audit;

    public ResetPasswordService(
            PasswordResetTokenRepository tokens,
            UserRepository users,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder,
            OpaqueTokenGenerator tokenGenerator,
            AuditService audit) {
        this.tokens = tokens;
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.tokenGenerator = tokenGenerator;
        this.audit = audit;
    }

    /** Successful reset revokes every active refresh session (CLAUDE.md section 20) so stolen sessions die too. */
    @Transactional
    public void reset(String rawToken, String newPassword, String ip, String userAgent) {
        String hash = tokenGenerator.hash(rawToken);
        PasswordResetToken token = tokens.findByTokenHash(hash).orElseThrow(this::invalidToken);

        if (token.isConsumed()) {
            throw invalidToken();
        }
        if (token.isExpired()) {
            throw new ApiException("PASSWORD_RESET_TOKEN_EXPIRED", HttpStatus.BAD_REQUEST, "This password reset link has expired.");
        }

        User user = users.findById(token.getUserId())
                .orElseThrow(() -> new IllegalStateException("Password reset token references a missing user"));

        token.consume();
        tokens.save(token);

        user.changePasswordHash(passwordEncoder.encode(newPassword));
        users.save(user);

        refreshTokens.findActiveByUserId(user.getId()).forEach(t -> {
            t.revoke();
            refreshTokens.save(t);
        });

        audit.record("PASSWORD_RESET", user.getId(), ip, userAgent, null);
    }

    private ApiException invalidToken() {
        return new ApiException("PASSWORD_RESET_TOKEN_INVALID", HttpStatus.BAD_REQUEST, "This password reset link is invalid or has already been used.");
    }
}
