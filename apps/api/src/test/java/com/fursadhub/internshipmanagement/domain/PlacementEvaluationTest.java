package com.fursadhub.internshipmanagement.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The frozen evaluation state machine and its rating validation (CLAUDE.md section 44). */
class PlacementEvaluationTest {

    private static final UUID PLACEMENT = UUID.randomUUID();
    private static final UUID SUPERVISOR = UUID.randomUUID();

    private PlacementEvaluation complete() {
        PlacementEvaluation evaluation = PlacementEvaluation.createDraft(PLACEMENT, SUPERVISOR);
        evaluation.edit((short) 5, (short) 4, (short) 4, (short) 5, (short) 4, (short) 5,
                "Reliable.", "More confidence.", "Strong intern.");
        return evaluation;
    }

    @Test
    void aDraftMayBeSavedWithPartialRatings() {
        PlacementEvaluation evaluation = PlacementEvaluation.createDraft(PLACEMENT, SUPERVISOR);

        evaluation.edit((short) 4, null, null, null, null, null, "Good start.", null, null);

        assertThat(evaluation.getState()).isEqualTo(EvaluationState.DRAFT);
        assertThat(evaluation.getProfessionalismRating()).isEqualTo((short) 4);
        assertThat(evaluation.getReliabilityRating()).isNull();
    }

    @Test
    void aPartialDraftCannotBeSubmitted() {
        PlacementEvaluation evaluation = PlacementEvaluation.createDraft(PLACEMENT, SUPERVISOR);
        evaluation.edit((short) 4, null, null, null, null, null, null, null, null);

        assertThatThrownBy(evaluation::submit)
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "EVALUATION_INCOMPLETE");
    }

    @Test
    void aCompleteDraftMovesThroughSubmittedToFinal() {
        PlacementEvaluation evaluation = complete();

        evaluation.submit();
        assertThat(evaluation.getState()).isEqualTo(EvaluationState.SUBMITTED);
        assertThat(evaluation.getSubmittedAt()).isNotNull();
        assertThat(evaluation.countsTowardsCompletion()).isFalse();

        evaluation.markFinal(SUPERVISOR);
        assertThat(evaluation.getState()).isEqualTo(EvaluationState.FINAL);
        assertThat(evaluation.getFinalizedBy()).isEqualTo(SUPERVISOR);
        assertThat(evaluation.getFinalizedAt()).isNotNull();
        assertThat(evaluation.countsTowardsCompletion()).isTrue();
    }

    @Test
    void aFinalEvaluationCannotBeEditedReopenedOrResubmitted() {
        PlacementEvaluation evaluation = complete();
        evaluation.submit();
        evaluation.markFinal(SUPERVISOR);

        assertThatThrownBy(() -> evaluation.edit((short) 1, (short) 1, (short) 1, (short) 1, (short) 1, (short) 1,
                "Rewritten.", null, null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(evaluation::submit).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> evaluation.markFinal(SUPERVISOR)).isInstanceOf(ApiException.class);

        assertThat(evaluation.getStrengths()).isEqualTo("Reliable.");
    }

    @Test
    void aSubmittedEvaluationIsNoLongerEditable() {
        PlacementEvaluation evaluation = complete();
        evaluation.submit();

        assertThatThrownBy(() -> evaluation.edit((short) 1, (short) 1, (short) 1, (short) 1, (short) 1, (short) 1,
                null, null, null))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "EVALUATION_INVALID_TRANSITION");
    }

    @Test
    void aDraftCannotSkipStraightToFinal() {
        PlacementEvaluation evaluation = complete();

        assertThatThrownBy(() -> evaluation.markFinal(SUPERVISOR))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "EVALUATION_INVALID_TRANSITION");
    }

    @Test
    void ratingsOutsideOneToFiveAreRejected() {
        PlacementEvaluation evaluation = PlacementEvaluation.createDraft(PLACEMENT, SUPERVISOR);

        assertThatThrownBy(() -> evaluation.edit((short) 0, null, null, null, null, null, null, null, null))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "VALIDATION_FAILED");
        assertThatThrownBy(() -> evaluation.edit((short) 6, null, null, null, null, null, null, null, null))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> evaluation.edit(null, null, null, null, null, (short) 99, null, null, null))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void theStudentSeesTheEvaluationOnlyOnceItIsFinal() {
        PlacementEvaluation evaluation = complete();
        assertThat(evaluation.isVisibleToStudent()).isFalse();

        evaluation.submit();
        assertThat(evaluation.isVisibleToStudent()).isFalse();

        evaluation.markFinal(SUPERVISOR);
        assertThat(evaluation.isVisibleToStudent()).isTrue();
    }
}
