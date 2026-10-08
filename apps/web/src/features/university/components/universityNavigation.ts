import type { TFunction } from 'i18next'
import { accountSettingsNavItem, type NavItem, type NavSection } from '../../../app/layouts/navigation'
import type { MyMembershipResponse } from '../types'
import { universityCapabilities } from '../universityCapabilities'

/**
 * The university area's sidebar, derived from the caller's CURRENT membership rather than from a
 * single admin menu with items switched off. Every rule comes from
 * {@link universityCapabilities}, which cites the server component that owns it:
 *
 * <ul>
 *   <li>Student directory and verification cases — {@code VerificationQueryService} requires
 *       {@code UNIVERSITY_ADMIN} or {@code DEPARTMENT_COORDINATOR}.</li>
 *   <li>Nomination requests and nominations — {@code NominationService}/{@code NominationQueryService}
 *       require the same two roles.</li>
 *   <li>Internship policy — {@code InternshipManagementAuthorization.requirePolicyAuthority} allows
 *       only those two roles.</li>
 *   <li>Staff provisioning — {@code UniversityStaffService} requires {@code UNIVERSITY_ADMIN}
 *       (CLAUDE.md section 26A).</li>
 *   <li>Placements and supervision — any active member; per-placement access is resolved by
 *       {@code PlacementAuthorization}/{@code InternshipManagementAuthorization}, so a supervisor
 *       reaches only what they are actively assigned.</li>
 * </ul>
 *
 * <p>A {@code DEPARTMENT_COORDINATOR} with no assigned department has no department scope at all,
 * and {@code UniversityAuthorization.requireDepartmentScope} denies every scoped operation for
 * them. Offering those destinations would be offering a guaranteed 403, so the scoped group is
 * omitted — the same fail-closed posture the backend takes (CLAUDE.md section 26A).
 *
 * <p>Navigation only: the backend re-authorizes every request against current PostgreSQL data, so
 * hiding an item is a courtesy and never the boundary (CLAUDE.md section 24).
 */
export function buildUniversityNav(t: TFunction, membership: MyMembershipResponse): NavSection[] {
  const can = universityCapabilities(membership)

  // Phase 7: grouped by the academic workflow — students, then nominations, then internships, then
  // the university itself. Every group is built from the same capability flags as before, and a
  // group with nothing in it for this role is omitted rather than shown empty. Order never depends
  // on counts.
  const overview: NavItem[] = [{ to: '/university/dashboard', label: t('university:nav.dashboard'), icon: 'home' }]

  const students: NavItem[] = []
  if (can.hasStudentDirectory) {
    students.push({ to: '/university/students', label: t('university:nav.students'), icon: 'graduationCap' })
  } else if (can.scopedToAssignedPlacements) {
    // A supervisor cannot read the university roster at all, so their student list is the distinct
    // students on the placements they are assigned to — a different route with different content,
    // not the directory with rows hidden.
    students.push({ to: '/university/my-students', label: t('university:nav.myStudents'), icon: 'graduationCap' })
  }
  if (can.canReviewStudents) {
    students.push({ to: '/university/verification-cases', label: t('university:nav.verificationQueue'), icon: 'shield' })
  }

  const nominations: NavItem[] = []
  if (can.canNominate) {
    nominations.push(
      { to: '/university/opportunity-requests', label: t('recruitment:nav.opportunityRequests'), icon: 'briefcase' },
      { to: '/university/nominations', label: t('recruitment:nav.nominations'), icon: 'userCheck' },
    )
  }

  const internships: NavItem[] = [{ to: '/university/placements', label: t('placements:nav.placements'), icon: 'badgeCheck' }]
  // Reviewing weekly logs, the final report and defense is open to all three roles, each confined to
  // its own scope by InternshipManagementAuthorization.requireUniversityAcademicAccess.
  if (can.canReviewAcademicRecords) {
    internships.push({ to: '/university/supervision', label: t('university:nav.supervision'), icon: 'document' })
  }
  // Partner organizations is an institution-wide read of who hosts this university's students.
  // A supervisor's placement list is their own two or three assignments, which is not a partner
  // directory — so this belongs with the roles whose placement list is institution- or
  // department-wide.
  if (!can.scopedToAssignedPlacements) {
    internships.push({ to: '/university/partners', label: t('university:nav.partners'), icon: 'building' })
  }

  const manage: NavItem[] = []
  if (can.canManageDepartments) {
    manage.push({ to: '/university/departments', label: t('university:nav.departments'), icon: 'layers' })
  }
  if (can.canConfigurePolicy) {
    manage.push({ to: '/university/internship-policy', label: t('internship:policy.title'), icon: 'clipboard' })
  }
  if (can.canProvisionStaff) {
    manage.push({ to: '/university/staff', label: t('university:nav.staff'), icon: 'users' })
  }
  // Editing the university record is UNIVERSITY_ADMIN only (UpdateUniversityService), so for an
  // admin it belongs under "Manage". Everyone else may still READ it — UniversityProfilePage shows
  // them the record without a form — so it appears under "Account" as a reference instead, matching
  // how the organization portal files the same distinction. A "Manage" heading over something the
  // role cannot manage is the misleading part, not the destination itself.
  if (can.canEditUniversityProfile) {
    manage.push({ to: '/university/profile', label: t('university:nav.profile'), icon: 'bank' })
  }

  const account: NavItem[] = [accountSettingsNavItem(t)]
  if (!can.canEditUniversityProfile) {
    account.push({ to: '/university/profile', label: t('university:nav.university'), icon: 'bank' })
  }

  const group = (label: string | undefined, items: NavItem[]): NavSection[] => (items.length > 0 ? [{ label, items }] : [])

  return [
    { items: overview },
    ...group(t('university:nav.sections.students'), students),
    ...group(t('university:nav.sections.nominations'), nominations),
    ...group(t('university:nav.sections.internships'), internships),
    ...group(t('university:nav.sections.university'), manage),
    { label: t('common:shell.sections.account'), items: account },
  ]
}
