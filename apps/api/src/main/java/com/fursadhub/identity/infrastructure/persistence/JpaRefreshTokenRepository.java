package com.fursadhub.identity.infrastructure.persistence;

import com.fursadhub.identity.domain.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface JpaRefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from RefreshToken t where t.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash);

    @Query("select t from RefreshToken t where t.familyId = :familyId and t.revokedAt is null")
    List<RefreshToken> findActiveByFamilyId(UUID familyId);

    @Query("select t from RefreshToken t where t.userId = :userId and t.revokedAt is null")
    List<RefreshToken> findActiveByUserId(UUID userId);
}
