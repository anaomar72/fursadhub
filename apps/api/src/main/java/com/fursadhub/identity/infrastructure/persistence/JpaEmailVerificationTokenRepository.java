package com.fursadhub.identity.infrastructure.persistence;

import com.fursadhub.identity.domain.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

interface JpaEmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {

    Optional<EmailVerificationToken> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(UUID userId);

    @Modifying
    @Query("delete from EmailVerificationToken t where t.userId = :userId and t.consumedAt is null")
    void deleteByUserIdAndConsumedAtIsNull(@Param("userId") UUID userId);
}
