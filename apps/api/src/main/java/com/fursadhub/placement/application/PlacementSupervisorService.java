package com.fursadhub.placement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementSupervisorAssignment;
import com.fursadhub.placement.domain.PlacementSupervisorAssignmentRepository;
import com.fursadhub.placement.domain.SupervisorType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Supervisor assignment and reassignment (CLAUDE.md section 40, Phase 5 sections 11-14).
 *
 * <p>Assignment is history, not a field. Reassigning closes the current assignment by stamping
 * {@code removed_at} and inserts a new row in the SAME transaction — the previous supervisor's
 * record is preserved forever, so it stays possible to answer "who supervised this student in
 * March?" long after a handover.
 *
 * <p><strong>Concurrency.</strong> The placement row is locked {@code FOR UPDATE} first, which
 * serializes concurrent reassignments of the same placement. The partial unique index
 * {@code uk_psa_one_active_per_type} is the backstop underneath that: even if two transactions
 * somehow reached the insert together, PostgreSQL would reject the second, so a placement can never
 * end up with two active supervisors of the same type (CLAUDE.md section 54).
 */
@Service
public class PlacementSupervisorService {

    private final PlacementRepository placements;
    private final PlacementSupervisorAssignmentRepository assignments;
    private final PlacementAuthorization authorization;
    private final SupervisorEligibility eligibility;
    private final AuditService audit;

    public PlacementSupervisorService(
            PlacementRepository placements, PlacementSupervisorAssignmentRepository assignments,
            PlacementAuthorization authorization, SupervisorEligibility eligibility, AuditService audit) {
        this.placements = placements;
        this.assignments = assignments;
        this.authorization = authorization;
        this.eligibility = eligibility;
        this.audit = audit;
    }

    /**
     * Assigns or reassigns the UNIVERSITY supervisor. The actor must be a university admin, or a
     * coordinator holding scope over the placement's own department; the supervisor must be an
     * active {@code UNIVERSITY_SUPERVISOR} at the placement's own university.
     */
    @Transactional
    public PlacementSupervisorAssignment assignUniversitySupervisor(
            UUID actingUserId, UUID placementId, UUID supervisorUserId, String ipAddress, String userAgent) {
        Placement placement = lockPlacement(placementId);
        authorization.requireUniversityManage(actingUserId, placement.getId());
        eligibility.requireEligibleUniversitySupervisor(placement, supervisorUserId);

        return replaceActiveAssignment(
                placement, SupervisorType.UNIVERSITY, supervisorUserId, actingUserId, ipAddress, userAgent);
    }

    /**
     * Assigns or reassigns the ORGANIZATION supervisor. The actor must be an admin or recruiter at
     * the placement's own organization; the supervisor must be an active
     * {@code ORGANIZATION_SUPERVISOR} there.
     */
    @Transactional
    public PlacementSupervisorAssignment assignOrganizationSupervisor(
            UUID actingUserId, UUID placementId, UUID supervisorUserId, String ipAddress, String userAgent) {
        Placement placement = lockPlacement(placementId);
        authorization.requireOrganizationManage(actingUserId, placement.getId());
        eligibility.requireEligibleOrganizationSupervisor(placement, supervisorUserId);

        return replaceActiveAssignment(
                placement, SupervisorType.ORGANIZATION, supervisorUserId, actingUserId, ipAddress, userAgent);
    }

    /** The full assignment history for a placement, oldest first — closed assignments included. */
    @Transactional(readOnly = true)
    public List<PlacementSupervisorAssignment> history(UUID actingUserId, UUID placementId) {
        Placement placement = authorization.requireReadAccess(actingUserId, placementId);
        return assignments.findByPlacementIdOrderByAssignedAt(placement.getId());
    }

    /**
     * The single write path for both types. Assigning the supervisor who already holds the post is
     * treated as a no-op rather than a churn of remove-then-reinsert, so a double-clicked or
     * retried assignment cannot fragment the history into meaningless zero-length periods.
     */
    private PlacementSupervisorAssignment replaceActiveAssignment(
            Placement placement, SupervisorType type, UUID supervisorUserId, UUID actingUserId,
            String ipAddress, String userAgent) {

        Optional<PlacementSupervisorAssignment> current = assignments.findActive(placement.getId(), type);

        if (current.isPresent() && current.get().getSupervisorUserId().equals(supervisorUserId)) {
            return current.get();
        }

        boolean isReassignment = current.isPresent();
        // Flushed, not merely saved: the outgoing row must reach the database BEFORE the replacement
        // is inserted, or the partial unique index sees two active assignments of this type and
        // rejects the insert. See PlacementSupervisorAssignmentRepository#saveAndFlush.
        current.ifPresent(existing -> {
            existing.remove();
            assignments.saveAndFlush(existing);
        });

        PlacementSupervisorAssignment assignment = assignments.save(
                PlacementSupervisorAssignment.assign(placement.getId(), supervisorUserId, type, actingUserId));

        audit.record(auditEvent(type, isReassignment), actingUserId, ipAddress, userAgent,
                "placementId=" + placement.getId()
                        + ";supervisorUserId=" + supervisorUserId
                        + ";previousSupervisorUserId="
                        + current.map(a -> a.getSupervisorUserId().toString()).orElse("none"));

        return assignment;
    }

    private String auditEvent(SupervisorType type, boolean isReassignment) {
        String prefix = type == SupervisorType.UNIVERSITY ? "UNIVERSITY_SUPERVISOR_" : "ORGANIZATION_SUPERVISOR_";
        return prefix + (isReassignment ? "REASSIGNED" : "ASSIGNED");
    }

    private Placement lockPlacement(UUID placementId) {
        return placements.findByIdForUpdate(placementId)
                .orElseThrow(() -> new ApiException(
                        "PLACEMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "Placement not found."));
    }
}
