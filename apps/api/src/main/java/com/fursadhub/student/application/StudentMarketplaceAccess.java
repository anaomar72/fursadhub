package com.fursadhub.student.application;

import com.fursadhub.administration.domain.PlatformAdminRepository;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.student.domain.StudentProfileRepository;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

/** Current database authority for Student marketplace actions, including mixed-profile accounts. */
@Service
public class StudentMarketplaceAccess {
    private final StudentProfileRepository profiles;
    private final StudentEnrollmentRepository enrollments;
    private final OrganizationMembershipRepository organizations;
    private final UniversityMembershipRepository universities;
    private final PlatformAdminRepository platformAdmins;

    public StudentMarketplaceAccess(StudentProfileRepository profiles, StudentEnrollmentRepository enrollments,
            OrganizationMembershipRepository organizations, UniversityMembershipRepository universities,
            PlatformAdminRepository platformAdmins) {
        this.profiles = profiles;
        this.enrollments = enrollments;
        this.organizations = organizations;
        this.universities = universities;
        this.platformAdmins = platformAdmins;
    }

    /**
     * Whether this account is acting as a marketplace STUDENT right now.
     *
     * <p>Being a student is evidenced by EITHER a student profile OR a student enrollment. Both
     * matter, because the profile is optional: {@code StudentEnrollmentService} never creates or
     * requires one, so a student can enrol and be VERIFIED without ever filling it in. Keying this
     * on the profile alone told a verified student "Only students can apply for or save
     * internships" and silently hid Apply/Save from them — which contradicts the product's own
     * eligibility model, where {@code applyBlocker} lists verification, availability and deadline
     * but never a profile.
     *
     * <p>The exclusions are the actual point of this check and are unchanged: a current
     * organization, university or platform grant means the caller is staff, and staff never act as
     * marketplace students even if student records remain on the account.
     *
     * <p>This decides only whether the caller is a student. Whether that student may apply to a
     * particular opportunity stays with the existing eligibility rules, and saving still requires a
     * profile through {@code SavedOpportunityService}'s own pre-existing 404.
     */
    @Transactional(readOnly = true)
    public boolean canAct(UUID userId) {
        boolean isStudent = profiles.findByUserId(userId).isPresent() || enrollments.existsByStudentUserId(userId);
        return isStudent
                && organizations.findActiveByUserId(userId).isEmpty()
                && universities.findActiveByUserId(userId).isEmpty()
                && platformAdmins.findActiveByUserId(userId).isEmpty();
    }

    public void requireStudent(UUID userId) {
        if (!canAct(userId)) {
            throw new ApiException("STUDENT_ACTION_REQUIRED", HttpStatus.FORBIDDEN,
                    "Only students can apply for or save internships.");
        }
    }
}
