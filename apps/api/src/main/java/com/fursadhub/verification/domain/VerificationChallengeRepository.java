package com.fursadhub.verification.domain;

import java.util.Optional;
import java.util.UUID;

public interface VerificationChallengeRepository {

    VerificationChallenge save(VerificationChallenge challenge);

    Optional<VerificationChallenge> findByVerificationCaseIdAndCodeHash(UUID verificationCaseId, String codeHash);
}
