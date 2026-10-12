import type { TFunction } from 'i18next'
import { accountSettingsNavItem, type NavItem, type NavSection } from '../../../app/layouts/navigation'
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

  // Phase 6: grouped by the work each destination is for — recruiting, then running internships,
  // then the organization itself. Every gate is unchanged; a role simply gets fewer groups, and a
  // group with nothing in it for that role is not drawn at all. Counts never move items around.
  const overview: NavItem[] = [{ to: '/organization/dashboard', label: t('organization:nav.dashboard'), icon: 'home' }]

  const recruitment: NavItem[] = []
  if (can.canManageOpportunities) {
    recruitment.push({ to: '/organization/opportunities', label: t('organization:nav.opportunities'), icon: 'briefcase' })
  }
  if (can.canManageCandidates) {
    recruitment.push({ to: '/organization/candidates', label: t('recruitment:nav.candidates'), icon: 'users', end: true })
    // Shortlist is not an entity — it is the SHORTLISTED candidacy status, so this is the same
    // pool with that stage pinned in the URL rather than a second list with its own state.
    recruitment.push({
      to: '/organization/candidates?stage=SHORTLISTED',
      label: t('recruitment:nav.shortlist'),
      icon: 'userCheck',
    })
  }

  // A supervisor's placement list IS their intern list — PlacementQueryService narrows it to their
  // active assignments — so the same route is labelled for what it holds for them. Attendance and
  // the evaluation are the only two internship records that role may act on, which is the
  // supervision queue; weekly logs, the final report and the defense are university-only.
  const internships: NavItem[] = [
    {
      to: '/organization/placements',
      label: can.scopedToAssignedPlacements ? t('organization:nav.myInterns') : t('organization:nav.interns'),
      icon: 'badgeCheck',
    },
  ]
  if (can.scopedToAssignedPlacements) {
    internships.push({ to: '/organization/supervision', label: t('organization:nav.supervision'), icon: 'clipboard' })
  }

  // The organization itself — its record, its staff, and the universities it works with — belongs
  // to the role that administers it.
  const organization: NavItem[] = []
  if (can.canAdministerOrganization) {
    organization.push(
      { to: '/organization/profile', label: t('organization:nav.profile'), icon: 'building' },
      { to: '/organization/staff', label: t('organization:nav.staff'), icon: 'users' },
      { to: '/organization/partners', label: t('organization:nav.partners'), icon: 'bank' },
    )
  }

  // Everyone's own account. A recruiter's settings are their account's — the organization record is
  // not theirs to change, so it appears here as a read-only reference rather than under "Manage",
  // which for them would be a heading over nothing they can manage.
  /*
   * One entry, not two. `/account/profile` used to sit here beside the account link, but it is a
   * subsection of the settings area rather than a peer of it — and listing both meant two primary
   * items lit up together on `/account/profile`, since the umbrella matches by prefix. It is
   * reached from the settings area's own navigation instead.
   */
  const account: NavItem[] = [accountSettingsNavItem(t)]
  if (!can.canAdministerOrganization) {
    account.push({ to: '/organization/profile', label: t('organization:nav.organization'), icon: 'building' })
  }

  return [
    { items: overview },
    ...(recruitment.length > 0 ? [{ label: t('organization:nav.sections.recruitment'), items: recruitment }] : []),
    { label: t('organization:nav.sections.internships'), items: internships },
    ...(organization.length > 0 ? [{ label: t('organization:nav.sections.organization'), items: organization }] : []),
    { label: t('common:shell.sections.account'), items: account },
  ]
}
