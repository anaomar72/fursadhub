package com.fursadhub.verification.infrastructure.persistence;

import com.fursadhub.verification.domain.VerificationChallenge;
import com.fursadhub.verification.domain.VerificationChallengeRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
class VerificationChallengeRepositoryAdapter implements VerificationChallengeRepository {

    private final JpaVerificationChallengeRepository jpaRepository;

    VerificationChallengeRepositoryAdapter(JpaVerificationChallengeRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public VerificationChallenge save(VerificationChallenge challenge) {
        return jpaRepository.save(challenge);
    }

    @Override
    public Optional<VerificationChallenge> findByVerificationCaseIdAndCodeHash(UUID verificationCaseId, String codeHash) {
        return jpaRepository.findByVerificationCaseIdAndCodeHash(verificationCaseId, codeHash);
    }
}
