package com.fursadhub.verification.api;

import com.fursadhub.verification.application.VerificationQueryService;
import com.fursadhub.verification.domain.StudentVerificationCase;

/**
 * A verification case as the student or a scoped university reviewer sees it.
 *
 * <p>Phase 7 added {@code hasEvidence} and {@code escalatedAt}/{@code escalationReason}. Note that
 * {@code hasEvidence} is a BOOLEAN, not a file id: the document is fetched through its own audited
 * route on the owning case, and publishing a file id here would imply a generic file endpoint that
 * deliberately does not exist.
 */
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
        String academicYear,
        boolean hasEvidence,
        String escalatedAt,
        String escalationReason) {

    public static VerificationCaseResponse from(StudentVerificationCase c) {
        return new VerificationCaseResponse(
                c.getId().toString(), c.getEnrollmentId().toString(), c.getStatus().name(), c.getReviewNotes(),
                text(c.getSubmittedAt()),
                text(c.getReviewedAt()),
                null, null, null, null, null, null,
                c.getEvidenceStoredFileId() != null,
                text(c.getEscalatedAt()),
                c.getEscalationReason());
    }

    public static VerificationCaseResponse from(VerificationQueryService.CaseRow row) {
        StudentVerificationCase c = row.verificationCase();
        return new VerificationCaseResponse(
                c.getId().toString(), c.getEnrollmentId().toString(), c.getStatus().name(), c.getReviewNotes(),
                text(c.getSubmittedAt()),
                text(c.getReviewedAt()),
                row.email(),
                row.enrollment().getUniversityId().toString(),
                row.enrollment().getDepartmentId().toString(),
                row.enrollment().getStudentNumber(),
                row.enrollment().getProgram(),
                row.enrollment().getAcademicYear(),
                c.getEvidenceStoredFileId() != null,
                text(c.getEscalatedAt()),
                c.getEscalationReason());
    }

    private static String text(java.time.Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
