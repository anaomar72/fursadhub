package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.EmailVerificationToken;
import com.fursadhub.identity.domain.EmailVerificationTokenRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerifyEmailService {

    private final EmailVerificationTokenRepository tokens;
    private final UserRepository users;
    private final OpaqueTokenGenerator tokenGenerator;
    private final AuditService audit;

    public VerifyEmailService(
            EmailVerificationTokenRepository tokens, UserRepository users, OpaqueTokenGenerator tokenGenerator, AuditService audit) {
        this.tokens = tokens;
        this.users = users;
        this.tokenGenerator = tokenGenerator;
        this.audit = audit;
    }

    @Transactional
    public void verify(String rawToken) {
        String hash = tokenGenerator.hash(rawToken);
        EmailVerificationToken token = tokens.findByTokenHash(hash)
                .orElseThrow(() -> invalidToken());

        if (token.isConsumed()) {
            throw invalidToken();
        }
        if (token.isExpired()) {
            throw new ApiException("EMAIL_VERIFICATION_TOKEN_EXPIRED", HttpStatus.BAD_REQUEST, "This verification link has expired.");
        }

        token.consume();
        tokens.save(token);

        User user = users.findById(token.getUserId())
                .orElseThrow(() -> new IllegalStateException("Verification token references a missing user"));
        user.markEmailVerified();
        users.save(user);

        audit.record("EMAIL_VERIFIED", user.getId(), null, null, null);
    }

    private ApiException invalidToken() {
        return new ApiException("EMAIL_VERIFICATION_TOKEN_INVALID", HttpStatus.BAD_REQUEST, "This verification link is invalid or has already been used.");
    }
}
