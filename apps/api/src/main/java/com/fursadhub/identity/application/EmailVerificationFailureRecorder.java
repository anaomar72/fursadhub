package com.fursadhub.identity.application;

import com.fursadhub.identity.domain.EmailVerificationToken;
import com.fursadhub.identity.domain.EmailVerificationTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Records a failed verification attempt in its own transaction. {@link VerifyEmailService#verify}
 * always ends a mismatched-code request by throwing an {@code ApiException}, which rolls back its
 * enclosing {@code @Transactional} method — without {@code REQUIRES_NEW} here, the incremented
 * failed-attempt count would roll back right along with it, silently defeating the max-attempts
 * cap (mirrors why {@code AuditService.record} uses the same propagation).
 */
@Service
public class EmailVerificationFailureRecorder {

    private final EmailVerificationTokenRepository tokens;

    public EmailVerificationFailureRecorder(EmailVerificationTokenRepository tokens) {
        this.tokens = tokens;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int recordFailedAttempt(UUID userId) {
        EmailVerificationToken challenge = tokens.findActiveByUserId(userId).orElseThrow();
        challenge.registerFailedAttempt();
        tokens.save(challenge);
        return challenge.getFailedAttempts();
    }
}
