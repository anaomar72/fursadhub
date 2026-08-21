package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.config.AuthProperties;
import com.fursadhub.common.ratelimit.InMemoryRateLimiter;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
public class ResendVerificationService {

    private static final int MAX_ATTEMPTS_PER_WINDOW = 5;
    private static final Duration WINDOW = Duration.ofHours(1);
    private static final int COOLDOWN_ATTEMPTS = 1;

    private final UserRepository users;
    private final IssueEmailVerificationTokenService verificationTokenIssuer;
    private final InMemoryRateLimiter rateLimiter;
    private final AuthProperties authProperties;

    public ResendVerificationService(
            UserRepository users,
            IssueEmailVerificationTokenService verificationTokenIssuer,
            InMemoryRateLimiter rateLimiter,
            AuthProperties authProperties) {
        this.users = users;
        this.verificationTokenIssuer = verificationTokenIssuer;
        this.rateLimiter = rateLimiter;
        this.authProperties = authProperties;
    }

    /** Always completes without revealing whether the email is registered or already verified. */
    @Transactional
    public void resend(String rawEmail) {
        String email = EmailNormalizer.normalize(rawEmail);

        if (!rateLimiter.tryConsume("resend-verification-cooldown:" + email, COOLDOWN_ATTEMPTS, authProperties.emailVerificationResendCooldown())) {
            throw new ApiException("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another code.");
        }
        if (!rateLimiter.tryConsume("resend-verification:" + email, MAX_ATTEMPTS_PER_WINDOW, WINDOW)) {
            throw new ApiException("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, "Too many verification emails requested. Please try again later.");
        }

        users.findByEmail(email)
                .filter(user -> !user.isEmailVerified())
                .ifPresent(verificationTokenIssuer::issueAndSend);
    }
}
