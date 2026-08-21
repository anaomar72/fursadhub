package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipDepartment;
import com.fursadhub.university.domain.UniversityMembershipDepartmentRepository;
import com.fursadhub.university.domain.UniversityRole;
import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import com.fursadhub.verification.domain.StudentVerificationStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Read side for university staff: the student roster and the verification-case queue, both scoped
 * to the caller's membership (whole university for admins, assigned departments only for
 * coordinators — CLAUDE.md section 25).
 */
@Service
@Transactional(readOnly = true)
public class VerificationQueryService {

    private final StudentVerificationCaseRepository cases;
    private final StudentEnrollmentRepository enrollments;
    private final UniversityAuthorization universityAuthorization;
    private final UniversityMembershipDepartmentRepository membershipDepartments;
    private final UserRepository users;

    public VerificationQueryService(
            StudentVerificationCaseRepository cases,
            StudentEnrollmentRepository enrollments,
            UniversityAuthorization universityAuthorization,
            UniversityMembershipDepartmentRepository membershipDepartments,
            UserRepository users) {
        this.cases = cases;
        this.enrollments = enrollments;
        this.universityAuthorization = universityAuthorization;
        this.membershipDepartments = membershipDepartments;
        this.users = users;
    }

    public record StudentRow(StudentEnrollment enrollment, String email) {
    }

    public record CaseRow(StudentVerificationCase verificationCase, StudentEnrollment enrollment, String email) {
    }

    /** Self-service: the caller's own case, so they can see reviewer notes (e.g. NEEDS_MORE_EVIDENCE). */
    public Optional<StudentVerificationCase> myCase(UUID studentUserId) {
        return enrollments.findByStudentUserId(studentUserId).flatMap(e -> cases.findByEnrollmentId(e.getId()));
    }

    public List<StudentRow> listStudents(UUID staffUserId, UUID universityId, UUID departmentIdFilter) {
        List<StudentEnrollment> scoped = scopedEnrollments(staffUserId, universityId, departmentIdFilter);
        return scoped.stream().map(e -> new StudentRow(e, emailOf(e.getStudentUserId()))).toList();
    }

    public List<CaseRow> queue(UUID staffUserId, UUID universityId, StudentVerificationStatus statusFilter) {
        List<StudentEnrollment> scoped = scopedEnrollments(staffUserId, universityId, null);
        Map<UUID, StudentEnrollment> byId = scoped.stream()
                .collect(java.util.stream.Collectors.toMap(StudentEnrollment::getId, e -> e));

        List<UUID> enrollmentIds = scoped.stream().map(StudentEnrollment::getId).toList();
        return cases.findByEnrollmentIdIn(enrollmentIds).stream()
                .filter(c -> statusFilter == null || c.getStatus() == statusFilter)
                .map(c -> {
                    StudentEnrollment enrollment = byId.get(c.getEnrollmentId());
                    return new CaseRow(c, enrollment, emailOf(enrollment.getStudentUserId()));
                })
                .toList();
    }

    public CaseRow caseDetail(UUID staffUserId, UUID universityId, UUID caseId) {
        StudentVerificationCase verificationCase = cases.findById(caseId)
                .orElseThrow(() -> new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND, "Verification case not found."));
        StudentEnrollment enrollment = enrollments.findById(verificationCase.getEnrollmentId())
                .orElseThrow(() -> new IllegalStateException("Verification case references a missing enrollment"));
        if (!enrollment.getUniversityId().equals(universityId)) {
            throw accessDenied();
        }
        UniversityMembership membership = universityAuthorization.requireMembership(
                staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);
        universityAuthorization.requireDepartmentScope(membership, enrollment.getDepartmentId());

        return new CaseRow(verificationCase, enrollment, emailOf(enrollment.getStudentUserId()));
    }

    private List<StudentEnrollment> scopedEnrollments(UUID staffUserId, UUID universityId, UUID departmentIdFilter) {
        UniversityMembership membership = universityAuthorization.requireMembership(
                staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);

        if (membership.getRole() == UniversityRole.UNIVERSITY_ADMIN) {
            return departmentIdFilter != null
                    ? enrollments.findByUniversityIdAndDepartmentId(universityId, departmentIdFilter)
                    : enrollments.findByUniversityId(universityId);
        }

        List<UUID> assignedDepartmentIds = membershipDepartments.findActiveByMembershipId(membership.getId()).stream()
                .map(UniversityMembershipDepartment::getDepartmentId)
                .toList();
        if (departmentIdFilter != null) {
            universityAuthorization.requireDepartmentScope(membership, departmentIdFilter);
            return enrollments.findByUniversityIdAndDepartmentId(universityId, departmentIdFilter);
        }
        return assignedDepartmentIds.stream()
                .flatMap(deptId -> enrollments.findByUniversityIdAndDepartmentId(universityId, deptId).stream())
                .toList();
    }

    private String emailOf(UUID userId) {
        return users.findById(userId).map(User::getEmail).orElse(null);
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
