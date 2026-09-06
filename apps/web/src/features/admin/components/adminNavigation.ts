import type { TFunction } from 'i18next'
import type { NavItem, NavSection } from '../../../app/layouts/navigation'
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
  // Backend Phase B6. Sits with the platform-wide reads rather than in the verification group: it is
  // oversight of what organizations have posted, not a review queue anyone works through.
  if (can.canOverseeOpportunities) {
    primary.push({ to: '/admin/opportunities', label: t('admin:nav.opportunities'), icon: 'briefcase' })
  }

  const sections: NavSection[] = [{ items: primary }]

  if (can.canReviewInstitutions || can.canReviewStudentCases) {
    const verification: NavItem[] = []
    if (can.canReviewInstitutions) {
      verification.push(
        { to: '/admin/organizations', label: t('admin:nav.organizations'), icon: 'building' },
        { to: '/admin/universities', label: t('admin:nav.universities'), icon: 'bank' },
      )
    }
    if (can.canReviewStudentCases) {
      verification.push({
        to: '/admin/verification-escalations',
        label: t('admin:nav.escalations'),
        icon: 'shield',
      })
    }
    sections.push({ label: t('admin:nav.verification'), items: verification })
  }

  // Everything that governs the platform itself rather than a record inside it. Super Admin only,
  // and grouped so the console reads as "review work" above and "platform governance" below.
  if (can.canManagePlatformRoles || can.canAdministerCompliance || can.canReadAuditTrail) {
    const platform: NavItem[] = []
    if (can.canManagePlatformRoles) {
      platform.push({ to: '/admin/platform-roles', label: t('admin:nav.platformRoles'), icon: 'lock' })
    }
    if (can.canAdministerCompliance) {
      platform.push(
        { to: '/admin/privacy-requests', label: t('admin:nav.privacyRequests'), icon: 'document' },
        { to: '/admin/legal-documents', label: t('admin:nav.legalDocuments'), icon: 'scale' },
      )
    }
    if (can.canReadAuditTrail) {
      platform.push({ to: '/admin/audit', label: t('admin:nav.audit'), icon: 'chart' })
    }
    sections.push({ label: t('admin:nav.platform'), items: platform })
  }

  sections.push({
    label: t('common:shell.sections.account'),
    items: [
      { to: '/account/notifications', label: t('notifications:title'), icon: 'bell' },
      { to: '/account/profile', label: t('account:nav.profile'), icon: 'user' },
    ],
  })

  return sections
}
