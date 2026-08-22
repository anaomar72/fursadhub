package com.fursadhub.organization.domain;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrganizationTest {

    private Organization newDraft() {
        return Organization.create("Acme Ltd", "acme-ltd", OrganizationType.COMPANY, "REG-1", "https://acme.test", "About us");
    }

    @Test
    void newOrganizationStartsAsDraftAndUnverified() {
        Organization organization = newDraft();

        assertThat(organization.getVerificationStatus()).isEqualTo(InstitutionVerificationStatus.DRAFT);
        assertThat(organization.isVerified()).isFalse();
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
