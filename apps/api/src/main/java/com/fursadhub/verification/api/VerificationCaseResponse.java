package com.fursadhub.verification.api;

import com.fursadhub.verification.application.VerificationQueryService;
import com.fursadhub.verification.domain.StudentVerificationCase;

public record VerificationCaseResponse(
        String id,
        String enrollmentId,
        String status,
        String reviewNotes,
        String submittedAt,
        String reviewedAt,
        String studentEmail,
        String universityId,
        String departmentId,
        String studentNumber,
        String program,
        String academicYear) {

    public static VerificationCaseResponse from(StudentVerificationCase c) {
        return new VerificationCaseResponse(
                c.getId().toString(), c.getEnrollmentId().toString(), c.getStatus().name(), c.getReviewNotes(),
                c.getSubmittedAt() == null ? null : c.getSubmittedAt().toString(),
                c.getReviewedAt() == null ? null : c.getReviewedAt().toString(),
                null, null, null, null, null, null);
    }

    public static VerificationCaseResponse from(VerificationQueryService.CaseRow row) {
        StudentVerificationCase c = row.verificationCase();
        return new VerificationCaseResponse(
                c.getId().toString(), c.getEnrollmentId().toString(), c.getStatus().name(), c.getReviewNotes(),
                c.getSubmittedAt() == null ? null : c.getSubmittedAt().toString(),
                c.getReviewedAt() == null ? null : c.getReviewedAt().toString(),
                row.email(),
                row.enrollment().getUniversityId().toString(),
                row.enrollment().getDepartmentId().toString(),
                row.enrollment().getStudentNumber(),
                row.enrollment().getProgram(),
                row.enrollment().getAcademicYear());
    }
}
