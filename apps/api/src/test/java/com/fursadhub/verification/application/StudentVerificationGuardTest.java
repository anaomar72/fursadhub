package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StudentVerificationGuardTest {

    private final UniversityRepository universities = mock(UniversityRepository.class);
    private final StudentVerificationGuard guard = new StudentVerificationGuard(universities);

    private final UUID studentUserId = UUID.randomUUID();

    private StudentEnrollment enrollmentAt(University university) {
        return StudentEnrollment.claim(studentUserId, university.getId(), UUID.randomUUID(), "SN-1", "BSc", "2025/2026");
    }

    private University draftUniversity() {
        University university = University.register("Test University", "test-university", "Mogadishu", null, null, null);
        when(universities.findById(university.getId())).thenReturn(Optional.of(university));
        return university;
    }

    private University verifiedUniversity() {
        University university = draftUniversity();
        university.attachEvidence(UUID.randomUUID());
        university.submitForVerification();
        university.verify();
        return university;
    }

    @Test
    void theStudentThemselvesIsRefused() {
        StudentEnrollment enrollment = enrollmentAt(verifiedUniversity());

        assertThatThrownBy(() -> guard.requireNotSelf(studentUserId, enrollment))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getCode()).isEqualTo("VERIFICATION_SELF_REVIEW_FORBIDDEN"));
    }

    @Test
    void anyoneElsePassesTheSelfCheck() {
        StudentEnrollment enrollment = enrollmentAt(verifiedUniversity());

        assertThatCode(() -> guard.requireNotSelf(UUID.randomUUID(), enrollment)).doesNotThrowAnyException();
    }

    @Test
    void approvalIsAllowedAtAVerifiedUniversity() {
        StudentEnrollment enrollment = enrollmentAt(verifiedUniversity());

        assertThatCode(() -> guard.requireUniversityVerifiedForApproval(enrollment)).doesNotThrowAnyException();
    }

    @Test
    void approvalIsRefusedAtAnUnverifiedUniversity() {
        StudentEnrollment enrollment = enrollmentAt(draftUniversity());

        assertThatThrownBy(() -> guard.requireUniversityVerifiedForApproval(enrollment))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getCode()).isEqualTo("UNIVERSITY_NOT_VERIFIED"));
    }

    @Test
    void approvalIsRefusedAtASuspendedUniversity() {
        University university = verifiedUniversity();
        university.suspend();
        StudentEnrollment enrollment = enrollmentAt(university);

        assertThatThrownBy(() -> guard.requireUniversityVerifiedForApproval(enrollment))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getCode()).isEqualTo("UNIVERSITY_NOT_VERIFIED"));
    }

    @Test
    void approvalFailsClosedWhenTheUniversityCannotBeFound() {
        StudentEnrollment enrollment = StudentEnrollment.claim(
                studentUserId, UUID.randomUUID(), UUID.randomUUID(), "SN-1", "BSc", "2025/2026");
        when(universities.findById(enrollment.getUniversityId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> guard.requireUniversityVerifiedForApproval(enrollment))
                .isInstanceOf(ApiException.class);
    }
}
