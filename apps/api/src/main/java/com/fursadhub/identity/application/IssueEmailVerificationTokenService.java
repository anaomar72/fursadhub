package com.fursadhub.identity.application;

import com.fursadhub.common.config.AuthProperties;
import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.identity.domain.EmailVerificationToken;
import com.fursadhub.identity.domain.EmailVerificationTokenRepository;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.infrastructure.IdentityEmailTemplates;
import com.fursadhub.identity.infrastructure.OpaqueTokenGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/** Shared by registration and resend-verification — issues a fresh token and enqueues the email. */
@Service
public class IssueEmailVerificationTokenService {

    private final EmailVerificationTokenRepository tokens;
    private final OpaqueTokenGenerator tokenGenerator;
    private final EmailOutboxService outbox;
    private final IdentityEmailTemplates templates;
    private final AuthProperties authProperties;

    public IssueEmailVerificationTokenService(
            EmailVerificationTokenRepository tokens,
            OpaqueTokenGenerator tokenGenerator,
            EmailOutboxService outbox,
            IdentityEmailTemplates templates,
            AuthProperties authProperties) {
        this.tokens = tokens;
        this.tokenGenerator = tokenGenerator;
        this.outbox = outbox;
        this.templates = templates;
        this.authProperties = authProperties;
    }

    @Transactional
    public void issueAndSend(User user) {
        String raw = tokenGenerator.generate();
        String hash = tokenGenerator.hash(raw);
        Instant expiresAt = Instant.now().plus(authProperties.emailVerificationTokenTtl());
        tokens.save(new EmailVerificationToken(UUID.randomUUID(), user.getId(), hash, expiresAt));

        IdentityEmailTemplates.RenderedEmail email = templates.verificationEmail(user.getPreferredLocale(), raw);
        outbox.enqueue(user.getEmail(), email.subject(), email.body());
    }
}
