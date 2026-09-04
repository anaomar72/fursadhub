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
  }
}
