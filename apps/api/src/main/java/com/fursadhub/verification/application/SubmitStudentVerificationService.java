package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.StoredFile;
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
    private final PrivateFileService files;

    public SubmitStudentVerificationService(
            StudentEnrollmentRepository enrollments, StudentVerificationCaseRepository cases, AuditService audit,
            PrivateFileService files) {
        this.enrollments = enrollments;
        this.cases = cases;
        this.audit = audit;
        this.files = files;
    }

    @Transactional
    public StudentVerificationCase submit(UUID studentUserId, String ipAddress, String userAgent) {
        StudentEnrollment enrollment = enrollments.findByStudentUserIdForUpdate(studentUserId)
                .orElseThrow(() -> new ApiException("STUDENT_ENROLLMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "No enrollment claimed yet."));

        StudentVerificationCase verificationCase = cases.findByEnrollmentId(enrollment.getId())
                .map(existing -> {
                    if (existing.getStatus() != StudentVerificationStatus.NEEDS_MORE_EVIDENCE) {
                        if (existing.isResolved()) {
                            throw new ApiException("VERIFICATION_CASE_ALREADY_RESOLVED", HttpStatus.CONFLICT, "This verification case has already been resolved.");
                        }
                        throw new ApiException("VERIFICATION_CASE_INVALID_TRANSITION", HttpStatus.CONFLICT, "A verification case is already in progress.");
                    }
                    requireEvidence(studentUserId, existing.getEvidenceStoredFileId());
                    existing.resubmit();
                    return existing;
                })
                .orElseGet(() -> {
                    requireEvidence(studentUserId, enrollment.getDraftEvidenceStoredFileId());
                    StudentVerificationCase created = StudentVerificationCase.submit(enrollment.getId());
                    created.attachEvidence(enrollment.getDraftEvidenceStoredFileId());
                    enrollment.attachDraftEvidence(null);
                    return created;
                });
        cases.save(verificationCase);

        enrollment.syncVerificationStatus(verificationCase.getStatus());
        enrollments.save(enrollment);

        audit.record("STUDENT_VERIFICATION_SUBMITTED", studentUserId, ipAddress, userAgent, "caseId=" + verificationCase.getId());
        return verificationCase;
    }

    private void requireEvidence(UUID studentUserId, UUID fileId) {
        if (fileId == null) throw evidenceRequired();
        try {
            StoredFile file = files.metadata(fileId);
            if (!studentUserId.equals(file.getUploadedBy())
                    || file.getClassification() != FileClassification.VERIFICATION_EVIDENCE
                    || !FileClassification.VERIFICATION_EVIDENCE.permittedContentTypes().contains(file.getContentType())) {
                throw evidenceRequired();
            }
            // A metadata row alone does not prove a completed, still-readable upload.
            try (var content = files.open(file)) {
                if (content.read() == -1) throw evidenceRequired();
            }
        } catch (ApiException failure) {
            if (failure.getStatus().is5xxServerError()) throw failure;
            throw evidenceRequired();
        } catch (java.io.IOException failure) {
            throw evidenceRequired();
        }
    }

    private ApiException evidenceRequired() {
        return new ApiException("STUDENT_ID_EVIDENCE_REQUIRED", HttpStatus.BAD_REQUEST,
                "Upload your Student ID before submitting enrollment verification.");
    }
}
