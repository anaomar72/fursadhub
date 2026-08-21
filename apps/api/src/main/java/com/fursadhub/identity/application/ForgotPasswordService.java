package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.config.AuthProperties;
import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.common.ratelimit.InMemoryRateLimiter;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.PasswordResetToken;
import com.fursadhub.identity.domain.PasswordResetTokenRepository;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.identity.infrastructure.IdentityEmailTemplates;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class ForgotPasswordService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final OpaqueTokenGenerator tokenGenerator;
    private final EmailOutboxService outbox;
    private final IdentityEmailTemplates templates;
    private final AuthProperties authProperties;
    private final InMemoryRateLimiter rateLimiter;

    public ForgotPasswordService(
            UserRepository users,
            PasswordResetTokenRepository tokens,
            OpaqueTokenGenerator tokenGenerator,
            EmailOutboxService outbox,
            IdentityEmailTemplates templates,
            AuthProperties authProperties,
            InMemoryRateLimiter rateLimiter) {
        this.users = users;
        this.tokens = tokens;
        this.tokenGenerator = tokenGenerator;
        this.outbox = outbox;
        this.templates = templates;
        this.authProperties = authProperties;
        this.rateLimiter = rateLimiter;
    }

    /** Always completes without revealing whether the email is registered (CLAUDE.md section 20). */
    @Transactional
    public void forgotPassword(String rawEmail) {
        String email = EmailNormalizer.normalize(rawEmail);
        if (!rateLimiter.tryConsume("forgot-password:" + email, MAX_ATTEMPTS, WINDOW)) {
            throw new ApiException("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, "Too many password reset requests. Please try again later.");
        }

        users.findByEmail(email)
                .filter(user -> user.getStatus() != UserStatus.CLOSED)
                .ifPresent(user -> {
                    String raw = tokenGenerator.generate();
                    Instant expiresAt = Instant.now().plus(authProperties.passwordResetTokenTtl());
                    tokens.save(new PasswordResetToken(UUID.randomUUID(), user.getId(), tokenGenerator.hash(raw), expiresAt));

                    IdentityEmailTemplates.RenderedEmail email1 = templates.passwordResetEmail(user.getPreferredLocale(), raw);
                    outbox.enqueue(user.getEmail(), email1.subject(), email1.body());
                });
    }
}
