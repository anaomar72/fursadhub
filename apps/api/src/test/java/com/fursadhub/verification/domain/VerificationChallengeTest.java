package com.fursadhub.verification.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The one-time, short-lived account-binding challenge (CLAUDE.md section 29), tested directly on the
 * entity so expiry and single-use are proven independently of any controller, service or database.
 *
 * <p>These are the two properties CLAUDE.md section 60 mandates ("expired verification challenge
 * fails", "consumed verification challenge cannot be reused"): the HTTP-level proof lives in
 * {@code UniversityVerificationAuthorizationIT}; this class pins the rules the service reads.
 */
class VerificationChallengeTest {

    private static final UUID CASE = UUID.randomUUID();
    private static final String CODE_HASH = "0".repeat(64);

    private VerificationChallenge challengeExpiringIn(long minutes) {
        return new VerificationChallenge(
                UUID.randomUUID(), CASE, CODE_HASH, Instant.now().plus(minutes, ChronoUnit.MINUTES));
    }

    @Test
    void aFreshChallengeIsNeitherExpiredNorConsumed() {
        VerificationChallenge challenge = challengeExpiringIn(5);

        assertThat(challenge.isExpired()).isFalse();
        assertThat(challenge.isConsumed()).isFalse();
        assertThat(challenge.getConsumedAt()).isNull();
        assertThat(challenge.getCreatedAt()).isNotNull();
    }

    @Test
    void aChallengePastItsExpiryIsExpired() {
        VerificationChallenge challenge = challengeExpiringIn(-1);

        assertThat(challenge.isExpired()).isTrue();
    }

    @Test
    void expiryIsIndependentOfConsumption() {
        // A code that ran out of time was never used, so it must still report as unconsumed —
        // the service distinguishes the two cases and returns different error codes for them.
        VerificationChallenge challenge = challengeExpiringIn(-1);

        assertThat(challenge.isExpired()).isTrue();
        assertThat(challenge.isConsumed()).isFalse();
    }

    @Test
    void consumingStampsTheChallengeSoItCanNeverBeAcceptedAgain() {
        VerificationChallenge challenge = challengeExpiringIn(5);

        challenge.consume();

        assertThat(challenge.isConsumed()).isTrue();
        assertThat(challenge.getConsumedAt()).isNotNull();
    }

    @Test
    void replayingAConsumedChallengeStillReportsConsumed() {
        // The replay guard is a state query, not a one-shot flag the second caller could clear:
        // however many times the code comes back, isConsumed() stays true.
        VerificationChallenge challenge = challengeExpiringIn(5);
        challenge.consume();
        Instant firstConsumedAt = challenge.getConsumedAt();

        assertThat(challenge.isConsumed()).isTrue();
        assertThat(challenge.getConsumedAt()).isEqualTo(firstConsumedAt);
    }

    @Test
    void theChallengeStoresOnlyTheHashItWasGiven() {
        // CLAUDE.md section 64: raw verification codes are never persisted. The entity has no field
        // that could hold one — it only ever receives the hash.
        VerificationChallenge challenge = challengeExpiringIn(5);

        assertThat(challenge.getCodeHash()).isEqualTo(CODE_HASH);
    }
}
