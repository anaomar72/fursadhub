package com.fursadhub.administration.api;

import com.fursadhub.administration.application.AdminVerificationEscalationService.EscalatedCase;

import java.time.Instant;
import java.util.UUID;

/**
 * An escalated verification case with the enrollment context a platform reviewer needs.
 *
 * <p>Includes the claimed student number and program because that IS the thing under review. It does
 * not include the evidence document — that is fetched separately through its own audited route, so
 * merely listing the queue does not read every student's private evidence.
 */
public record EscalatedCaseResponse(
        UUID caseId,
        String status,
        UUID universityId,
        UUID departmentId,
        String studentEmail,
        String studentNumber,
        String program,
        String academicYear,
        boolean hasEvidence,
        Instant escalatedAt,
        String escalationReason,
        String reviewNotes,
        Instant submittedAt) {

    public static EscalatedCaseResponse from(EscalatedCase row) {
        return new EscalatedCaseResponse(
                row.verificationCase().getId(),
                row.verificationCase().getStatus().name(),
                row.enrollment().getUniversityId(),
                row.enrollment().getDepartmentId(),
                row.studentEmail(),
                row.enrollment().getStudentNumber(),
                row.enrollment().getProgram(),
                row.enrollment().getAcademicYear(),
                row.verificationCase().getEvidenceStoredFileId() != null,
                row.verificationCase().getEscalatedAt(),
                row.verificationCase().getEscalationReason(),
                row.verificationCase().getReviewNotes(),
                row.verificationCase().getSubmittedAt());
    }
}
