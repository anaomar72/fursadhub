import type { MyOrganizationMembershipResponse, OrganizationRole } from './types'

/**
 * One place that answers "what may this organization staff member actually do?", derived from the
 * caller's CURRENT membership, exactly as the backend derives it.
 *
 * <p>Every flag cites the server component that owns the rule. Nothing here is a security boundary:
 * the API re-authorizes each request from current PostgreSQL data, so a wrong flag means a broken
 * menu, never an open door (CLAUDE.md section 24). It exists so navigation, dashboards and page
 * bodies read one answer instead of each re-deriving `role === 'X'`.
 *
 * <p>Organization staff have **no resource scope model** in the backend. Unlike a university
 * coordinator's assigned departments, an organization membership carries a role and nothing else
 * ({@code OrganizationMembership}: organizationId + userId + role). The one narrowing that exists
 * is an {@code ORGANIZATION_SUPERVISOR}'s active placement assignments, which live on the placement
 * itself rather than on the membership. So there is no scope picker anywhere in this portal — there
 * is nothing for it to set.
 */
export interface OrganizationCapabilities {
  /**
   * Authoring internships: create, edit, publish/pause/resume/close/cancel, targets and screening
   * questions. {@code CreateOpportunityService}, {@code UpdateOpportunityService},
   * {@code OpportunityStateTransitionService}, {@code OpportunityTargetService} and
   * {@code ScreeningQuestionService} all require {@code ORGANIZATION_ADMIN} or {@code RECRUITER}.
   */
  canManageOpportunities: boolean

  /**
   * The candidate pipeline: reading the pool, review/shortlist/interview/reject, sending and
   * withdrawing offers. {@code CandidacyAuthorization.RECRUITING_ROLES} is exactly
   * {@code ORGANIZATION_ADMIN} + {@code RECRUITER}, so a supervisor never sees recruitment.
   */
  canManageCandidates: boolean

  /**
   * Driving a placement's lifecycle — start, cancel, terminate, request completion, assign the
   * organization supervisor. {@code PlacementAuthorization}'s organization-manage roles are the
   * same two; a supervisor supervises but does not run the lifecycle.
   */
  canManagePlacementLifecycle: boolean

  /** Managed staff provisioning. {@code OrganizationMembershipService} requires {@code ORGANIZATION_ADMIN}. */
  canManageStaff: boolean

  /**
   * Editing the organization record, uploading the logo, uploading verification evidence and
   * submitting for verification. {@code UpdateOrganizationService}/{@code OrganizationLogoService}
   * require {@code ORGANIZATION_ADMIN}.
   */
  canEditProfile: boolean

  /**
   * True when the caller's placement list is confined to their own supervisor assignments —
   * {@code PlacementQueryService.listForOrganization}'s {@code ORGANIZATION_SUPERVISOR} branch.
   * Drives wording and dashboard choice, never access.
   */
  scopedToAssignedPlacements: boolean

  /**
   * True for a {@code RECRUITER}: full recruiting authority, no authority over the organization
   * itself. Drives which home screen and which menu they get — a focused recruitment workspace
   * rather than the admin portal with controls greyed out. Never an access decision.
   */
  isRecruiter: boolean

  /**
   * Whether this member administers the organization at all — its record, its logo, its
   * verification and its staff. Exactly {@code ORGANIZATION_ADMIN}; it is the flag that decides
   * whether the "Manage" group in the sidebar has anything in it worth showing.
   */
  canAdministerOrganization: boolean
}

/**
 * The two roles an {@code ORGANIZATION_ADMIN} may assign, and the only two.
 * {@code OrganizationMembershipService.ASSIGNABLE_ROLES} refuses anything else — most importantly
 * another {@code ORGANIZATION_ADMIN}, closing the self-escalation path (CLAUDE.md section 23).
 */
export const ASSIGNABLE_ORGANIZATION_ROLES: OrganizationRole[] = ['RECRUITER', 'ORGANIZATION_SUPERVISOR']

export function organizationCapabilities(membership: MyOrganizationMembershipResponse): OrganizationCapabilities {
  const isAdmin = membership.role === 'ORGANIZATION_ADMIN'
  const isRecruiter = membership.role === 'RECRUITER'
  const isSupervisor = membership.role === 'ORGANIZATION_SUPERVISOR'
  const recruiting = isAdmin || isRecruiter

  return {
    canManageOpportunities: recruiting,
    canManageCandidates: recruiting,
    canManagePlacementLifecycle: recruiting,
    canManageStaff: isAdmin,
    canEditProfile: isAdmin,
    scopedToAssignedPlacements: isSupervisor,
    isRecruiter,
    canAdministerOrganization: isAdmin,
  }
}
