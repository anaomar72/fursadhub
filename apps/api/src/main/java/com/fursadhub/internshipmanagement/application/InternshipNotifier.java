package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.notification.application.NotificationService;
import com.fursadhub.notification.domain.NotificationType;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementSupervisorAssignmentRepository;
import com.fursadhub.placement.domain.SupervisorType;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Transactional notifications for internship-management events (CLAUDE.md section 55, Phase 6
 * section 29).
 *
 * <p>Both channels are written inside the caller's transaction and neither one sends anything: the
 * in-app notification is a row, and the email goes to the PostgreSQL-backed outbox for the scheduled
 * dispatcher to deliver later. So a business transaction never depends on SMTP being reachable — if
 * mail delivery is down, the weekly log is still reviewed and the message goes out when the
 * dispatcher next runs. No queue broker is involved, and none may be introduced.
 *
 * <p>Phase 7 added the in-app channel alongside the email that Phase 6 already sent. The in-app
 * notification carries a type code plus safe parameters rather than finished text, so it renders in
 * the reader's own language (CLAUDE.md section 56); the email keeps the English wording Phase 6
 * wrote, since transactional mail is English-only across every phase so far.
 *
 * <p>Neither channel carries the student's written content, a review comment's text, or anything
 * from a report document (CLAUDE.md section 68) — only the event, the week or attempt number, and a
 * link back into the product.
 */
@Service
public class InternshipNotifier {

    private final EmailOutboxService outbox;
    private final NotificationService notifications;
    private final UserRepository users;
    private final PlacementSupervisorAssignmentRepository assignments;

    public InternshipNotifier(
            EmailOutboxService outbox,
            NotificationService notifications,
            UserRepository users,
            PlacementSupervisorAssignmentRepository assignments) {
        this.outbox = outbox;
        this.notifications = notifications;
        this.users = users;
        this.assignments = assignments;
    }

    // ---------------------------------------------------------------- weekly logs

    public void weeklyLogReturned(Placement placement, int weekNumber) {
        toStudent(placement, NotificationType.WEEKLY_LOG_RETURNED,
                Map.of("weekNumber", weekNumber), studentPath(placement, "weekly-logs"),
                "Your weekly log needs changes",
                "Week " + weekNumber + " of your internship log has been returned for changes. "
                        + "Open FursadHub to read your supervisor's feedback and resubmit.");
    }

    public void weeklyLogReviewed(Placement placement, int weekNumber) {
        toStudent(placement, NotificationType.WEEKLY_LOG_REVIEWED,
                Map.of("weekNumber", weekNumber), studentPath(placement, "weekly-logs"),
                "Your weekly log has been reviewed",
                "Week " + weekNumber + " of your internship log has been reviewed.");
    }

    // ---------------------------------------------------------------- attendance

    public void attendanceDisputed(Placement placement) {
        toOrganizationSupervisor(placement, NotificationType.ATTENDANCE_DISPUTED,
                organizationPath(placement, "attendance"),
                "An attendance record has been disputed",
                "A student has disputed an attendance record on a placement you supervise. "
                        + "Open FursadHub to review and resolve it.");
    }

    public void attendanceResolved(Placement placement) {
        toStudent(placement, NotificationType.ATTENDANCE_RESOLVED,
                Map.of(), studentPath(placement, "attendance"),
                "Your attendance dispute has been resolved",
                "Your supervisor has resolved the attendance record you disputed.");
    }

    // ---------------------------------------------------------------- evaluation

    public void evaluationFinalized(Placement placement) {
        toStudent(placement, NotificationType.EVALUATION_FINALIZED,
                Map.of(), studentPath(placement, ""),
                "Your internship evaluation is available",
                "Your host organization has finalized your internship evaluation.");
    }

    // ---------------------------------------------------------------- final report

    public void finalReportRevisionRequested(Placement placement) {
        toStudent(placement, NotificationType.FINAL_REPORT_REVISION_REQUESTED,
                Map.of(), studentPath(placement, "final-report"),
                "Your final report needs revision",
                "Your final internship report has been returned for revision. "
                        + "Open FursadHub to read the feedback and resubmit.");
    }

    public void finalReportApproved(Placement placement) {
        toStudent(placement, NotificationType.FINAL_REPORT_APPROVED,
                Map.of(), studentPath(placement, "final-report"),
                "Your final report has been approved",
                "Your final internship report has been approved.");
    }

    // ---------------------------------------------------------------- defense

    public void defenseScheduled(Placement placement, int attemptNumber) {
        toStudent(placement, NotificationType.DEFENSE_SCHEDULED,
                Map.of("attemptNumber", attemptNumber), studentPath(placement, "defense"),
                "Your internship defense has been scheduled",
                "Defense attempt " + attemptNumber + " has been scheduled. "
                        + "Open FursadHub to see the date and details.");
    }

    public void defenseResultRecorded(Placement placement, int attemptNumber) {
        toStudent(placement, NotificationType.DEFENSE_RESULT_RECORDED,
                Map.of("attemptNumber", attemptNumber), studentPath(placement, "defense"),
                "Your internship defense result is available",
                "The result of defense attempt " + attemptNumber + " has been recorded.");
    }

    // ---------------------------------------------------------------- completion

    public void placementCompleted(Placement placement) {
        toStudent(placement, NotificationType.PLACEMENT_COMPLETED,
                Map.of(), studentPath(placement, ""),
                "Your internship is complete",
                "Your internship has been marked complete. Congratulations.");
    }

    // ---------------------------------------------------------------- helpers

    private void toStudent(
            Placement placement, NotificationType type, Map<String, Object> payload,
            String linkPath, String subject, String body) {
        notifications.notify(placement.getStudentUserId(), type, payload, linkPath);
        emailOf(placement.getStudentUserId()).ifPresent(email -> outbox.enqueue(email, subject, body));
    }

    /**
     * Notifies whoever is CURRENTLY assigned, resolved at send time rather than from a stored id.
     * If the supervisor was replaced yesterday, today's dispute reaches the new one.
     */
    private void toOrganizationSupervisor(
            Placement placement, NotificationType type, String linkPath, String subject, String body) {
        assignments.findActive(placement.getId(), SupervisorType.ORGANIZATION).ifPresent(assignment -> {
            notifications.notify(assignment.getSupervisorUserId(), type, Map.of(), linkPath);
            emailOf(assignment.getSupervisorUserId())
                    .ifPresent(email -> outbox.enqueue(email, subject, body));
        });
    }

    private String studentPath(Placement placement, String section) {
        return "/student/placements/" + placement.getId() + (section.isEmpty() ? "" : "/" + section);
    }

    private String organizationPath(Placement placement, String section) {
        return "/organization/placements/" + placement.getId() + (section.isEmpty() ? "" : "/" + section);
    }

    private Optional<String> emailOf(UUID userId) {
        return users.findById(userId).map(User::getEmail);
    }
}
