package com.fursadhub.verification.api;

import com.fursadhub.verification.application.VerificationQueryService;

public record StudentRowResponse(
        String studentUserId,
        String email,
        String enrollmentId,
        String departmentId,
        String studentNumber,
        String program,
        String academicYear,
        String verificationStatus) {

    public static StudentRowResponse from(VerificationQueryService.StudentRow row) {
        return new StudentRowResponse(
                row.enrollment().getStudentUserId().toString(),
                row.email(),
                row.enrollment().getId().toString(),
                row.enrollment().getDepartmentId().toString(),
                row.enrollment().getStudentNumber(),
                row.enrollment().getProgram(),
                row.enrollment().getAcademicYear(),
                row.enrollment().getVerificationStatus().name());
    }
}
