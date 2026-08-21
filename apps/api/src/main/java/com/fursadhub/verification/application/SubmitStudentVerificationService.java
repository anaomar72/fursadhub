package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import com.fursadhub.verification.domain.StudentVerificationStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Student-initiated first submission or NEEDS_MORE_EVIDENCE resubmission (CLAUDE.md section 29-30). */
@Service
public class SubmitStudentVerificationService {

    private final StudentEnrollmentRepository enrollments;
    private final StudentVerificationCaseRepository cases;
    private final AuditService audit;

    public SubmitStudentVerificationService(
            StudentEnrollmentRepository enrollments, StudentVerificationCaseRepository cases, AuditService audit) {
        this.enrollments = enrollments;
        this.cases = cases;
        this.audit = audit;
    }

    @Transactional
    public StudentVerificationCase submit(UUID studentUserId, String ipAddress, String userAgent) {
        StudentEnrollment enrollment = enrollments.findByStudentUserId(studentUserId)
                .orElseThrow(() -> new ApiException("STUDENT_ENROLLMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "No enrollment claimed yet."));

        StudentVerificationCase verificationCase = cases.findByEnrollmentId(enrollment.getId())
                .map(existing -> {
                    if (existing.getStatus() != StudentVerificationStatus.NEEDS_MORE_EVIDENCE) {
                        if (existing.isResolved()) {
                            throw new ApiException("VERIFICATION_CASE_ALREADY_RESOLVED", HttpStatus.CONFLICT, "This verification case has already been resolved.");
                        }
                        throw new ApiException("VERIFICATION_CASE_INVALID_TRANSITION", HttpStatus.CONFLICT, "A verification case is already in progress.");
                    }
                    existing.resubmit();
                    return existing;
                })
                .orElseGet(() -> StudentVerificationCase.submit(enrollment.getId()));
        cases.save(verificationCase);

        enrollment.syncVerificationStatus(verificationCase.getStatus());
        enrollments.save(enrollment);

        audit.record("STUDENT_VERIFICATION_SUBMITTED", studentUserId, ipAddress, userAgent, "caseId=" + verificationCase.getId());
        return verificationCase;
    }
}
