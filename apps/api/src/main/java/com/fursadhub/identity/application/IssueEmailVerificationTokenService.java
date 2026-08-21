package com.fursadhub.identity.application;

import com.fursadhub.common.config.AuthProperties;
import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.identity.domain.EmailVerificationToken;
import com.fursadhub.identity.domain.EmailVerificationTokenRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.infrastructure.EmailVerificationCodeGenerator;
import com.fursadhub.identity.infrastructure.EmailVerificationCodeHasher;
import com.fursadhub.identity.infrastructure.IdentityEmailTemplates;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Shared by registration and resend-verification — issues a fresh 4-digit code and enqueues the
 * email. Any previously active (unconsumed) code for the user is invalidated first, so a resend
 * always supersedes an earlier code rather than leaving both valid (CLAUDE.md section 13).
 */
@Service
public class IssueEmailVerificationTokenService {

    private final EmailVerificationTokenRepository tokens;
    private final EmailVerificationCodeGenerator codeGenerator;
    private final EmailVerificationCodeHasher codeHasher;
    private final EmailOutboxService outbox;
    private final IdentityEmailTemplates templates;
    private final AuthProperties authProperties;

    public IssueEmailVerificationTokenService(
            EmailVerificationTokenRepository tokens,
            EmailVerificationCodeGenerator codeGenerator,
            EmailVerificationCodeHasher codeHasher,
            EmailOutboxService outbox,
            IdentityEmailTemplates templates,
            AuthProperties authProperties) {
        this.tokens = tokens;
        this.codeGenerator = codeGenerator;
        this.codeHasher = codeHasher;
        this.outbox = outbox;
        this.templates = templates;
        this.authProperties = authProperties;
    }

    @Transactional
    public void issueAndSend(User user) {
        tokens.deleteActiveForUser(user.getId());

        String code = codeGenerator.generate();
        String hash = codeHasher.hash(user.getId(), code);
        Instant expiresAt = Instant.now().plus(authProperties.emailVerificationTokenTtl());
        tokens.save(new EmailVerificationToken(UUID.randomUUID(), user.getId(), hash, expiresAt));

        IdentityEmailTemplates.RenderedEmail email = templates.verificationEmail(user.getPreferredLocale(), code);
        outbox.enqueue(user.getEmail(), email.subject(), email.body());
    }
}
