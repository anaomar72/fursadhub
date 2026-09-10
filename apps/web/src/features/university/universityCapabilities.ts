import type { MyMembershipResponse } from './types'

/**
 * One place that answers "what may this university staff member actually do?", derived from the
 * caller's CURRENT membership — role plus resource scope — exactly as the backend derives it.
 *
 * <p>Every flag below cites the server component that owns the rule, so a reader can check the two
 * against each other. Nothing here is a security boundary: the API re-authorizes every request from
 * current PostgreSQL data, so a flag being wrong means a broken menu, never an open door
 * (CLAUDE.md section 24). It exists so that navigation, dashboards and page bodies all read the
 * same answer instead of each re-deriving `role === 'X'` in its own way.
 *
 * <p>Nothing here invents a scope type. The backend has exactly two for university staff —
 * assigned DEPARTMENTS ({@code university_membership_departments}, used by
 * {@code UniversityAuthorization.requireDepartmentScope}) and actively assigned PLACEMENTS
 * ({@code placement_supervisor_assignments}, used by
 * {@code InternshipManagementAuthorization.universityScope}) — and those are the only two modelled.
 */
export interface UniversityCapabilities {
  /**
   * Student directory + verification cases. {@code VerificationQueryService.scopedEnrollments}
   * requires {@code UNIVERSITY_ADMIN} or {@code DEPARTMENT_COORDINATOR}; a coordinator with no
   * assigned department has no scope at all and is refused by
   * {@code requireDepartmentScope}, so this fails closed for them.
   */
  canReviewStudents: boolean

  /** Nomination requests + nominations. {@code NominationService} takes the same two roles + scope. */
  canNominate: boolean

  /** Department admin. {@code UpdateDepartmentService} allows admins and the department's own coordinator. */
  canManageDepartments: boolean

  /** Internship policy. {@code InternshipManagementAuthorization.requirePolicyAuthority}. */
  canConfigurePolicy: boolean

  /** University-wide policy defaults are the admin's; a coordinator may only set department level. */
  canConfigureUniversityWidePolicy: boolean

  /** Managed staff provisioning. {@code UniversityStaffService} requires {@code UNIVERSITY_ADMIN} (section 26A). */
  canProvisionStaff: boolean

  /** Editing the institution record + submitting it for verification. {@code UpdateUniversityService}: admin only. */
  canEditUniversityProfile: boolean

  /**
   * Closing a placement. {@code InternshipManagementAuthorization.requireUniversityCompletionAuthority}
   * takes admins and coordinators in department scope — deliberately NOT supervisors, who review the
   * work but do not end the internship.
   */
  canCompletePlacements: boolean

  /**
   * Reviewing weekly logs, the final report and defense on placements in scope.
   * {@code requireUniversityAcademicAccess} admits all three roles, each narrowed to its own scope.
   */
  canReviewAcademicRecords: boolean

  /**
   * True when the caller's placement list is confined to their own supervisor assignments —
   * {@code PlacementQueryService.listForUniversity}'s {@code UNIVERSITY_SUPERVISOR} branch. Drives
   * wording ("students you supervise") and the choice of dashboard, not access.
   */
  scopedToAssignedPlacements: boolean

  /**
   * Whether this member can reach the university's own student roster endpoint at all. A supervisor
   * cannot, so their student list is derived from the placements they are assigned to instead.
   */
  hasStudentDirectory: boolean
}

export function universityCapabilities(membership: MyMembershipResponse): UniversityCapabilities {
  const isAdmin = membership.role === 'UNIVERSITY_ADMIN'
  const isCoordinator = membership.role === 'DEPARTMENT_COORDINATOR'
  const isSupervisor = membership.role === 'UNIVERSITY_SUPERVISOR'

  // A coordinator's every scoped operation is checked against their assigned departments. With an
  // empty set there is nothing they can reach, so the department-scoped capabilities go dark rather
  // than offering a guaranteed 403 — the same fail-closed posture as the server.
  const coordinatorInScope = isCoordinator && membership.departmentIds.length > 0
  const departmentScoped = isAdmin || coordinatorInScope

  return {
    canReviewStudents: departmentScoped,
    canNominate: departmentScoped,
    canManageDepartments: departmentScoped,
    canConfigurePolicy: departmentScoped,
    canConfigureUniversityWidePolicy: isAdmin,
    canProvisionStaff: isAdmin,
    canEditUniversityProfile: isAdmin,
    canCompletePlacements: departmentScoped,
    canReviewAcademicRecords: isAdmin || isCoordinator || isSupervisor,
    scopedToAssignedPlacements: isSupervisor,
    hasStudentDirectory: departmentScoped,
  }
}
