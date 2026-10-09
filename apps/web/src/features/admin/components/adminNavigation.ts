import type { TFunction } from 'i18next'
import { accountSettingsNavItem, type NavItem, type NavSection } from '../../../app/layouts/navigation'
import { adminCapabilities } from '../adminCapabilities'
import type { AdminSession } from '../types'

/**
 * The platform console's sidebar, derived from the caller's CURRENT platform grants.
 *
 * <p>The split is exactly {@code PlatformAuthorization}'s, read through {@code adminCapabilities}: a
 * {@code VERIFICATION_OFFICER} exists to review institutions and escalated student cases, so they
 * get the three verification queues and nothing else. Statistics, accounts, platform roles,
 * compliance and the audit trail are all {@code requireSuperAdmin}.
 *
 * <p>The two roles get genuinely different consoles, not one console with items greyed out — an
 * officer's sidebar is their queue, in the order they work it.
 *
 * <p>Navigation only. Every admin endpoint re-checks the caller's grant against current PostgreSQL
 * data, so a hidden destination reached by typing its URL still answers 403, and a revoked
 * administrator loses access on their next request rather than when their token expires
 * (CLAUDE.md section 24).
 */
export function buildAdminNav(t: TFunction, session: AdminSession): NavSection[] {
  const can = adminCapabilities(session)

  const primary: NavItem[] = []
  if (can.canReadStatistics) {
    primary.push({ to: '/admin/dashboard', label: t('admin:nav.dashboard'), icon: 'home' })
  }
  if (can.canAdministerAccounts) {
    primary.push({ to: '/admin/users', label: t('admin:nav.users'), icon: 'users' })
  }
  // A verification officer has no overview destinations, so their menu starts at their queue.
  const sections: NavSection[] = primary.length > 0 ? [{ items: primary }] : []

  if (can.canReviewInstitutions || can.canReviewStudentCases) {
    const verification: NavItem[] = []
    if (can.canReviewInstitutions) {
      verification.push(
        { to: '/admin/organizations', label: t('admin:nav.organizations'), icon: 'building' },
        { to: '/admin/universities', label: t('admin:nav.universities'), icon: 'bank' },
      )
    }
    if (can.canReviewStudentCases) {
      verification.push({ to: '/admin/verification-escalations', label: t('admin:nav.escalations'), icon: 'shield' })
    }
    sections.push({ label: t('admin:nav.verification'), items: verification })
  }

  // Phase 8: day-to-day operational queues and oversight, apart from the settings that govern the
  // platform itself. Every item is Super Admin only, exactly as before; only the grouping changed.
  const operations: NavItem[] = []
  if (can.canAdministerCompliance) {
    operations.push(
      { to: '/admin/privacy-requests', label: t('admin:nav.privacyRequests'), icon: 'document' },
      { to: '/admin/testimonials', label: t('admin:nav.testimonials'), icon: 'sparkle' },
    )
  }
  // Backend Phase B6: read-only oversight of what organizations have posted, not a review queue.
  if (can.canOverseeOpportunities) {
    operations.push({ to: '/admin/opportunities', label: t('admin:nav.opportunities'), icon: 'briefcase' })
  }
  if (operations.length > 0) sections.push({ label: t('admin:nav.operations'), items: operations })

  const platform: NavItem[] = []
  if (can.canManagePlatformRoles) {
    platform.push({ to: '/admin/platform-roles', label: t('admin:nav.platformRoles'), icon: 'lock' })
  }
  if (can.canAdministerCompliance) {
    platform.push({ to: '/admin/legal-documents', label: t('admin:nav.legalDocuments'), icon: 'scale' })
  }
  if (can.canReadAuditTrail) {
    platform.push({ to: '/admin/audit', label: t('admin:nav.audit'), icon: 'chart' })
  }
  if (platform.length > 0) sections.push({ label: t('admin:nav.platform'), items: platform })

  /*
   * One entry, not two. `/account/profile` used to sit here beside the account link, but it is a
   * subsection of the settings area rather than a peer of it — and listing both meant two primary
   * items lit up together on `/account/profile`, since the umbrella matches by prefix. It is
   * reached from the settings area's own navigation instead.
   */
  sections.push({
    label: t('common:shell.sections.account'),
    items: [accountSettingsNavItem(t)],
  })

  return sections
}
