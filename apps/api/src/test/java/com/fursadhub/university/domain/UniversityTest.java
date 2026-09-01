package com.fursadhub.university.domain;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The frozen institution-verification state machine as it applies to universities (CLAUDE.md
 * section 31), plus the one rule that is specific to them: no submission without evidence.
 */
class UniversityTest {

    private University newDraft() {
        return University.register(
                "Jamhuriya University", "jamhuriya-university", "Mogadishu", "REG-1",
                "https://jamhuriya.test", "About us");
    }

    private University draftWithEvidence() {
        University university = newDraft();
        university.attachEvidence(UUID.randomUUID());
        return university;
    }

    @Test
    void newUniversityStartsAsDraftAndUnverified() {
        University university = newDraft();

        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.DRAFT);
        assertThat(university.isVerified()).isFalse();
        assertThat(university.getEvidenceStoredFileId()).isNull();
        assertThat(university.getVerifiedAt()).isNull();
    }

    @Test
    void cannotSubmitWithoutEvidence() {
        University university = newDraft();

        assertThatThrownBy(university::submitForVerification)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("UNIVERSITY_VERIFICATION_EVIDENCE_REQUIRED");
        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.DRAFT);
    }

    @Test
    void fullVerificationHappyPathReachesVerified() {
        University university = draftWithEvidence();

        university.submitForVerification();
        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.SUBMITTED);

        university.markUnderReview();
        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.UNDER_REVIEW);

        university.verify();
        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.VERIFIED);
        assertThat(university.isVerified()).isTrue();
        assertThat(university.getVerifiedAt()).isNotNull();
    }

    @Test
    void cannotVerifyBeforeSubmission() {
        University university = draftWithEvidence();

        assertThatThrownBy(university::verify)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("UNIVERSITY_VERIFICATION_INVALID_TRANSITION");
    }

    @Test
    void cannotSubmitTwiceInARow() {
        University university = draftWithEvidence();
        university.submitForVerification();

        assertThatThrownBy(university::submitForVerification)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("UNIVERSITY_VERIFICATION_INVALID_TRANSITION");
    }

    @Test
    void needsChangesAllowsResubmission() {
        University university = draftWithEvidence();
        university.submitForVerification();
        university.markUnderReview();
        university.requestChanges();

        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.NEEDS_CHANGES);

        university.submitForVerification();
        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.SUBMITTED);
    }

    @Test
    void requestChangesRequiresAnActiveReview() {
        University university = draftWithEvidence();
        university.submitForVerification();

        assertThatThrownBy(university::requestChanges)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("UNIVERSITY_VERIFICATION_INVALID_TRANSITION");
    }

    @Test
    void suspendedUniversityIsNoLongerVerifiedAndCanBeRevoked() {
        University university = draftWithEvidence();
        university.submitForVerification();
        university.verify();

        university.suspend();
        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.SUSPENDED);
        assertThat(university.isVerified()).isFalse();

        university.revoke();
        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.REVOKED);
        assertThat(university.isVerified()).isFalse();
    }

    @Test
    void rejectedUniversityCannotBeSuspended() {
        University university = draftWithEvidence();
        university.submitForVerification();
        university.reject();

        assertThat(university.getStatus()).isEqualTo(InstitutionVerificationStatus.REJECTED);
        assertThatThrownBy(university::suspend)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("UNIVERSITY_VERIFICATION_INVALID_TRANSITION");
    }

    @Test
    void replacingEvidenceMovesThePointer() {
        University university = newDraft();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();

        university.attachEvidence(first);
        assertThat(university.getEvidenceStoredFileId()).isEqualTo(first);
        assertThat(university.getEvidenceUploadedAt()).isNotNull();

        university.attachEvidence(second);
        assertThat(university.getEvidenceStoredFileId()).isEqualTo(second);
    }
}
