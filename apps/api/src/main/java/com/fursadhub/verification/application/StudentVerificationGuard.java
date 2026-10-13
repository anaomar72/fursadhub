package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * The two rules every student-verification decision path shares, whether a university reviewer or
 * a platform officer is acting (CLAUDE.md sections 27-30).
 *
 * <ul>
 *   <li><strong>No self-review.</strong> Nobody decides, binds or revokes the verification of their
 *       own enrollment. Holding a reviewing role at the same university as one's own enrollment is
 *       legitimate (staff can also be students); acting on one's own case is not.</li>
 *   <li><strong>Only a VERIFIED university can make a student VERIFIED.</strong> Universities
 *       self-register, so an institution the platform has not attested to — or has since suspended,
 *       rejected or revoked — must not be able to mint verified students. A claim at such a
 *       university may still be recorded and reviewed; it simply cannot be approved.</li>
 * </ul>
 */
@Component
public class StudentVerificationGuard {

    private final UniversityRepository universities;

    public StudentVerificationGuard(UniversityRepository universities) {
        this.universities = universities;
    }

    public void requireNotSelf(UUID actingUserId, StudentEnrollment enrollment) {
        if (enrollment.getStudentUserId().equals(actingUserId)) {
            throw new ApiException("VERIFICATION_SELF_REVIEW_FORBIDDEN", HttpStatus.FORBIDDEN,
                    "You cannot act on the verification of your own enrollment.");
        }
    }

    public void requireUniversityVerifiedForApproval(StudentEnrollment enrollment) {
        boolean verified = universities.findById(enrollment.getUniversityId())
                .map(University::isVerified)
                .orElse(false);
        if (!verified) {
            throw new ApiException("UNIVERSITY_NOT_VERIFIED", HttpStatus.CONFLICT,
                    "Student enrollments can only be verified once the university itself is verified.");
        }
    }
}
