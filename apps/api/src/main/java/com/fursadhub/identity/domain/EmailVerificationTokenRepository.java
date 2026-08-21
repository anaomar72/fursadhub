package com.fursadhub.identity.domain;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository {

    EmailVerificationToken save(EmailVerificationToken token);

    /** The caller's current (unconsumed) challenge, if any — at most one exists per user. */
    Optional<EmailVerificationToken> findActiveByUserId(UUID userId);

    /** Invalidates any existing unconsumed challenge for this user before a new one is issued. */
    void deleteActiveForUser(UUID userId);
}
