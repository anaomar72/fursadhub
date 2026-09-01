package com.fursadhub.organization.domain;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrganizationTest {

    /** A DRAFT organization with its license already attached — the state submission is allowed from. */
    private Organization newDraft() {
        Organization organization = newRegistration();
        organization.attachEvidence(UUID.randomUUID());
        return organization;
    }

    /** Straight out of registration: no license yet. */
    private Organization newRegistration() {
        return Organization.create("Acme Ltd", "acme-ltd", OrganizationType.COMPANY, "REG-1", "https://acme.test", "About us");
    }

    @Test
    void newOrganizationStartsAsDraftAndUnverified() {
        Organization organization = newRegistration();

        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.DRAFT);
        assertThat(organization.isVerified()).isFalse();
        assertThat(organization.getEvidenceStoredFileId()).isNull();
    }

    @Test
    void cannotSubmitWithoutEvidence() {
        Organization organization = newRegistration();

        assertThatThrownBy(organization::submitForVerification)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("ORGANIZATION_VERIFICATION_EVIDENCE_REQUIRED");
        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.DRAFT);
    }

    @Test
    void attachingEvidenceUnblocksSubmission() {
        Organization organization = newRegistration();
        UUID storedFileId = UUID.randomUUID();

        organization.attachEvidence(storedFileId);

        assertThat(organization.getEvidenceStoredFileId()).isEqualTo(storedFileId);
        assertThat(organization.getEvidenceUploadedAt()).isNotNull();

        organization.submitForVerification();
        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.SUBMITTED);
    }

    /**
     * The missing-license answer must win over the invalid-transition one: telling a freshly
     * registered organization its state is wrong would send it looking for a problem it does not have.
     */
    @Test
    void theEvidenceRuleIsReportedBeforeTheStateRule() {
        Organization organization = newDraft();
        organization.submitForVerification();
        organization.attachEvidence(null);

        assertThatThrownBy(organization::submitForVerification)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("ORGANIZATION_VERIFICATION_EVIDENCE_REQUIRED");
    }

    @Test
    void fullVerificationHappyPathReachesVerified() {
        Organization organization = newDraft();

        organization.submitForVerification();
        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.SUBMITTED);

        organization.markUnderReview();
        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.UNDER_REVIEW);

        organization.verify();
        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.VERIFIED);
        assertThat(organization.isVerified()).isTrue();
        assertThat(organization.getVerifiedAt()).isNotNull();
    }

    @Test
    void cannotVerifyBeforeSubmission() {
        Organization organization = newDraft();

        assertThatThrownBy(organization::verify)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("ORGANIZATION_VERIFICATION_INVALID_TRANSITION");
    }

    @Test
    void cannotSubmitTwiceInARow() {
        Organization organization = newDraft();
        organization.submitForVerification();

        assertThatThrownBy(organization::submitForVerification)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode())
                .isEqualTo("ORGANIZATION_VERIFICATION_INVALID_TRANSITION");
    }

    @Test
    void needsChangesAllowsResubmission() {
        Organization organization = newDraft();
        organization.submitForVerification();
        organization.markUnderReview();
        organization.requestChanges();

        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.NEEDS_CHANGES);

        organization.submitForVerification();
        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.SUBMITTED);
    }

    @Test
    void revokedOrganizationIsNoLongerVerified() {
        Organization organization = newDraft();
        organization.submitForVerification();
        organization.markUnderReview();
        organization.verify();

        organization.revoke();

        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.REVOKED);
        assertThat(organization.isVerified()).isFalse();
    }
}
