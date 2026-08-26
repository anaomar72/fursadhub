package com.fursadhub.administration.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.NotificationType;
import com.fursadhub.student.domain.StudentEnrollment;
import com.fursadhub.student.domain.StudentEnrollmentRepository;
import com.fursadhub.verification.domain.StudentVerificationCase;
import com.fursadhub.verification.domain.StudentVerificationCaseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Platform resolution of escalated student verification cases (Phase 7 "Admin: verification
 * escalation").
 *
 * <p>A platform reviewer works an escalated case with the SAME frozen transitions a university uses
 * (CLAUDE.md section 30) — there is no special platform-only state and no way to bypass the state
 * machine. What differs is only the authorization: {@link PlatformAuthorization#requireReviewer}
 * instead of a university membership and department scope.
 *
 * <p>Only ESCALATED cases are reachable here. A platform reviewer cannot reach into an ordinary
 * case a university is perfectly capable of handling — the university has to ask first, which keeps
 * the console from becoming a way to read any student's record on a whim.
 */
@Service
public class AdminVerificationEscalationService {

    private final PlatformAuthorization authorization;
    private final StudentVerificationCaseRepository cases;
    private final StudentEnrollmentRepository enrollments;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;

    public AdminVerificationEscalationService(
            PlatformAuthorization authorization,
            StudentVerificationCaseRepository cases,
            StudentEnrollmentRepository enrollments,
            UserRepository users,
            NotificationService notifications,
            AuditService audit) {
        this.authorization = authorization;
        this.cases = cases;
        this.enrollments = enrollments;
        this.users = users;
        this.notifications = notifications;
        this.audit = audit;
    }

    /** One escalated case plus the enrollment context a reviewer needs to judge it. */
    public record EscalatedCase(StudentVerificationCase verificationCase, StudentEnrollment enrollment, String studentEmail) {
    }

    @Transactional(readOnly = true)
    public List<EscalatedCase> queue(UUID actingUserId) {
        authorization.requireReviewer(actingUserId);
        return cases.findEscalatedUnresolved().stream()
                .map(this::withContext)
                .toList();
    }

    @Transactional(readOnly = true)
    public EscalatedCase get(UUID actingUserId, UUID caseId) {
        authorization.requireReviewer(actingUserId);
        return withContext(requireEscalated(caseId));
    }

    @Transactional
    public void verify(UUID actingUserId, UUID caseId, String ip, String userAgent) {
        StudentVerificationCase verificationCase = beginResolution(actingUserId, caseId);
        verificationCase.approve(actingUserId);
        persist(verificationCase);

        audit.record("STUDENT_VERIFIED", actingUserId, ip, userAgent, "caseId=" + caseId + ";escalated");
        notifyStudent(verificationCase, NotificationType.STUDENT_VERIFICATION_VERIFIED);
    }

    @Transactional
    public void reject(UUID actingUserId, UUID caseId, String reason, String ip, String userAgent) {
        if (reason == null || reason.isBlank()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "A reason is required when rejecting a verification case.");
        }
        StudentVerificationCase verificationCase = beginResolution(actingUserId, caseId);
        verificationCase.reject(actingUserId, reason);
        persist(verificationCase);

        audit.record("STUDENT_VERIFICATION_REJECTED", actingUserId, ip, userAgent, "caseId=" + caseId + ";escalated");
        notifyStudent(verificationCase, NotificationType.STUDENT_VERIFICATION_REJECTED);
    }

    @Transactional
    public void requestMoreEvidence(UUID actingUserId, UUID caseId, String notes, String ip, String userAgent) {
        StudentVerificationCase verificationCase = beginResolution(actingUserId, caseId);
        verificationCase.requestMoreEvidence(actingUserId, notes);
        persist(verificationCase);

        audit.record("STUDENT_VERIFICATION_NEEDS_MORE_EVIDENCE", actingUserId, ip, userAgent,
                "caseId=" + caseId + ";escalated");
        notifyStudent(verificationCase, NotificationType.STUDENT_VERIFICATION_NEEDS_MORE_EVIDENCE);
    }

    // ---------------------------------------------------------------- internals

    private StudentVerificationCase beginResolution(UUID actingUserId, UUID caseId) {
        authorization.requireReviewer(actingUserId);
        StudentVerificationCase verificationCase = requireEscalated(caseId);
        if (verificationCase.isResolved()) {
            throw new ApiException("VERIFICATION_CASE_ALREADY_RESOLVED", HttpStatus.CONFLICT,
                    "This verification case has already been resolved.");
        }
        return verificationCase;
    }

    /**
     * Saves the case and keeps the enrollment's denormalized status in step — the same pairing
     * {@code VerificationReviewService} performs, so an escalated resolution leaves the student in
     * exactly the state a university resolution would have.
     */
    private void persist(StudentVerificationCase verificationCase) {
        cases.save(verificationCase);
        enrollments.findById(verificationCase.getEnrollmentId()).ifPresent(enrollment -> {
            enrollment.syncVerificationStatus(verificationCase.getStatus());
            enrollments.save(enrollment);
        });
    }

    private void notifyStudent(StudentVerificationCase verificationCase, NotificationType type) {
        enrollments.findById(verificationCase.getEnrollmentId()).ifPresent(enrollment -> {
            UUID studentUserId = enrollment.getStudentUserId();
            notifications.notify(studentUserId, type, Map.of(), "/student/enrollment", emailOf(studentUserId));
        });
    }

    private EscalatedCase withContext(StudentVerificationCase verificationCase) {
        StudentEnrollment enrollment = enrollments.findById(verificationCase.getEnrollmentId())
                .orElseThrow(() -> new IllegalStateException("Verification case references a missing enrollment"));
        return new EscalatedCase(verificationCase, enrollment,
                users.findById(enrollment.getStudentUserId()).map(User::getEmail).orElse(null));
    }

    private StudentVerificationCase requireEscalated(UUID caseId) {
        StudentVerificationCase verificationCase = cases.findById(caseId)
                .orElseThrow(() -> new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Verification case not found."));
        if (!verificationCase.isEscalated()) {
            // 404, not 403: confirming the case exists would let a reviewer enumerate cases they
            // were never asked to look at.
            throw new ApiException("VERIFICATION_CASE_NOT_FOUND", HttpStatus.NOT_FOUND,
                    "Verification case not found.");
        }
        return verificationCase;
    }

    private String emailOf(UUID userId) {
        return users.findById(userId).map(User::getEmail).orElse(null);
    }
}
