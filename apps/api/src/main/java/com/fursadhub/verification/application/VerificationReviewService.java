package com.fursadhub.verification.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.NotificationType;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityRole;
import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import com.fursadhub.verification.domain.StudentVerificationStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * University-staff review actions on a {@code StudentVerificationCase} (CLAUDE.md section 29-30).
 * Every action re-verifies the acting staff member's university membership and, for coordinators,
 * their department scope over the case's enrollment (CLAUDE.md section 25).
 */
@Service
public class VerificationReviewService {

    private final StudentVerificationCaseRepository cases;
    private final StudentEnrollmentRepository enrollments;
    private final UniversityAuthorization universityAuthorization;
    private final NotificationService notifications;
    private final UserRepository users;
    private final AuditService audit;

    public VerificationReviewService(
            StudentVerificationCaseRepository cases,
            StudentEnrollmentRepository enrollments,
            UniversityAuthorization universityAuthorization,
            NotificationService notifications,
            UserRepository users,
            AuditService audit) {
        this.cases = cases;
        this.enrollments = enrollments;
        this.universityAuthorization = universityAuthorization;
        this.notifications = notifications;
        this.users = users;
        this.audit = audit;
    }

    private record Loaded(StudentVerificationCase verificationCase, StudentEnrollment enrollment) {
    }

    @Transactional
    public void beginReview(UUID staffUserId, UUID universityId, UUID caseId, String ipAddress, String userAgent) {
        Loaded loaded = loadForReview(staffUserId, universityId, caseId);
        requireStatus(loaded.verificationCase(), StudentVerificationStatus.SUBMITTED);
        loaded.verificationCase().beginReview(staffUserId);
        persist(loaded);
        audit.record("STUDENT_VERIFICATION_UNDER_REVIEW", staffUserId, ipAddress, userAgent, "caseId=" + caseId);
    }

    @Transactional
    public void requestMoreEvidence(UUID staffUserId, UUID universityId, UUID caseId, String notes, String ipAddress, String userAgent) {
        Loaded loaded = loadForReview(staffUserId, universityId, caseId);
        requireReviewable(loaded.verificationCase());
        loaded.verificationCase().requestMoreEvidence(staffUserId, notes);
        persist(loaded);
        audit.record("STUDENT_VERIFICATION_NEEDS_MORE_EVIDENCE", staffUserId, ipAddress, userAgent, "caseId=" + caseId);
        notifyStudent(loaded, NotificationType.STUDENT_VERIFICATION_NEEDS_MORE_EVIDENCE);
    }

    @Transactional
    public void approve(UUID staffUserId, UUID universityId, UUID caseId, String ipAddress, String userAgent) {
        Loaded loaded = loadForReview(staffUserId, universityId, caseId);
        requireReviewable(loaded.verificationCase());
        loaded.verificationCase().approve(staffUserId);
        persist(loaded);
        audit.record("STUDENT_VERIFIED", staffUserId, ipAddress, userAgent, "caseId=" + caseId);
        notifyStudent(loaded, NotificationType.STUDENT_VERIFICATION_VERIFIED);
    }

    @Transactional
    public void reject(UUID staffUserId, UUID universityId, UUID caseId, String reason, String ipAddress, String userAgent) {
        Loaded loaded = loadForReview(staffUserId, universityId, caseId);
        requireReviewable(loaded.verificationCase());
        loaded.verificationCase().reject(staffUserId, reason);
        persist(loaded);
        audit.record("STUDENT_VERIFICATION_REJECTED", staffUserId, ipAddress, userAgent, "caseId=" + caseId);
        notifyStudent(loaded, NotificationType.STUDENT_VERIFICATION_REJECTED);
    }

    /** Revocation is restricted to {@code UNIVERSITY_ADMIN} — more consequential than routine review. */
    @Transactional
    public void revoke(UUID staffUserId, UUID universityId, UUID caseId, String reason, String ipAddress, String userAgent) {
        StudentVerificationCase verificationCase = cases.findById(caseId).orElseThrow(this::caseNotFound);
        StudentEnrollment enrollment = enrollments.findById(verificationCase.getEnrollmentId())
                .orElseThrow(() -> new IllegalStateException("Verification case references a missing enrollment"));
        if (!enrollment.getUniversityId().equals(universityId)) {
            throw accessDenied();
        }
        universityAuthorization.requireMembership(staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);

        if (verificationCase.getStatus() != StudentVerificationStatus.VERIFIED) {
            if (verificationCase.isResolved()) {
                throw new ApiException("VERIFICATION_CASE_ALREADY_RESOLVED", HttpStatus.CONFLICT, "This verification case has already been resolved.");
            }
            throw new ApiException("VERIFICATION_CASE_INVALID_TRANSITION", HttpStatus.CONFLICT, "Only a verified case can be revoked.");
        }
        verificationCase.revoke(staffUserId, reason);
        persist(new Loaded(verificationCase, enrollment));
        audit.record("STUDENT_VERIFICATION_REVOKED", staffUserId, ipAddress, userAgent, "caseId=" + caseId);
    }

