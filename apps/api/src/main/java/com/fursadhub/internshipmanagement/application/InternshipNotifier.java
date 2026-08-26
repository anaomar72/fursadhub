package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.notification.EmailOutboxService;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementSupervisorAssignmentRepository;
import com.fursadhub.placement.domain.SupervisorType;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Transactional notifications for internship-management events (CLAUDE.md section 55, Phase 6
 * section 29).
 *
 * <p>Everything goes through the existing PostgreSQL-backed outbox. Enqueuing is part of the caller's
 * transaction and sending is not, so a business transaction never depends on SMTP being reachable:
 * if mail delivery is down, the weekly log is still reviewed and the message goes out when the
 * dispatcher next runs. No queue broker is involved, and none may be introduced.
 *
 * <p>Message bodies carry the event and a link, never the student's written content, a review
 * comment's full text, or anything from a report document (CLAUDE.md section 68).
 */
@Service
public class InternshipNotifier {

    private final EmailOutboxService outbox;
    private final UserRepository users;
    private final PlacementSupervisorAssignmentRepository assignments;

    public InternshipNotifier(
            EmailOutboxService outbox, UserRepository users,
            PlacementSupervisorAssignmentRepository assignments) {
        this.outbox = outbox;
        this.users = users;
        this.assignments = assignments;
    }

    // ---------------------------------------------------------------- weekly logs

    public void weeklyLogReturned(Placement placement, int weekNumber) {
        toStudent(placement, "Your weekly log needs changes",
                "Week " + weekNumber + " of your internship log has been returned for changes. "
                        + "Open FursadHub to read your supervisor's feedback and resubmit.");
    }

    public void weeklyLogReviewed(Placement placement, int weekNumber) {
        toStudent(placement, "Your weekly log has been reviewed",
                "Week " + weekNumber + " of your internship log has been reviewed.");
    }

    // ---------------------------------------------------------------- attendance

    public void attendanceDisputed(Placement placement) {
        toOrganizationSupervisor(placement, "An attendance record has been disputed",
                "A student has disputed an attendance record on a placement you supervise. "
                        + "Open FursadHub to review and resolve it.");
    }

    public void attendanceResolved(Placement placement) {
        toStudent(placement, "Your attendance dispute has been resolved",
                "Your supervisor has resolved the attendance record you disputed.");
    }

    // ---------------------------------------------------------------- evaluation

    public void evaluationFinalized(Placement placement) {
        toStudent(placement, "Your internship evaluation is available",
                "Your host organization has finalized your internship evaluation.");
    }

    // ---------------------------------------------------------------- final report

    public void finalReportRevisionRequested(Placement placement) {
        toStudent(placement, "Your final report needs revision",
                "Your final internship report has been returned for revision. "
                        + "Open FursadHub to read the feedback and resubmit.");
    }

    public void finalReportApproved(Placement placement) {
        toStudent(placement, "Your final report has been approved",
                "Your final internship report has been approved.");
    }

    // ---------------------------------------------------------------- defense

    public void defenseScheduled(Placement placement, int attemptNumber) {
        toStudent(placement, "Your internship defense has been scheduled",
                "Defense attempt " + attemptNumber + " has been scheduled. "
                        + "Open FursadHub to see the date and details.");
    }

    public void defenseResultRecorded(Placement placement, int attemptNumber) {
        toStudent(placement, "Your internship defense result is available",
                "The result of defense attempt " + attemptNumber + " has been recorded.");
    }

    // ---------------------------------------------------------------- completion

    public void placementCompleted(Placement placement) {
        toStudent(placement, "Your internship is complete",
                "Your internship has been marked complete. Congratulations.");
    }

    // ---------------------------------------------------------------- helpers

    private void toStudent(Placement placement, String subject, String body) {
        emailOf(placement.getStudentUserId()).ifPresent(email -> outbox.enqueue(email, subject, body));
    }

    /**
     * Notifies whoever is CURRENTLY assigned, resolved at send time rather than from a stored id.
     * If the supervisor was replaced yesterday, today's dispute reaches the new one.
     */
    private void toOrganizationSupervisor(Placement placement, String subject, String body) {
        assignments.findActive(placement.getId(), SupervisorType.ORGANIZATION)
                .flatMap(assignment -> emailOf(assignment.getSupervisorUserId()))
                .ifPresent(email -> outbox.enqueue(email, subject, body));
    }

    private Optional<String> emailOf(UUID userId) {
        return users.findById(userId).map(User::getEmail);
    }
}
