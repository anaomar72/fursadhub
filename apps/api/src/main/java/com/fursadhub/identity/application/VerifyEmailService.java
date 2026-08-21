package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.common.ratelimit.InMemoryRateLimiter;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.EmailVerificationToken;
import com.fursadhub.identity.domain.EmailVerificationTokenRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.infrastructure.EmailVerificationCodeHasher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;

/**
 * Verifies the 4-digit email code entered by the user (CLAUDE.md section 13). The code alone
 * cannot uniquely identify a challenge (only 10,000 possible values), so the request must also
 * carry the email — the lookup is always scoped to that user's single active challenge.
 */
@Service
public class VerifyEmailService {

    private static final int MAX_FAILED_ATTEMPTS = 5;

    private final EmailVerificationTokenRepository tokens;
    private final UserRepository users;
    private final EmailVerificationCodeHasher codeHasher;
    private final InMemoryRateLimiter rateLimiter;
    private final EmailVerificationFailureRecorder failureRecorder;
    private final AuditService audit;

    public VerifyEmailService(
            EmailVerificationTokenRepository tokens,
            UserRepository users,
            EmailVerificationCodeHasher codeHasher,
            InMemoryRateLimiter rateLimiter,
            EmailVerificationFailureRecorder failureRecorder,
            AuditService audit) {
        this.tokens = tokens;
        this.users = users;
        this.codeHasher = codeHasher;
        this.rateLimiter = rateLimiter;
        this.failureRecorder = failureRecorder;
        this.audit = audit;
    }

    @Transactional
    public void verify(String rawEmail, String rawCode, String ipAddress, String userAgent) {
        String email = EmailNormalizer.normalize(rawEmail);

        if (!rateLimiter.tryConsume("verify-email:" + email, 10, Duration.ofMinutes(15))) {
            throw new ApiException("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, "Too many verification attempts. Please try again later.");
        }

        User user = users.findByEmail(email).orElseThrow(this::invalidCode);
        EmailVerificationToken challenge = tokens.findActiveByUserId(user.getId()).orElseThrow(this::invalidCode);

        if (challenge.isExpired()) {
            throw new ApiException("EMAIL_VERIFICATION_CODE_EXPIRED", HttpStatus.BAD_REQUEST, "This verification code has expired.");
        }
        if (challenge.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            audit.record("EMAIL_VERIFICATION_CODE_LOCKED", user.getId(), ipAddress, userAgent, null);
            throw tooManyAttempts();
        }

        String expectedHash = codeHasher.hash(user.getId(), rawCode);
        if (!MessageDigest.isEqual(
                expectedHash.getBytes(StandardCharsets.UTF_8), challenge.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
            // Runs in its own transaction so the increment survives this method's own rollback
            // (it always ends by throwing below) — see EmailVerificationFailureRecorder's javadoc.
            failureRecorder.recordFailedAttempt(user.getId());
            throw invalidCode();
        }

        challenge.consume();
        tokens.save(challenge);
        user.markEmailVerified();
        users.save(user);

        audit.record("EMAIL_VERIFIED", user.getId(), ipAddress, userAgent, null);
    }

    private ApiException invalidCode() {
        return new ApiException("EMAIL_VERIFICATION_CODE_INVALID", HttpStatus.BAD_REQUEST, "This verification code is invalid or has already been used.");
    }

    private ApiException tooManyAttempts() {
        return new ApiException("EMAIL_VERIFICATION_CODE_LOCKED", HttpStatus.TOO_MANY_REQUESTS, "Too many incorrect attempts. Please request a new code.");
    }
}
