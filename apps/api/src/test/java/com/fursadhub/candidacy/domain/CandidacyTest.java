package com.fursadhub.candidacy.domain;

import com.fursadhub.common.api.ApiException;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * The frozen candidacy state machine and source-merge rules (CLAUDE.md sections 36/37), tested
 * directly on the domain object — no Spring context or database needed, because these are pure
 * business invariants.
 */
class CandidacyTest {

    private Candidacy candidacy(CandidacySource source) {
        return Candidacy.open(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), source);
    }

    @Test
    void newCandidacyStartsSubmitted() {
        assertThat(candidacy(CandidacySource.SELF_APPLICATION).getStatus()).isEqualTo(CandidacyStatus.SUBMITTED);
    }

    @Test
    void interviewStageIsOptionalAndStagesMayBeSkipped() {
        Candidacy skipped = candidacy(CandidacySource.SELF_APPLICATION);
        assertThatCode(() -> {
            skipped.shortlist();
            skipped.markOffered();
        }).doesNotThrowAnyException();
        assertThat(skipped.getStatus()).isEqualTo(CandidacyStatus.OFFERED);
    }

    @Test
    void submittedMayBeRejectedDirectly() {
        Candidacy candidacy = candidacy(CandidacySource.SELF_APPLICATION);
        candidacy.reject();
        assertThat(candidacy.getStatus()).isEqualTo(CandidacyStatus.REJECTED);
    }

    @Test
    void backwardsTransitionIsRejected() {
        Candidacy candidacy = candidacy(CandidacySource.SELF_APPLICATION);
        candidacy.shortlist();

        assertThatThrownBy(candidacy::markUnderReview)
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "CANDIDACY_INVALID_TRANSITION");
    }

    @Test
    void acceptedIsTerminalAndCannotBeWithdrawn() {
        Candidacy candidacy = candidacy(CandidacySource.SELF_APPLICATION);
        candidacy.markOffered();
        candidacy.markOfferAccepted();

        assertThat(candidacy.isClosed()).isTrue();
        assertThatThrownBy(candidacy::withdraw)
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "CANDIDACY_INVALID_TRANSITION");
    }

    @Test
    void rejectedAndWithdrawnAreTerminal() {
        Candidacy rejected = candidacy(CandidacySource.SELF_APPLICATION);
        rejected.reject();
        assertThat(rejected.isClosed()).isTrue();

        Candidacy withdrawn = candidacy(CandidacySource.SELF_APPLICATION);
        withdrawn.withdraw();
        assertThat(withdrawn.isClosed()).isTrue();
    }

    @Test
    void anExpiredOfferReturnsCandidateToThePool() {
        Candidacy candidacy = candidacy(CandidacySource.SELF_APPLICATION);
        candidacy.markOffered();
        candidacy.markOfferExpired();

        assertThat(candidacy.isClosed()).isFalse();
        assertThatCode(candidacy::markOffered).doesNotThrowAnyException();
    }

    @Test
    void selfApplicationMergedWithNominationBecomesBoth() {
        Candidacy candidacy = candidacy(CandidacySource.SELF_APPLICATION);

        assertThat(candidacy.mergeSource(CandidacySource.UNIVERSITY_NOMINATION)).isTrue();
        assertThat(candidacy.getSource()).isEqualTo(CandidacySource.BOTH);
    }

    @Test
    void nominationMergedWithSelfApplicationBecomesBoth() {
        Candidacy candidacy = candidacy(CandidacySource.UNIVERSITY_NOMINATION);

        assertThat(candidacy.mergeSource(CandidacySource.SELF_APPLICATION)).isTrue();
        assertThat(candidacy.getSource()).isEqualTo(CandidacySource.BOTH);
    }

    /** Repeating the same route must be a no-op, which is what keeps retries idempotent. */
    @Test
    void mergingTheSameSourceTwiceChangesNothing() {
        Candidacy candidacy = candidacy(CandidacySource.SELF_APPLICATION);

        assertThat(candidacy.mergeSource(CandidacySource.SELF_APPLICATION)).isFalse();
        assertThat(candidacy.getSource()).isEqualTo(CandidacySource.SELF_APPLICATION);
    }

    @Test
    void mergingIntoBothStaysBoth() {
        Candidacy candidacy = candidacy(CandidacySource.SELF_APPLICATION);
        candidacy.mergeSource(CandidacySource.UNIVERSITY_NOMINATION);

        assertThat(candidacy.mergeSource(CandidacySource.UNIVERSITY_NOMINATION)).isFalse();
        assertThat(candidacy.getSource()).isEqualTo(CandidacySource.BOTH);
    }
}
