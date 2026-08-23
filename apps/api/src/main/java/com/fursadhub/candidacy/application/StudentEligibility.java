package com.fursadhub.candidacy.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.identity.domain.UserStatus;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The single place that answers "may this student take part in internship recruitment at all?"
 * (CLAUDE.md section 27).
 *
 * <p>Both entry routes into the pipeline — self-application and university nomination — run these
 * same checks, so an unverified or unavailable student can never slip in through whichever route
 * happens to be less guarded. Email verification and university-enrollment verification are
 * different things (CLAUDE.md section 13): an ACTIVE, email-verified account is necessary but not
 * sufficient; the enrollment itself must be VERIFIED.
 */
@Component
public class StudentEligibility {

    private final UserRepository users;
    private final StudentEnrollmentRepository enrollments;
    private final PlacementRepository placements;

    public StudentEligibility(UserRepository users, StudentEnrollmentRepository enrollments, PlacementRepository placements) {
        this.users = users;
        this.enrollments = enrollments;
        this.placements = placements;
    }

    /**
     * Resolves the student's VERIFIED enrollment, or throws the appropriate stable error code.
     * The returned enrollment is the source of the university/department snapshot recorded on the
     * candidacy — it is never taken from the request body.
     */
    @Transactional(readOnly = true)
    public StudentEnrollment requireVerifiedEnrollment(UUID studentUserId) {
        User user = users.findById(studentUserId)
                .orElseThrow(() -> new ApiException("STUDENT_NOT_VERIFIED", HttpStatus.FORBIDDEN,
                        "Your university enrollment must be verified before taking part in internships."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException("ACCOUNT_NOT_ACTIVE", HttpStatus.FORBIDDEN,
                    "Your account must be active to take part in internships.");
        }

        StudentEnrollment enrollment = enrollments.findByStudentUserId(studentUserId)
                .orElseThrow(() -> new ApiException("STUDENT_NOT_VERIFIED", HttpStatus.FORBIDDEN,
                        "Your university enrollment must be verified before taking part in internships."));
        if (!enrollment.isVerified()) {
            throw new ApiException("STUDENT_NOT_VERIFIED", HttpStatus.FORBIDDEN,
                    "Your university enrollment must be verified before taking part in internships.");
        }
        return enrollment;
    }

    /**
     * Availability is derived from placements rather than a stored flag (see V22): a student already
     * holding a live placement cannot enter a new pipeline or accept another offer.
     */
    @Transactional(readOnly = true)
    public void requireAvailable(UUID studentUserId) {
        if (placements.existsLiveByStudentUserId(studentUserId)) {
            throw new ApiException("STUDENT_NOT_AVAILABLE", HttpStatus.CONFLICT,
                    "This student already has an active internship placement.");
        }
    }
}
