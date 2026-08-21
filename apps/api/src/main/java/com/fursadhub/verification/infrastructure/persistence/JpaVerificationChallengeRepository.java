package com.fursadhub.verification.infrastructure.persistence;

import com.fursadhub.verification.domain.VerificationChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface JpaVerificationChallengeRepository extends JpaRepository<VerificationChallenge, UUID> {

    Optional<VerificationChallenge> findByVerificationCaseIdAndCodeHash(UUID verificationCaseId, String codeHash);
}
