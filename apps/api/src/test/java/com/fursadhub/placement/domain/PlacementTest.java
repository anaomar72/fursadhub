package com.fursadhub.placement.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The frozen placement state machine (CLAUDE.md section 39).
 *
 * <p>These are pure domain tests: no Spring, no database. They exist because the transition table is
 * the thing that makes CANCELLED and TERMINATED genuinely different states rather than two labels
 * for the same idea, and because the terminal states must be provably terminal.
 */
class PlacementTest {

    private Placement planned() {
        return Placement.planFromAcceptedOffer(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now().plusMonths(1), LocalDate.now().plusMonths(4), "Mogadishu");
    }

    private Placement active() {
        Placement placement = planned();
        placement.start();
        return placement;
    }

    // ---------------------------------------------------------------- creation

    @Test
    void acceptedOfferProducesPlannedPlacement() {
        Placement placement = planned();

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.PLANNED);
        assertThat(placement.isLive()).isTrue();
        assertThat(placement.isTerminal()).isFalse();
        assertThat(placement.getStartedAt()).isNull();
    }

    // ---------------------------------------------------------------- happy paths

    @Test
    void plannedPlacementStartsAndStampsStartedAt() {
        Placement placement = planned();

        placement.start();

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.ACTIVE);
        assertThat(placement.getStartedAt()).isNotNull();
        assertThat(placement.isLive()).isTrue();
    }

    @Test
    void activePlacementRunsThroughCompletionPendingToCompleted() {
        Placement placement = active();

        placement.requestCompletion();
        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.COMPLETION_PENDING);
        assertThat(placement.getCompletionRequestedAt()).isNotNull();
        assertThat(placement.isLive()).isTrue();

        placement.complete();
        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.COMPLETED);
        assertThat(placement.getCompletedAt()).isNotNull();
        // A completed placement no longer occupies the student.
        assertThat(placement.isLive()).isFalse();
        assertThat(placement.isTerminal()).isTrue();
    }

    // ---------------------------------------------------------------- cancel vs terminate

    @Test
    void plannedPlacementCanBeCancelledWithReason() {
        Placement placement = planned();

        placement.cancel("Organization withdrew the position.");

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.CANCELLED);
        assertThat(placement.getCancelledAt()).isNotNull();
        assertThat(placement.getCancellationReason()).isEqualTo("Organization withdrew the position.");
        assertThat(placement.isLive()).isFalse();
    }

    /** The core distinction: a placement that has begun ended early — it was not "never started". */
    @Test
    void activePlacementCannotBeCancelled() {
        Placement placement = active();

        assertThatThrownBy(() -> placement.cancel("changed our mind"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("cannot move to that state");

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.ACTIVE);
    }

    /** And the mirror image: a placement that never started cannot be "terminated". */
    @Test
    void plannedPlacementCannotBeTerminated() {
        Placement placement = planned();

        assertThatThrownBy(() -> placement.terminate("dropped out"))
                .isInstanceOf(ApiException.class);

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.PLANNED);
    }

    @Test
    void activePlacementCanBeTerminated() {
        Placement placement = active();

        placement.terminate("Student withdrew in week 3.");

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.TERMINATED);
        assertThat(placement.getTerminatedAt()).isNotNull();
        assertThat(placement.getTerminationReason()).isEqualTo("Student withdrew in week 3.");
        assertThat(placement.isLive()).isFalse();
    }

    @Test
    void completionPendingPlacementCanStillBeTerminated() {
        Placement placement = active();
        placement.requestCompletion();

        placement.terminate("Requirements were never met.");

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.TERMINATED);
    }

    // ---------------------------------------------------------------- terminal states

    @Test
    void completedPlacementAcceptsNothingFurther() {
        Placement placement = active();
        placement.requestCompletion();
        placement.complete();

        assertThatThrownBy(placement::start).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> placement.terminate("x")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> placement.cancel("x")).isInstanceOf(ApiException.class);
        assertThatThrownBy(placement::requestCompletion).isInstanceOf(ApiException.class);

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.COMPLETED);
    }

    @Test
    void cancelledPlacementCannotBeRevived() {
        Placement placement = planned();
        placement.cancel("never started");

        assertThatThrownBy(placement::start).isInstanceOf(ApiException.class);

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.CANCELLED);
        assertThat(placement.isTerminal()).isTrue();
    }

    @Test
    void terminatedPlacementCannotBeRevivedOrCompleted() {
        Placement placement = active();
        placement.terminate("ended early");

        assertThatThrownBy(placement::start).isInstanceOf(ApiException.class);
        assertThatThrownBy(placement::requestCompletion).isInstanceOf(ApiException.class);
        assertThatThrownBy(placement::complete).isInstanceOf(ApiException.class);

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.TERMINATED);
    }

    /** COMPLETED is reachable only through COMPLETION_PENDING — never straight from ACTIVE. */
    @Test
    void activePlacementCannotJumpStraightToCompleted() {
        Placement placement = active();

        assertThatThrownBy(placement::complete).isInstanceOf(ApiException.class);

        assertThat(placement.getStatus()).isEqualTo(PlacementStatus.ACTIVE);
    }

    @Test
    void invalidTransitionUsesStableErrorCode() {
        Placement placement = planned();

        assertThatThrownBy(placement::complete)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("PLACEMENT_INVALID_TRANSITION");
    }
}
