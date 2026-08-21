package com.fursadhub.identity.infrastructure.persistence;

import com.fursadhub.identity.domain.EmailVerificationToken;
import com.fursadhub.identity.domain.EmailVerificationTokenRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
class EmailVerificationTokenRepositoryAdapter implements EmailVerificationTokenRepository {

    private final JpaEmailVerificationTokenRepository jpaRepository;

    EmailVerificationTokenRepositoryAdapter(JpaEmailVerificationTokenRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public EmailVerificationToken save(EmailVerificationToken token) {
        return jpaRepository.save(token);
    }

    @Override
    public Optional<EmailVerificationToken> findByTokenHash(String tokenHash) {
        return jpaRepository.findByTokenHash(tokenHash);
    }
}
