import type { TFunction } from 'i18next'
import type { NavItem, NavSection } from '../../../app/layouts/navigation'
import type { MyOrganizationMembershipResponse } from '../types'
import { organizationCapabilities } from '../organizationCapabilities'

/**
 * The organization area's sidebar, derived from the caller's CURRENT membership. Every rule comes
 * from {@link organizationCapabilities}, which cites the server component that owns it:
 *
 * <ul>
 *   <li>Internship authoring — {@code CreateOpportunityService}/{@code UpdateOpportunityService}
 *       require {@code ORGANIZATION_ADMIN} or {@code RECRUITER}.</li>
 *   <li>Candidates — {@code CandidacyAuthorization.RECRUITING_ROLES} is those same two roles, so an
 *       {@code ORGANIZATION_SUPERVISOR} never gets the recruitment pipeline at all.</li>
 *   <li>Staff and the organization record — {@code OrganizationMembershipService} and
 *       {@code UpdateOrganizationService} require {@code ORGANIZATION_ADMIN}
 *       (CLAUDE.md section 26A).</li>
 *   <li>Interns — any active member; {@code PlacementAuthorization} then resolves the caller's real
 *       relationship to each placement, which is how a supervisor sees only their own.</li>
 * </ul>
 *
 * <p>The three roles get genuinely different menus, not one menu with items greyed out. A recruiter
 * in particular gets a recruitment workspace — their queues, in the order they work them — rather
 * than the admin portal minus its admin items.
 *
 * <p>Navigation only: the backend re-authorizes every request against current PostgreSQL data, so
 * hiding an item is a courtesy and never the boundary (CLAUDE.md section 24).
 */
export function buildOrganizationNav(t: TFunction, membership: MyOrganizationMembershipResponse): NavSection[] {
  const can = organizationCapabilities(membership)

  const primary: NavItem[] = [{ to: '/organization/dashboard', label: t('organization:nav.dashboard'), icon: 'home' }]

  if (can.canManageOpportunities) {
    primary.push({ to: '/organization/opportunities', label: t('organization:nav.opportunities'), icon: 'briefcase' })
  }
  if (can.canManageCandidates) {
    primary.push({ to: '/organization/candidates', label: t('recruitment:nav.candidates'), icon: 'users', end: true })
    // Shortlist is not an entity — it is the SHORTLISTED candidacy status, so this is the same
    // pool with that stage pinned in the URL rather than a second list with its own state.
    primary.push({
      to: '/organization/candidates?stage=SHORTLISTED',
      label: t('recruitment:nav.shortlist'),
      icon: 'userCheck',
    })
  }

  // A supervisor's placement list IS their intern list — PlacementQueryService narrows it to their
  // active assignments — so the same route is labelled for what it holds for them.
  primary.push({
    to: '/organization/placements',
    label: can.scopedToAssignedPlacements ? t('organization:nav.myInterns') : t('organization:nav.interns'),
    icon: 'badgeCheck',
  })

  // Attendance and the evaluation are the only two internship records this role may act on
  // (AttendanceService and PlacementEvaluationService both require the ASSIGNED organization
  // supervisor). Weekly logs, the final report and the defense are university-only, so there is
  // nothing else to put here.
  if (can.scopedToAssignedPlacements) {
    primary.push({ to: '/organization/supervision', label: t('organization:nav.supervision'), icon: 'clipboard' })
  }

  // Partner universities read the organization-wide placement list to describe who the organization
  // works with. That is an institution-relationship view, not recruitment and not supervision, so
  // it belongs to the role that administers the organization.
  if (can.canAdministerOrganization) {
    primary.push({ to: '/organization/partners', label: t('organization:nav.partners'), icon: 'bank' })
  }

  const manage: NavItem[] = []
  if (can.canAdministerOrganization) {
    manage.push(
      { to: '/organization/profile', label: t('organization:nav.profile'), icon: 'building' },
      { to: '/organization/staff', label: t('organization:nav.staff'), icon: 'users' },
    )
  }

  // Everyone's own account. A recruiter's settings are their account's — the organization record is
  // not theirs to change, so it appears here as a read-only reference rather than under "Manage",
  // which for them would be a heading over nothing they can manage.
  const account: NavItem[] = [
    { to: '/account/notifications', label: t('notifications:title'), icon: 'bell' },
    { to: '/account/profile', label: t('account:nav.profile'), icon: 'user' },
  ]
  if (!can.canAdministerOrganization) {
    account.push({ to: '/organization/profile', label: t('organization:nav.organization'), icon: 'building' })
  }

  return [
    { items: primary },
    ...(manage.length > 0 ? [{ label: t('common:shell.sections.manage'), items: manage }] : []),
    { label: t('common:shell.sections.account'), items: account },
  ]
}
