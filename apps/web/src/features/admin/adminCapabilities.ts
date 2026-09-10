import type { AdminSession } from './types'

/**
 * What each platform role may actually do, mirrored one-for-one from {@code PlatformAuthorization}.
 *
 * <p>The backend splits platform authority in exactly two places and no others:
 * {@code requireReviewer} admits {@code SUPER_ADMIN} + {@code VERIFICATION_OFFICER}, and
 * {@code requireSuperAdmin} admits only the former. Everything below is one of those two checks,
 * named after the screen it governs so a page reads one answer instead of re-deriving
 * `roles.includes('SUPER_ADMIN')` in nine places.
 *
 * <p>Nothing here is a security boundary. Every admin endpoint re-checks the caller's CURRENT grant
 * against PostgreSQL, so a revoked administrator loses access on their next request rather than
 * when their access token expires — a wrong flag here means a wrong menu, never an open door
 * (CLAUDE.md section 24).
 */
export interface AdminCapabilities {
  /**
   * Institution verification: the organization and university queues, their review commands and
   * their evidence downloads. {@code PlatformAuthorization.requireReviewer} — the whole reason
   * {@code VERIFICATION_OFFICER} exists.
   */
  canReviewInstitutions: boolean

  /**
   * Escalated student verification cases. Also {@code requireReviewer}
   * ({@code AdminVerificationEscalationService}), so a verification officer works these too.
   */
  canReviewStudentCases: boolean

  /**
   * Platform-wide operational statistics. {@code PlatformStatisticsService.collect} requires
   * {@code SUPER_ADMIN}: the numbers identify nobody, but they describe the shape of the entire
   * platform, which is not something a reviewer needs in order to check one institution.
   */
  canReadStatistics: boolean

  /**
   * Reading and suspending/reactivating accounts. {@code AdminAccountService} is
   * {@code SUPER_ADMIN} throughout.
   */
  canAdministerAccounts: boolean

  /**
   * Granting and revoking platform roles. {@code PlatformAdminService} is {@code SUPER_ADMIN} —
   * a verification officer who could appoint administrators would be one.
   */
  canManagePlatformRoles: boolean

  /** Privacy requests and legal-document publishing — {@code SUPER_ADMIN} in the compliance module. */
  canAdministerCompliance: boolean

  /** The audit trail. {@code AdminAuditQueryService} is {@code SUPER_ADMIN}, and read-only. */
  canReadAuditTrail: boolean

  /**
   * Platform-wide opportunity oversight (Backend Phase B6). {@code AdminOpportunityQueryService} is
   * {@code SUPER_ADMIN}, deliberately NOT {@code requireReviewer}: reviewing an institution does not
   * require reading every draft internship on the platform, and a new endpoint is not a reason to
   * widen a split that exists on purpose. Read-only — there is no oversight write capability to flag.
   */
  canOverseeOpportunities: boolean
}

export function adminCapabilities(session: AdminSession): AdminCapabilities {
  const isSuperAdmin = session.roles.includes('SUPER_ADMIN')
  const isReviewer = isSuperAdmin || session.roles.includes('VERIFICATION_OFFICER')

  return {
    canReviewInstitutions: isReviewer,
    canReviewStudentCases: isReviewer,
    canReadStatistics: isSuperAdmin,
    canAdministerAccounts: isSuperAdmin,
    canManagePlatformRoles: isSuperAdmin,
    canAdministerCompliance: isSuperAdmin,
    canReadAuditTrail: isSuperAdmin,
    canOverseeOpportunities: isSuperAdmin,
  }
}

/**
 * Where a platform administrator should land when they open {@code /admin} with no destination, and
 * where {@link RequirePlatformCapability} sends them when they reach one they cannot use.
 *
 * <p>Derived from the same capability flags as the sidebar, in the order the console presents them,
 * so the answer is always a destination whose nav item that caller can actually see. A Super Admin
 * lands on the dashboard; a verification officer lands on the institution queue, which is their
 * work rather than a page of numbers they are refused.
 *
 * <p>Returns {@code null} when the caller holds a platform grant but no capability the console has a
 * page for — an unknown or withdrawn role. That case must NOT resolve to a path: the guard renders
 * a refusal instead, because redirecting a capability-less caller to a guarded route would bounce
 * between the two forever. Fail closed, and fail without a loop (CLAUDE.md section 26A).
 */
export function adminLandingPath(session: AdminSession): string | null {
  const can = adminCapabilities(session)

  if (can.canReadStatistics) return '/admin/dashboard'
  if (can.canReviewInstitutions) return '/admin/organizations'
  if (can.canReviewStudentCases) return '/admin/verification-escalations'
  if (can.canAdministerAccounts) return '/admin/users'
  return null
}

/**
 * The i18n key naming the console the caller is actually in.
 *
 * <p>Both platform roles share one shell, and it used to introduce itself as the "Super Admin
 * Console" to everyone — so a verification officer, whose sidebar is three review queues and who is
 * refused every Super Admin endpoint, was told they were sitting in the Super Admin console. Naming
 * a workspace after authority the reader does not have is the exact role confusion Phase E is meant
 * to remove.
 *
 * <p>Derived from capability rather than a role string, like everything else here: full platform
 * authority is what makes the console the Super Admin's, and {@code canManagePlatformRoles} is the
 * narrowest flag that means it.
 */
export function adminWorkspaceLabelKey(session: AdminSession): string {
  return adminCapabilities(session).canManagePlatformRoles
    ? 'common:shell.portals.admin'
    : 'common:shell.portals.verificationOfficer'
}