    /**
     * Hands a case the university cannot resolve to the platform (Phase 7 "Admin: verification
     * escalation").
     *
     * <p>Escalation does NOT change the case's status: the frozen state machine
     * (CLAUDE.md section 30) is untouched, and the case stays exactly where it was. It changes who
     * may act on it, so a coordinator facing a disputed identity or records the university itself
     * cannot confirm has somewhere to send it instead of leaving it in the queue indefinitely.
     *
     * <p>The university keeps its own access throughout — escalating asks for help, it does not hand
     * the case away.
     */
    @Transactional
    public void escalate(UUID staffUserId, UUID universityId, UUID caseId, String reason, String ipAddress, String userAgent) {
        Loaded loaded = loadForReview(staffUserId, universityId, caseId);
        requireReviewable(loaded.verificationCase());
        loaded.verificationCase().escalate(staffUserId, reason);
        cases.save(loaded.verificationCase());
        audit.record("STUDENT_VERIFICATION_ESCALATED", staffUserId, ipAddress, userAgent, "caseId=" + caseId);
    }

    /**
     * Tells the student the outcome (Phase 7). In-app plus email, both enqueued inside this
     * transaction — the review itself never depends on either being deliverable.
     *
     * <p>Carries the outcome only, never the reviewer's notes: those are written for university staff
     * and may say more than the review intends the student to read. The student sees the notes on
     * their own verification page, where the wording is presented as feedback.
     */
    private void notifyStudent(Loaded loaded, NotificationType type) {
        UUID studentUserId = loaded.enrollment().getStudentUserId();
        notifications.notify(studentUserId, type, Map.of(), "/student/enrollment",
                users.findById(studentUserId).map(User::getEmail).orElse(null));
    }

    private Loaded loadForReview(UUID staffUserId, UUID universityId, UUID caseId) {
        StudentVerificationCase verificationCase = cases.findById(caseId).orElseThrow(this::caseNotFound);
        StudentEnrollment enrollment = enrollments.findById(verificationCase.getEnrollmentId())
                .orElseThrow(() -> new IllegalStateException("Verification case references a missing enrollment"));
        if (!enrollment.getUniversityId().equals(universityId)) {
            throw accessDenied();
        }
        UniversityMembership membership = universityAuthorization.requireMembership(
                staffUserId, universityId, UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);
        universityAuthorization.requireDepartmentScope(membership, enrollment.getDepartmentId());
        return new Loaded(verificationCase, enrollment);
    }

    private void requireStatus(StudentVerificationCase verificationCase, StudentVerificationStatus expected) {
        if (verificationCase.getStatus() == expected) {
            return;
        }
        if (verificationCase.isResolved()) {
            throw new ApiException("VERIFICATION_CASE_ALREADY_RESOLVED", HttpStatus.CONFLICT, "This verification case has already been resolved.");
        }
        throw new ApiException("VERIFICATION_CASE_INVALID_TRANSITION", HttpStatus.CONFLICT, "This verification case is not in the expected state.");
    }

    private void requireReviewable(StudentVerificationCase verificationCase) {
        if (verificationCase.isResolved()) {
            throw new ApiException("VERIFICATION_CASE_ALREADY_RESOLVED", HttpStatus.CONFLICT, "This verification case has already been resolved.");
        }
        if (!verificationCase.isReviewable()) {
            throw new ApiException("VERIFICATION_CASE_INVALID_TRANSITION", HttpStatus.CONFLICT, "This verification case is not in a reviewable state.");
        }
    }

    private void persist(Loaded loaded) {
        cases.save(loaded.verificationCase());
        loaded.enrollment().syncVerificationStatus(loaded.verificationCase().getStatus());
        enrollments.save(loaded.enrollment());
    }

    private ApiException caseNotFound() {
        return new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND, "Verification case not found.");
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }
}
