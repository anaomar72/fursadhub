package com.fursadhub.identity.infrastructure.persistence;

import com.fursadhub.identity.domain.PasswordResetToken;
import com.fursadhub.identity.domain.PasswordResetTokenRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
class PasswordResetTokenRepositoryAdapter implements PasswordResetTokenRepository {

    private final JpaPasswordResetTokenRepository jpaRepository;

    PasswordResetTokenRepositoryAdapter(JpaPasswordResetTokenRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public PasswordResetToken save(PasswordResetToken token) {
        return jpaRepository.save(token);
    }

    @Override
    public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
        return jpaRepository.findByTokenHash(tokenHash);
    }
}
