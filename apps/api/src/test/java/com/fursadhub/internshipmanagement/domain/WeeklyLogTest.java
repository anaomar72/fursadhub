package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The frozen weekly-log state machine (CLAUDE.md section 42), tested directly on the entity so the
 * rules are proven independently of any controller, service or database.
 */
class WeeklyLogTest {

    private static final UUID PLACEMENT = UUID.randomUUID();
    private static final UUID REVIEWER = UUID.randomUUID();

    private WeeklyLog draft() {
        return WeeklyLog.createDraft(PLACEMENT, 1, LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 8),
                "Summary", "Activities", "Challenges", "Outcomes");
    }

    @Test
    void newLogStartsAsAnEditableDraft() {
        WeeklyLog log = draft();

        assertThat(log.getState()).isEqualTo(WeeklyLogState.DRAFT);
        assertThat(log.isEditable()).isTrue();
        assertThat(log.getSubmittedAt()).isNull();
    }

    @Test
    void draftCanBeSubmitted() {
        WeeklyLog log = draft();

        log.submit();

        assertThat(log.getState()).isEqualTo(WeeklyLogState.SUBMITTED);
        assertThat(log.getSubmittedAt()).isNotNull();
    }

    @Test
    void submittedLogCanBeReturnedForChangesAndResubmitted() {
        WeeklyLog log = draft();
        log.submit();

        log.returnForChanges(REVIEWER, "Add more detail on what you built.");
        assertThat(log.getState()).isEqualTo(WeeklyLogState.RETURNED_FOR_CHANGES);
        assertThat(log.getReviewComment()).isEqualTo("Add more detail on what you built.");
        assertThat(log.isEditable()).isTrue();

        log.edit("Revised summary", null, null, null);
        log.submit();
        assertThat(log.getState()).isEqualTo(WeeklyLogState.SUBMITTED);
        assertThat(log.getSummary()).isEqualTo("Revised summary");
    }

    @Test
    void submittedLogCanBeReviewed() {
        WeeklyLog log = draft();
        log.submit();

        log.review(REVIEWER, "Good work.");

        assertThat(log.getState()).isEqualTo(WeeklyLogState.REVIEWED);
        assertThat(log.getReviewedBy()).isEqualTo(REVIEWER);
        assertThat(log.getReviewedAt()).isNotNull();
        assertThat(log.countsTowardsCompletion()).isTrue();
    }

    @Test
    void aReviewedLogIsFinishedAndAcceptsNothingFurther() {
        WeeklyLog log = draft();
        log.submit();
        log.review(REVIEWER, "Good work.");

        // REVIEWED is absent from the transition table, so every outgoing move is refused rather
        // than merely discouraged.
        assertThatThrownBy(log::submit).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> log.returnForChanges(REVIEWER, "Actually, no."))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> log.edit("Sneaky rewrite", null, null, null))
                .isInstanceOf(ApiException.class);
        assertThat(log.getSummary()).isEqualTo("Summary");
    }

    @Test
    void aDraftCannotBeReviewedWithoutBeingSubmitted() {
        WeeklyLog log = draft();

        assertThatThrownBy(() -> log.review(REVIEWER, "Looks fine."))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "WEEKLY_LOG_INVALID_TRANSITION");
    }

    @Test
    void aSubmittedLogIsNoLongerEditableByTheStudent() {
        WeeklyLog log = draft();
        log.submit();

        assertThat(log.isEditable()).isFalse();
        assertThatThrownBy(() -> log.edit("Changed after submitting", null, null, null))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void onlyAReviewedLogCountsTowardsCompletion() {
        WeeklyLog log = draft();
        assertThat(log.countsTowardsCompletion()).isFalse();

        log.submit();
        assertThat(log.countsTowardsCompletion()).isFalse();

        log.returnForChanges(REVIEWER, "Needs work.");
        assertThat(log.countsTowardsCompletion()).isFalse();
    }
}
