package com.fursadhub.administration.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.NotificationType;
import com.fursadhub.university.domain.University;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRepository;
import com.fursadhub.university.domain.UniversityRole;
import com.fursadhub.verification.domain.InstitutionVerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * Platform review of university verification (CLAUDE.md section 31), the exact counterpart of
 * {@link AdminInstitutionVerificationService} for the other kind of institution.
 *
 * <p>This service adds NO state machine of its own. The frozen
 * DRAFT/SUBMITTED/UNDER_REVIEW/NEEDS_CHANGES/VERIFIED/REJECTED/SUSPENDED/REVOKED transitions are
 * domain methods on {@link University}; all this does is authorize a platform reviewer, call one of
 * them, audit it and notify the university's own admins — which is why an invalid transition still
 * fails inside the domain object rather than here.
 *
 * <p>The stakes are concrete: only a VERIFIED university can be targeted by an opportunity
 * ({@code TARGET_UNIVERSITY_NOT_VERIFIED}), so verifying one is what admits it to the recruitment
 * pipeline. It is kept separate from the organization service rather than generalized behind a
 * shared "institution" abstraction — the two tenants have different memberships, different
 * notification types and different downstream consequences, and a common base class would only hide
 * that.
 */
@Service
public class AdminUniversityVerificationService {

    private final PlatformAuthorization authorization;
    private final UniversityRepository universities;
    private final UniversityMembershipRepository memberships;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;

    public AdminUniversityVerificationService(
            PlatformAuthorization authorization,
            UniversityRepository universities,
            UniversityMembershipRepository memberships,
            UserRepository users,
            NotificationService notifications,
            AuditService audit) {
        this.authorization = authorization;
        this.universities = universities;
        this.memberships = memberships;
        this.users = users;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<University> list(
            UUID actingUserId, InstitutionVerificationStatus status, String nameFragment, Pageable pageable) {
        authorization.requireReviewer(actingUserId);
        return universities.search(status, nameFragment, pageable);
    }

    @Transactional(readOnly = true)
    public University get(UUID actingUserId, UUID universityId) {
        authorization.requireReviewer(actingUserId);
        return requireUniversity(universityId);
    }

    @Transactional
    public University beginReview(UUID actingUserId, UUID universityId, String ip, String userAgent) {
        return transition(actingUserId, universityId, University::markUnderReview,
                "UNIVERSITY_VERIFICATION_UNDER_REVIEW", null, null, ip, userAgent);
    }

    @Transactional
    public University requestChanges(UUID actingUserId, UUID universityId, String note, String ip, String userAgent) {
        return transition(actingUserId, universityId, University::requestChanges,
                "UNIVERSITY_VERIFICATION_CHANGES_REQUESTED",
                NotificationType.UNIVERSITY_VERIFICATION_CHANGES_REQUESTED, note, ip, userAgent);
    }

    @Transactional
    public University verify(UUID actingUserId, UUID universityId, String ip, String userAgent) {
        return transition(actingUserId, universityId, University::verify,
                "UNIVERSITY_VERIFIED", NotificationType.UNIVERSITY_VERIFIED, null, ip, userAgent);
    }

    @Transactional
    public University reject(UUID actingUserId, UUID universityId, String note, String ip, String userAgent) {
        return transition(actingUserId, universityId, University::reject,
                "UNIVERSITY_VERIFICATION_REJECTED", NotificationType.UNIVERSITY_VERIFICATION_REJECTED,
                note, ip, userAgent);
    }

    @Transactional
    public University suspend(UUID actingUserId, UUID universityId, String note, String ip, String userAgent) {
        return transition(actingUserId, universityId, University::suspend,
                "UNIVERSITY_VERIFICATION_SUSPENDED", NotificationType.UNIVERSITY_VERIFICATION_SUSPENDED,
                note, ip, userAgent);
    }

    @Transactional
    public University revoke(UUID actingUserId, UUID universityId, String note, String ip, String userAgent) {
        return transition(actingUserId, universityId, University::revoke,
                "UNIVERSITY_VERIFICATION_REVOKED", NotificationType.UNIVERSITY_VERIFICATION_REVOKED,
                note, ip, userAgent);
    }

    // ---------------------------------------------------------------- internals

    private University transition(
            UUID actingUserId,
            UUID universityId,
            Consumer<University> command,
            String auditEvent,
            NotificationType notificationType,
            String note,
            String ip,
            String userAgent) {
        authorization.requireReviewer(actingUserId);

        University university = requireUniversity(universityId);
        // The domain object owns the state machine and rejects anything invalid. This service never
        // second-guesses it and never assigns a status field directly.
        command.accept(university);
        universities.save(university);

        audit.record(auditEvent, actingUserId, ip, userAgent,
                "university " + universityId + (isBlank(note) ? "" : " - " + note));
        if (notificationType != null) {
            notifyUniversityAdmins(university, notificationType);
        }
        return university;
    }

    /**
     * Tells the university's own admins, resolved at send time from current memberships rather than
     * from an id stored at submission, so a staffing change in the meantime does not send the outcome
     * to someone who has since left.
     */
    private void notifyUniversityAdmins(University university, NotificationType type) {
        Map<String, Object> payload = Map.of("universityName", university.getName());
        memberships.findByUniversityId(university.getId()).stream()
                .filter(UniversityMembership::isActive)
                .filter(membership -> membership.getRole() == UniversityRole.UNIVERSITY_ADMIN)
                .forEach(membership -> notifications.notify(
                        membership.getUserId(),
                        type,
                        payload,
                        "/university/profile",
                        users.findById(membership.getUserId()).map(User::getEmail).orElse(null)));
    }

    private University requireUniversity(UUID universityId) {
        return universities.findById(universityId)
                .orElseThrow(() -> new ApiException(
                        "UNIVERSITY_NOT_FOUND", HttpStatus.NOT_FOUND, "No such university."));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
