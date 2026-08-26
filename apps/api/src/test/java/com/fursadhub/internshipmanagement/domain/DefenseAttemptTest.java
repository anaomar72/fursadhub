package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The frozen defense-attempt state machine (CLAUDE.md section 46). */
class DefenseAttemptTest {

    private static final UUID PLACEMENT = UUID.randomUUID();
    private static final UUID STAFF = UUID.randomUUID();

    private DefenseAttempt scheduled(int attemptNumber) {
        return DefenseAttempt.schedule(
                PLACEMENT, attemptNumber, Instant.parse("2026-06-01T09:00:00Z"), "Main hall", STAFF);
    }

    @Test
    void aScheduledAttemptCarriesNoResult() {
        DefenseAttempt attempt = scheduled(1);

        assertThat(attempt.getState()).isEqualTo(DefenseAttemptState.SCHEDULED);
        assertThat(attempt.getResult()).isNull();
        assertThat(attempt.isOpen()).isTrue();
        assertThat(attempt.countsTowardsCompletion()).isFalse();
    }

    @Test
    void aPassedAttemptSatisfiesTheDefenseRequirement() {
        DefenseAttempt attempt = scheduled(1);

        attempt.recordResult(DefenseResult.PASSED, "Confident defence.", STAFF);

        assertThat(attempt.getState()).isEqualTo(DefenseAttemptState.COMPLETED);
        assertThat(attempt.getCompletedAt()).isNotNull();
        assertThat(attempt.countsTowardsCompletion()).isTrue();
    }

    @Test
    void failedAndRetakeRequiredDoNotSatisfyTheRequirement() {
        DefenseAttempt failed = scheduled(1);
        failed.recordResult(DefenseResult.FAILED, null, STAFF);
        assertThat(failed.countsTowardsCompletion()).isFalse();

        DefenseAttempt retake = scheduled(2);
        retake.recordResult(DefenseResult.RETAKE_REQUIRED, null, STAFF);
        assertThat(retake.countsTowardsCompletion()).isFalse();
    }

    @Test
    void aRetakeRequiredAttemptIsCompletedNotReopened() {
        DefenseAttempt attempt = scheduled(1);
        attempt.recordResult(DefenseResult.RETAKE_REQUIRED, "Resit the methodology section.", STAFF);

        // The university schedules a NEW attempt; this one is finished and stays as recorded.
        assertThat(attempt.getState()).isEqualTo(DefenseAttemptState.COMPLETED);
        assertThat(attempt.isOpen()).isFalse();
        assertThatThrownBy(() -> attempt.recordResult(DefenseResult.PASSED, "Actually passed.", STAFF))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "DEFENSE_INVALID_TRANSITION");
        assertThat(attempt.getResult()).isEqualTo(DefenseResult.RETAKE_REQUIRED);
        assertThat(attempt.getPanelNotes()).isEqualTo("Resit the methodology section.");
    }

    @Test
    void aScheduledAttemptCanBeCancelledAndCarriesNoResult() {
        DefenseAttempt attempt = scheduled(1);

        attempt.cancel();

        assertThat(attempt.getState()).isEqualTo(DefenseAttemptState.CANCELLED);
        assertThat(attempt.getCancelledAt()).isNotNull();
        assertThat(attempt.getResult()).isNull();
        assertThat(attempt.countsTowardsCompletion()).isFalse();
    }

    @Test
    void aCompletedAttemptCannotBeCancelled() {
        DefenseAttempt attempt = scheduled(1);
        attempt.recordResult(DefenseResult.PASSED, null, STAFF);

        assertThatThrownBy(attempt::cancel).isInstanceOf(ApiException.class);
    }

    @Test
    void aCancelledAttemptCannotLaterBeGivenAResult() {
        DefenseAttempt attempt = scheduled(1);
        attempt.cancel();

        assertThatThrownBy(() -> attempt.recordResult(DefenseResult.PASSED, null, STAFF))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void onlyPassedIsASuccessfulResult() {
        assertThat(DefenseResult.PASSED.isSuccessful()).isTrue();
        assertThat(DefenseResult.FAILED.isSuccessful()).isFalse();
        assertThat(DefenseResult.RETAKE_REQUIRED.isSuccessful()).isFalse();
    }
}
