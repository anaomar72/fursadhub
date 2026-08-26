package com.fursadhub.verification.application;

import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityRole;
import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * Private evidence attached to a university-attestation case (CLAUDE.md sections 31, 47-48).
 *
 * <p>"Verification evidence must remain private" is the rule this service exists to enforce, and the
 * access list is deliberately short — there are exactly three kinds of reader:
 *
 * <ul>
 *   <li>the STUDENT whose evidence it is;</li>
 *   <li>a scoped reviewer at THAT university — an admin, or a coordinator whose departments include
 *       this enrollment;</li>
 *   <li>a platform VERIFICATION_OFFICER or SUPER_ADMIN, who exist to resolve exactly the cases the
 *       university could not.</li>
 * </ul>
 *
 * <p>Organization users are not on that list under any circumstance. A recruiter looking at a
 * candidate has no route to this document, which is one of the mandatory security tests in
 * CLAUDE.md section 60 — and it holds regardless of any candidacy, placement or membership they may
 * have, because nothing in this service ever consults those.
 *
 * <p>The document is never public. It has a random storage key, no URL is ever issued for it, and
 * every read passes through {@link PrivateFileService#openAudited} so it lands in the audit trail.
 */
@Service
public class VerificationEvidenceService {

    private final StudentVerificationCaseRepository cases;
    private final StudentEnrollmentRepository enrollments;
    private final PrivateFileService fileService;
    private final UniversityAuthorization universityAuthorization;
    private final PlatformAuthorization platformAuthorization;

    public VerificationEvidenceService(
            StudentVerificationCaseRepository cases,
            StudentEnrollmentRepository enrollments,
            PrivateFileService fileService,
            UniversityAuthorization universityAuthorization,
            PlatformAuthorization platformAuthorization) {
        this.cases = cases;
        this.enrollments = enrollments;
        this.fileService = fileService;
        this.universityAuthorization = universityAuthorization;
        this.platformAuthorization = platformAuthorization;
    }

    /** A private document being streamed back to an authorized caller. */
    public record Document(StoredFile metadata, InputStream content) {
    }

    /**
     * Uploads or replaces the evidence on the caller's OWN verification case.
     *
     * <p>The case is resolved from the authenticated student, never from an id in the request
     * (CLAUDE.md section 12), so there is no shape of this call that attaches a document to somebody
     * else's case.
     */
    @Transactional
    public StoredFile upload(UUID studentUserId, MultipartFile upload) {
        StudentVerificationCase verificationCase = myCase(studentUserId);

        StoredFile stored = fileService.store(upload, FileClassification.VERIFICATION_EVIDENCE, studentUserId);
        UUID previous = verificationCase.getEvidenceStoredFileId();

        verificationCase.attachEvidence(stored.getId());
        cases.save(verificationCase);

        // Best-effort, after the pointer has moved: a storage hiccup here must not roll back an
        // upload the student has already completed. The worst case is one orphaned object.
        fileService.deleteQuietly(previous);
        return stored;
    }

    /** The student reading back their own evidence. */
    @Transactional
    public Document openOwn(UUID studentUserId, String ipAddress, String userAgent) {
        StudentVerificationCase verificationCase = myCase(studentUserId);
        return open(verificationCase, studentUserId, ipAddress, userAgent);
    }

    /**
     * A scoped university reviewer reading a student's evidence.
     *
     * <p>Three separate checks, all against current PostgreSQL data: the case belongs to this
     * university, the caller holds a reviewing role there, and — for a coordinator — the enrollment's
     * department is one of theirs. Changing the university id in the URL fails the first, changing
     * the case id fails it too.
     */
    @Transactional
    public Document openForUniversityReviewer(
            UUID staffUserId, UUID universityId, UUID caseId, String ipAddress, String userAgent) {
        StudentVerificationCase verificationCase = requireCase(caseId);
        StudentEnrollment enrollment = requireEnrollment(verificationCase);

        if (!enrollment.getUniversityId().equals(universityId)) {
            throw accessDenied();
        }
        UniversityMembership membership = universityAuthorization.requireMembership(
                staffUserId, universityId,
                UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);
        universityAuthorization.requireDepartmentScope(membership, enrollment.getDepartmentId());

        return open(verificationCase, staffUserId, ipAddress, userAgent);
    }

    /** A platform verification officer reading evidence on a case they are resolving. */
    @Transactional
    public Document openForPlatformReviewer(UUID actingUserId, UUID caseId, String ipAddress, String userAgent) {
        platformAuthorization.requireReviewer(actingUserId);
        return open(requireCase(caseId), actingUserId, ipAddress, userAgent);
    }

    // ---------------------------------------------------------------- internals

    private Document open(StudentVerificationCase verificationCase, UUID actingUserId, String ipAddress, String userAgent) {
        if (verificationCase.getEvidenceStoredFileId() == null) {
            throw new ApiException("VERIFICATION_EVIDENCE_MISSING", HttpStatus.NOT_FOUND,
                    "No evidence document has been uploaded for this case.");
        }
        StoredFile file = fileService.metadata(verificationCase.getEvidenceStoredFileId());
        return new Document(file, fileService.openAudited(
                file, actingUserId, "verificationCaseId=" + verificationCase.getId(), ipAddress, userAgent));
    }

    private StudentVerificationCase myCase(UUID studentUserId) {
        StudentEnrollment enrollment = enrollments.findByStudentUserId(studentUserId)
                .orElseThrow(() -> new ApiException("ENROLLMENT_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Claim your enrollment before uploading evidence."));
        return cases.findByEnrollmentId(enrollment.getId())
                .orElseThrow(() -> new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "No verification case in progress."));
    }

    private StudentVerificationCase requireCase(UUID caseId) {
        return cases.findById(caseId)
                .orElseThrow(() -> new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Verification case not found."));
    }

    private StudentEnrollment requireEnrollment(StudentVerificationCase verificationCase) {
        return enrollments.findById(verificationCase.getEnrollmentId())
                .orElseThrow(() -> new IllegalStateException("Verification case references a missing enrollment"));
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
