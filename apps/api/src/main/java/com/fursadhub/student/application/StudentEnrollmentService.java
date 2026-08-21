package com.fursadhub.student.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.university.domain.DepartmentRepository;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.verification.domain.StudentVerificationStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Self-service claim/update of the caller's own enrollment (CLAUDE.md section 12 — never accepts
 * another student's id). Submitting/reviewing verification for a claimed enrollment is handled by
 * the {@code verification} module, which keeps {@code StudentEnrollment.verificationStatus} in
 * sync as its own case transitions (see {@code StudentEnrollment} javadoc).
 */
@Service
public class StudentEnrollmentService {

    private final StudentEnrollmentRepository enrollments;
    private final UniversityRepository universities;
    private final DepartmentRepository departments;
    private final AuditService audit;

    public StudentEnrollmentService(
            StudentEnrollmentRepository enrollments, UniversityRepository universities, DepartmentRepository departments, AuditService audit) {
        this.enrollments = enrollments;
        this.universities = universities;
        this.departments = departments;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public StudentEnrollment getMyEnrollment(UUID studentUserId) {
        return enrollments.findByStudentUserId(studentUserId)
                .orElseThrow(this::notFound);
    }

    @Transactional
    public StudentEnrollment claim(
            UUID studentUserId, UUID universityId, UUID departmentId, String studentNumber, String program, String academicYear,
            String ipAddress, String userAgent) {
        if (enrollments.existsByStudentUserId(studentUserId)) {
            throw new ApiException("STUDENT_ENROLLMENT_ALREADY_EXISTS", HttpStatus.CONFLICT, "You already have an enrollment on file. Use update instead.");
        }
        validateUniversityAndDepartment(universityId, departmentId);
        if (enrollments.existsByUniversityIdAndStudentNumber(universityId, studentNumber)) {
            throw new ApiException("STUDENT_NUMBER_ALREADY_REGISTERED", HttpStatus.CONFLICT, "This student number is already registered at this university.");
        }

        StudentEnrollment enrollment = StudentEnrollment.claim(studentUserId, universityId, departmentId, studentNumber, program, academicYear);
        enrollments.save(enrollment);

        audit.record("STUDENT_ENROLLMENT_CLAIMED", studentUserId, ipAddress, userAgent, "enrollmentId=" + enrollment.getId());
        return enrollment;
    }

    @Transactional
    public StudentEnrollment update(
            UUID studentUserId, UUID universityId, UUID departmentId, String studentNumber, String program, String academicYear,
            String ipAddress, String userAgent) {
        StudentEnrollment enrollment = getMyEnrollment(studentUserId);
        if (enrollment.getVerificationStatus() != StudentVerificationStatus.DRAFT
                && enrollment.getVerificationStatus() != StudentVerificationStatus.NEEDS_MORE_EVIDENCE) {
            throw new ApiException("STUDENT_ENROLLMENT_LOCKED", HttpStatus.CONFLICT, "This enrollment cannot be edited while a verification case is active.");
        }

        validateUniversityAndDepartment(universityId, departmentId);
        boolean identityChanged = !enrollment.getUniversityId().equals(universityId) || !enrollment.getStudentNumber().equals(studentNumber);
        if (identityChanged && enrollments.existsByUniversityIdAndStudentNumber(universityId, studentNumber)) {
            throw new ApiException("STUDENT_NUMBER_ALREADY_REGISTERED", HttpStatus.CONFLICT, "This student number is already registered at this university.");
        }

        enrollment.updateClaim(universityId, departmentId, studentNumber, program, academicYear);
        enrollments.save(enrollment);

        audit.record("STUDENT_ENROLLMENT_UPDATED", studentUserId, ipAddress, userAgent, "enrollmentId=" + enrollment.getId());
        return enrollment;
    }

    private void validateUniversityAndDepartment(UUID universityId, UUID departmentId) {
        universities.findById(universityId)
                .orElseThrow(() -> new ApiException("UNIVERSITY_NOT_FOUND", HttpStatus.NOT_FOUND, "University not found."));
        if (!departments.existsByIdAndUniversityId(departmentId, universityId)) {
            throw new ApiException("DEPARTMENT_NOT_IN_UNIVERSITY", HttpStatus.BAD_REQUEST, "This department does not belong to the selected university.");
        }
    }

    private ApiException notFound() {
        return new ApiException("STUDENT_ENROLLMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "No enrollment claimed yet.");
    }
}
