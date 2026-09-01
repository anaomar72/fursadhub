package com.fursadhub.verification.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The frozen student-verification state machine (CLAUDE.md section 30) as seen through the two
 * predicates every review service gates on: {@code isResolved()} and {@code isReviewable()}.
 *
 * <p>{@code StudentVerificationCase} deliberately does not enforce transition legality itself (see
 * its javadoc) — {@code VerificationReviewService} does, by asking these two questions. So these
 * predicates ARE the state machine, and a wrong answer here silently lets a resolved case be
 * re-reviewed no matter what the service does. Hence they are pinned directly.
 */
class StudentVerificationCaseTest {

    private static final UUID ENROLLMENT = UUID.randomUUID();
    private static final UUID REVIEWER = UUID.randomUUID();

    @Test
    void aNewCaseIsSubmittedAndReviewable() {
        // Never DRAFT: "not submitted yet" is represented by the enrollment simply having no case.
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);

        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.SUBMITTED);
        assertThat(verificationCase.isReviewable()).isTrue();
        assertThat(verificationCase.isResolved()).isFalse();
        assertThat(verificationCase.getEnrollmentId()).isEqualTo(ENROLLMENT);
        assertThat(verificationCase.getReviewedAt()).isNull();
    }

    @Test
    void aCaseUnderReviewIsStillReviewable() {
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);

        verificationCase.beginReview(REVIEWER);

        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.UNDER_REVIEW);
        assertThat(verificationCase.isReviewable()).isTrue();
        assertThat(verificationCase.isResolved()).isFalse();
        assertThat(verificationCase.getReviewedByUserId()).isEqualTo(REVIEWER);
    }

    @Test
    void aVerifiedCaseIsResolvedAndNoLongerReviewable() {
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);
        verificationCase.beginReview(REVIEWER);

        verificationCase.approve(REVIEWER);

        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.VERIFIED);
        assertThat(verificationCase.isResolved()).isTrue();
        assertThat(verificationCase.isReviewable()).isFalse();
        assertThat(verificationCase.getReviewedAt()).isNotNull();
    }

    @Test
    void aRejectedCaseIsResolvedAndNoLongerReviewable() {
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);

        verificationCase.reject(REVIEWER, "Student number not on file.");

        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.REJECTED);
        assertThat(verificationCase.isResolved()).isTrue();
        assertThat(verificationCase.isReviewable()).isFalse();
        assertThat(verificationCase.getReviewNotes()).isEqualTo("Student number not on file.");
    }

    @Test
    void aRevokedCaseIsResolvedAndNoLongerReviewable() {
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);
        verificationCase.approve(REVIEWER);

        verificationCase.revoke(REVIEWER, "Enrollment ended.");

        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.REVOKED);
        assertThat(verificationCase.isResolved()).isTrue();
        assertThat(verificationCase.isReviewable()).isFalse();
    }

    /**
     * The one status that is neither resolved nor reviewable. It is the student's move next, so
     * staff review actions must be refused (INVALID_TRANSITION, not ALREADY_RESOLVED) while
     * resubmission stays open.
     */
    @Test
    void needsMoreEvidenceIsNeitherResolvedNorReviewable() {
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);
        verificationCase.beginReview(REVIEWER);

        verificationCase.requestMoreEvidence(REVIEWER, "Upload a clearer student card.");

        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.NEEDS_MORE_EVIDENCE);
        assertThat(verificationCase.isResolved()).isFalse();
        assertThat(verificationCase.isReviewable()).isFalse();
    }

    @Test
    void resubmittingReopensACaseThatNeededMoreEvidence() {
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);
        verificationCase.requestMoreEvidence(REVIEWER, "Upload a clearer student card.");

        verificationCase.resubmit();

        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.SUBMITTED);
        assertThat(verificationCase.isReviewable()).isTrue();
    }

    /** Escalation changes who may act, never the frozen status (CLAUDE.md section 30). */
    @Test
    void escalationIsIdempotentAndLeavesTheStatusUntouched() {
        StudentVerificationCase verificationCase = StudentVerificationCase.submit(ENROLLMENT);
        UUID firstEscalator = UUID.randomUUID();
        UUID secondEscalator = UUID.randomUUID();

        verificationCase.escalate(firstEscalator, "Cannot confirm identity.");
        var firstEscalatedAt = verificationCase.getEscalatedAt();
        verificationCase.escalate(secondEscalator, "Trying again.");

        assertThat(verificationCase.isEscalated()).isTrue();
        assertThat(verificationCase.getEscalatedAt()).isEqualTo(firstEscalatedAt);
        assertThat(verificationCase.getEscalatedByUserId()).isEqualTo(firstEscalator);
        assertThat(verificationCase.getEscalationReason()).isEqualTo("Cannot confirm identity.");
        assertThat(verificationCase.getStatus()).isEqualTo(StudentVerificationStatus.SUBMITTED);
    }
}
