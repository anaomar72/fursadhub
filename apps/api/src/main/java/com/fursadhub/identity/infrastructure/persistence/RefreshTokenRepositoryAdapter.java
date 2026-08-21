package com.fursadhub.identity.infrastructure.persistence;

import com.fursadhub.identity.domain.RefreshToken;
import com.fursadhub.identity.domain.RefreshTokenRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class RefreshTokenRepositoryAdapter implements RefreshTokenRepository {

    private final JpaRefreshTokenRepository jpaRepository;

    RefreshTokenRepositoryAdapter(JpaRefreshTokenRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public RefreshToken save(RefreshToken token) {
        return jpaRepository.save(token);
    }

    @Override
    public Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash) {
        return jpaRepository.findByTokenHashForUpdate(tokenHash);
    }

    @Override
    public List<RefreshToken> findActiveByFamilyId(UUID familyId) {
        return jpaRepository.findActiveByFamilyId(familyId);
    }

    @Override
    public List<RefreshToken> findActiveByUserId(UUID userId) {
        return jpaRepository.findActiveByUserId(userId);
    }
}
