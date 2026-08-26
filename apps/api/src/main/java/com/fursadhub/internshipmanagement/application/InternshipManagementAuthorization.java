package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.organization.domain.OrganizationMembership;
import com.fursadhub.organization.domain.OrganizationMembershipRepository;
import com.fursadhub.placement.application.PlacementAuthorization;
import com.fursadhub.placement.domain.Placement;
import com.fursadhub.placement.domain.PlacementRepository;
import com.fursadhub.placement.domain.PlacementStatus;
import com.fursadhub.placement.domain.PlacementSupervisorAssignmentRepository;
import com.fursadhub.placement.domain.SupervisorType;
import com.fursadhub.university.application.UniversityAuthorization;
import com.fursadhub.university.domain.UniversityMembership;
import com.fursadhub.university.domain.UniversityMembershipRepository;
import com.fursadhub.university.domain.UniversityRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * The single authorization boundary for internship management (CLAUDE.md section 24).
 *
 * <p>Everything here resolves scope from the PLACEMENT — its own student, organization, university
 * and department — and then re-reads the caller's current membership and current supervisor
 * assignment from PostgreSQL. No decision is made from a role string or a JWT claim, so changing a
 * UUID in a URL cannot reach another student's logs, another organization's attendance or another
 * university's defense.
 *
 * <p>Phase 6 splits access along the line the product draws, which is narrower than "everyone
 * attached to the placement":
 *
 * <ul>
 *   <li><strong>Academic supervision content</strong> — weekly logs, the final report, defense — is
 *       the STUDENT's and the UNIVERSITY's. Organization users have no access to it at all, not even
 *       read, because CLAUDE.md section 6/16 says organization users must not automatically reach
 *       university-only supervision content or the final academic report.</li>
 *   <li><strong>Workplace content</strong> — attendance, the organization's evaluation — is authored
 *       by the assigned ORGANIZATION supervisor, with the university reading it in scope.</li>
 * </ul>
 *
 * <p>Both supervisor roles reach a placement only through an ACTIVE assignment on that specific
 * placement. Holding the role grants nothing on its own, and a supervisor whose assignment has been
 * closed loses access the moment it is closed — the same rule Phase 5 established.
 */
@Component
public class InternshipManagementAuthorization {

    /**
     * University staff who may act on a placement's academic record: review weekly logs, review the
     * final report, and manage defense.
     *
     * <p>{@code UNIVERSITY_SUPERVISOR} is included but is separately confined to their own assigned
     * placements; {@code DEPARTMENT_COORDINATOR} is separately confined to their own departments.
     * Neither confinement is expressed by this set — it is applied in {@link #universityScope}.
     */
    private static final Set<UniversityRole> ACADEMIC_ROLES = EnumSet.allOf(UniversityRole.class);

    /** The states in which a placement is actually running and may accumulate internship records. */
    private static final Set<PlacementStatus> RECORDABLE =
            EnumSet.of(PlacementStatus.ACTIVE, PlacementStatus.COMPLETION_PENDING);

    private final PlacementRepository placements;
    private final PlacementAuthorization placementAuthorization;
    private final PlacementSupervisorAssignmentRepository assignments;
    private final UniversityAuthorization universityAuthorization;
    private final UniversityMembershipRepository universityMemberships;
    private final OrganizationMembershipRepository organizationMemberships;

    public InternshipManagementAuthorization(
            PlacementRepository placements,
            PlacementAuthorization placementAuthorization,
            PlacementSupervisorAssignmentRepository assignments,
            UniversityAuthorization universityAuthorization,
            UniversityMembershipRepository universityMemberships,
            OrganizationMembershipRepository organizationMemberships) {
        this.placements = placements;
        this.placementAuthorization = placementAuthorization;
        this.assignments = assignments;
        this.universityAuthorization = universityAuthorization;
        this.universityMemberships = universityMemberships;
        this.organizationMemberships = organizationMemberships;
    }

    // ---------------------------------------------------------------- placement lookup

    public Placement getOrThrow(UUID placementId) {
        return placements.findById(placementId).orElseThrow(this::placementNotFound);
    }

    /** Locks the placement row first, so an authorization decision cannot race a lifecycle change. */
    public Placement lock(UUID placementId) {
        return placements.findByIdForUpdate(placementId).orElseThrow(this::placementNotFound);
    }

    // ---------------------------------------------------------------- student

