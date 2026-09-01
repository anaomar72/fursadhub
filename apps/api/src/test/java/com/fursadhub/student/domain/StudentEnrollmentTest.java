package com.fursadhub.student.domain;

import com.fursadhub.verification.domain.StudentVerificationStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The claimed enrollment and its cached verification status (CLAUDE.md section 27-28).
 *
 * <p>{@code isVerified()} is the gate every downstream eligibility check reads — an unverified
 * student may not apply and may not be nominated (CLAUDE.md section 60) — so it is pinned here
 * against the whole frozen status enum rather than only the happy path.
 */
class StudentEnrollmentTest {

    private static final UUID STUDENT = UUID.randomUUID();
    private static final UUID UNIVERSITY = UUID.randomUUID();
    private static final UUID DEPARTMENT = UUID.randomUUID();

    private StudentEnrollment claimed() {
        return StudentEnrollment.claim(STUDENT, UNIVERSITY, DEPARTMENT, "SN-001", "BSc Computer Science", "2025/2026");
    }

    @Test
    void aNewlyClaimedEnrollmentIsDraftAndNotVerified() {
        // Claiming an enrollment is not verifying it: email verification and enrollment
        // verification are different concepts (CLAUDE.md section 13/27).
        StudentEnrollment enrollment = claimed();

        assertThat(enrollment.getVerificationStatus()).isEqualTo(StudentVerificationStatus.DRAFT);
        assertThat(enrollment.isVerified()).isFalse();
        assertThat(enrollment.getStudentUserId()).isEqualTo(STUDENT);
        assertThat(enrollment.getUniversityId()).isEqualTo(UNIVERSITY);
        assertThat(enrollment.getDepartmentId()).isEqualTo(DEPARTMENT);
        assertThat(enrollment.getStudentNumber()).isEqualTo("SN-001");
    }

    @ParameterizedTest
    @EnumSource(StudentVerificationStatus.class)
    void onlyTheVerifiedStatusCountsAsVerified(StudentVerificationStatus status) {
        StudentEnrollment enrollment = claimed();

        enrollment.syncVerificationStatus(status);

        assertThat(enrollment.isVerified()).isEqualTo(status == StudentVerificationStatus.VERIFIED);
    }

    @Test
    void aRevokedEnrollmentStopsCountingAsVerified() {
        // Revocation must actually close the gate again, not leave a stale verified cache behind.
        StudentEnrollment enrollment = claimed();
        enrollment.syncVerificationStatus(StudentVerificationStatus.VERIFIED);
        assertThat(enrollment.isVerified()).isTrue();

        enrollment.syncVerificationStatus(StudentVerificationStatus.REVOKED);

        assertThat(enrollment.isVerified()).isFalse();
    }

    @Test
    void updatingTheClaimReplacesTheIdentityFieldsAndTouchesUpdatedAt() {
        StudentEnrollment enrollment = claimed();
        UUID otherUniversity = UUID.randomUUID();
        UUID otherDepartment = UUID.randomUUID();

        enrollment.updateClaim(otherUniversity, otherDepartment, "SN-002", "BBA", "2026/2027");

        assertThat(enrollment.getUniversityId()).isEqualTo(otherUniversity);
        assertThat(enrollment.getDepartmentId()).isEqualTo(otherDepartment);
        assertThat(enrollment.getStudentNumber()).isEqualTo("SN-002");
        assertThat(enrollment.getProgram()).isEqualTo("BBA");
        assertThat(enrollment.getAcademicYear()).isEqualTo("2026/2027");
        assertThat(enrollment.getUpdatedAt()).isAfterOrEqualTo(enrollment.getCreatedAt());
    }

    /** Editing the claim must not quietly re-open or clear the verification decision. */
    @Test
    void updatingTheClaimDoesNotChangeTheVerificationStatus() {
        StudentEnrollment enrollment = claimed();
        enrollment.syncVerificationStatus(StudentVerificationStatus.NEEDS_MORE_EVIDENCE);

        enrollment.updateClaim(UNIVERSITY, DEPARTMENT, "SN-003", "BSc Computer Science", "2025/2026");

        assertThat(enrollment.getVerificationStatus()).isEqualTo(StudentVerificationStatus.NEEDS_MORE_EVIDENCE);
    }
}