    /**
     * The owning student. A placement belonging to someone else is reported as NOT FOUND rather than
     * FORBIDDEN, so probing UUIDs cannot confirm another student's placement exists — the rule
     * Phases 4 and 5 already apply (CLAUDE.md section 12).
     */
    public Placement requireOwningStudent(UUID actingUserId, UUID placementId) {
        return placements.findById(placementId)
                .filter(placement -> placement.getStudentUserId().equals(actingUserId))
                .orElseThrow(this::placementNotFound);
    }

    /**
     * The owning student, on a placement that is actually running.
     *
     * <p>Weekly logs, disputes and report uploads describe an internship in progress. Allowing them
     * on a PLANNED placement would let a student file records for an internship that has not started,
     * and on a CANCELLED or COMPLETED one would let them alter a closed history.
     */
    public Placement requireOwningStudentOnRunningPlacement(UUID actingUserId, UUID placementId) {
        Placement placement = requireOwningStudent(actingUserId, placementId);
        requireRecordable(placement);
        return placement;
    }

    public boolean isOwningStudent(UUID actingUserId, Placement placement) {
        return placement.getStudentUserId().equals(actingUserId);
    }

    // ---------------------------------------------------------------- university

    /**
     * University staff acting on this placement's academic record.
     *
     * <p>Scope is resolved per role, against the placement's OWN university and department (its
     * historical academic context, not the student's current enrollment):
     * <ul>
     *   <li>{@code UNIVERSITY_ADMIN} — their whole university, and only theirs.</li>
     *   <li>{@code DEPARTMENT_COORDINATOR} — only their assigned departments. Sharing a university
     *       with the placement is not enough (CLAUDE.md section 25 — department isolation).</li>
     *   <li>{@code UNIVERSITY_SUPERVISOR} — only placements they are actively assigned to.</li>
     * </ul>
     */
    public Placement requireUniversityAcademicAccess(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);
        if (!hasUniversityScope(actingUserId, placement)) {
            throw accessDenied();
        }
        return placement;
    }

    public boolean hasUniversityScope(UUID actingUserId, Placement placement) {
        return universityScope(actingUserId, placement).isPresent();
    }

    /**
     * University staff who may COMPLETE a placement.
     *
     * <p>Deliberately narrower than academic access. Completion certifies that the university's own
     * requirements are met, so it is the university's decision and belongs to staff with standing
     * authority — an admin, or a coordinator over that department. A university supervisor reviews
     * and approves the work but does not close the internship, mirroring Phase 5, where supervising
     * a placement never implied authority to end it.
     *
     * <p>The hosting organization drives the Phase 5 lifecycle (start/terminate/request-completion)
     * and can see the completion checklist, but does not perform this transition.
     */
    public Placement requireUniversityCompletionAuthority(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);
        UniversityMembership membership = universityAuthorization.requireMembership(
                actingUserId, placement.getUniversityId(),
                UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);
        universityAuthorization.requireDepartmentScope(membership, placement.getDepartmentId());
        return placement;
    }

    /**
     * University staff who may configure an internship policy for a department.
     *
     * <p>Admins configure anything in their university; a coordinator may configure only their own
     * departments, and only the department level — the university-wide default belongs to the admin.
     */
    public UniversityMembership requirePolicyAuthority(UUID actingUserId, UUID universityId, UUID departmentId) {
        if (departmentId == null) {
            return universityAuthorization.requireMembership(
                    actingUserId, universityId, UniversityRole.UNIVERSITY_ADMIN);
        }
        UniversityMembership membership = universityAuthorization.requireMembership(
                actingUserId, universityId,
                UniversityRole.UNIVERSITY_ADMIN, UniversityRole.DEPARTMENT_COORDINATOR);
        universityAuthorization.requireDepartmentScope(membership, departmentId);
        return membership;
    }

    // ---------------------------------------------------------------- organization

    /**
     * The organization supervisor actually responsible for this placement right now.
     *
     * <p>This is the narrowest check in Phase 6, and intentionally so: recording attendance and
     * assessing a student are things the person who supervised them does. An organization admin or
     * recruiter can read both (they already have Phase 5 read access to the placement) but cannot
     * author them, because they did not observe the student.
     */
    public Placement requireAssignedOrganizationSupervisor(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);
        requireOrganizationMembership(actingUserId, placement);
        if (!isActivelyAssigned(actingUserId, placement, SupervisorType.ORGANIZATION)) {
            throw accessDenied();
        }
        return placement;
    }

    /** As above, plus the placement must actually be running. */
    public Placement requireAssignedOrganizationSupervisorOnRunningPlacement(UUID actingUserId, UUID placementId) {
        Placement placement = requireAssignedOrganizationSupervisor(actingUserId, placementId);
        requireRecordable(placement);
        return placement;
    }

    /** Any organization staff member in scope for this placement (Phase 5 read rules). */
    public boolean hasOrganizationScope(UUID actingUserId, Placement placement) {
        return placementAuthorization.hasOrganizationReadAccess(actingUserId, placement);
    }

    // ---------------------------------------------------------------- combined read scopes

    /**
     * Who may READ workplace content (attendance, and the evaluation once it is final): the owning
     * student, university staff in scope, or organization staff in scope.
     */
    public Placement requireWorkplaceReadAccess(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);
        boolean permitted = isOwningStudent(actingUserId, placement)
                || hasUniversityScope(actingUserId, placement)
                || hasOrganizationScope(actingUserId, placement);
        if (!permitted) {
            throw accessDenied();
        }
        return placement;
    }

    /**
     * Who may READ academic content (weekly logs, the final report, defense): the owning student and
     * university staff in scope ONLY.
     *
     * <p>Organization staff are excluded even though they can see the placement itself. A weekly log
     * is the student's reflective academic work and the final report is an academic submission;
     * neither is the host organization's to read by default (CLAUDE.md section 6/16). If a university
     * ever wants to share them, that becomes an explicit, opt-in product decision — not a default.
     */
    public Placement requireAcademicReadAccess(UUID actingUserId, UUID placementId) {
        Placement placement = getOrThrow(placementId);
        boolean permitted = isOwningStudent(actingUserId, placement)
                || hasUniversityScope(actingUserId, placement);
        if (!permitted) {
            throw accessDenied();
        }
        return placement;
    }

    /** Read access to the completion checklist — every party attached to the placement may see it. */
    public Placement requireCompletionReadAccess(UUID actingUserId, UUID placementId) {
        return requireWorkplaceReadAccess(actingUserId, placementId);
    }

    // ---------------------------------------------------------------- helpers

    private Optional<UniversityMembership> universityScope(UUID actingUserId, Placement placement) {
        Optional<UniversityMembership> membership =
                universityMemberships.findActiveByUniversityIdAndUserId(placement.getUniversityId(), actingUserId);
        if (membership.isEmpty() || !ACADEMIC_ROLES.contains(membership.get().getRole())) {
            return Optional.empty();
        }
        boolean inScope = switch (membership.get().getRole()) {
            case UNIVERSITY_ADMIN -> true;
            case DEPARTMENT_COORDINATOR -> hasDepartmentScope(membership.get(), placement);
            case UNIVERSITY_SUPERVISOR -> isActivelyAssigned(actingUserId, placement, SupervisorType.UNIVERSITY);
        };
        return inScope ? membership : Optional.empty();
    }

    private void requireOrganizationMembership(UUID actingUserId, Placement placement) {
        Optional<OrganizationMembership> membership = organizationMemberships
                .findActiveByOrganizationIdAndUserId(placement.getOrganizationId(), actingUserId);
        if (membership.isEmpty()) {
            throw accessDenied();
        }
    }

    private boolean hasDepartmentScope(UniversityMembership membership, Placement placement) {
        try {
            universityAuthorization.requireDepartmentScope(membership, placement.getDepartmentId());
            return true;
        } catch (ApiException e) {
            return false;
        }
    }

    /**
     * "Actively assigned" means an assignment row with {@code removed_at IS NULL} of the right type.
     * The type check matters: a university supervisor must not inherit an organization supervisor's
     * authority on the same placement, or vice versa.
     */
    private boolean isActivelyAssigned(UUID userId, Placement placement, SupervisorType type) {
        return assignments.findActive(placement.getId(), type)
                .filter(assignment -> assignment.getSupervisorUserId().equals(userId))
                .isPresent();
    }

    private void requireRecordable(Placement placement) {
        if (!RECORDABLE.contains(placement.getStatus())) {
            throw new ApiException("PLACEMENT_NOT_ACTIVE", HttpStatus.CONFLICT,
                    "This internship is not currently running, so its records cannot be changed.");
        }
    }

    private ApiException placementNotFound() {
        return new ApiException("PLACEMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "Placement not found.");
    }

    private ApiException accessDenied() {
        return new ApiException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "You do not have access to this placement.");
    }
}
