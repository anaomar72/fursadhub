import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { AppShell } from './AppShell'
import { LoadingSpinner } from '../../components/ui'
import * as adminApi from '../../features/admin/api/adminApi'
import * as organizationApi from '../../features/organization/api/organizationApi'
import * as universityApi from '../../features/university/api/universityApi'
import { buildAdminNav } from '../../features/admin/components/adminNavigation'
import { buildOrganizationNav } from '../../features/organization/components/organizationNavigation'
import { buildUniversityNav } from '../../features/university/components/universityNavigation'
import { buildStudentNav } from '../../features/student/components/studentNavigation'
import { isNotFound, studentQueries } from '../../features/student/studentQueries'
import { GET_STARTED_PATH } from '../../features/auth/roleRedirect'
import { accountSettingsNavItem } from './navigation'
import { adminWorkspaceLabelKey } from '../../features/admin/adminCapabilities'

/**
 * Renders content inside the SIGNED-IN PERSON'S OWN PORTAL, whatever that portal is.
 *
 * <p><strong>The problem this solves.</strong> Account pages — profile, notifications, privacy,
 * testimonial — belong to every role, so they were given an area of their own with its own
 * {@link AppShell} and a four-item sidebar. The effect was that opening Profile REPLACED the
 * primary navigation: a student lost Dashboard, Applications and Placements; a recruiter lost
 * Candidates and Internships. On a phone it was worse, because the one hamburger then opened the
 * account list, so there was no route back to the portal at all short of the browser's Back button.
 * Personal settings are secondary navigation; the role portal is primary. This restores that order.
 *
 * <p><strong>Why not nest the account routes under each area instead.</strong> That would work, but
 * it would either duplicate four pages across four areas — the exact duplication the account area
 * was created to avoid — or move every URL to `/student/account/...`, `/organization/account/...`
 * and so on, breaking links people already hold. The pages and their addresses stay exactly where
 * they are; only the shell around them changes.
 *
 * <p><strong>How the portal is chosen.</strong> By the same membership probes
 * {@code resolveConsolePath} already uses to decide where to send someone after they sign in, in
 * the same precedence order, so the shell a person sees on an account page is always the shell they
 * would land in from the login form. Roles are contextual (CLAUDE.md section 23) — there is no
 * fixed role on the account itself — so the answer has to come from membership data, and it comes
 * from exactly one place rather than two that could disagree.
 *
 * <p><strong>This is navigation, not authorization.</strong> Nothing here grants anything. The
 * sidebar it builds is the same one the area itself builds from the same membership record, and
 * every page behind every one of those links is re-authorized by the backend on every request
 * (CLAUDE.md section 24). A caller with no membership anywhere gets the student rail, which is what
 * they would get from the login form too, and the student area performs no membership check
 * because every account may enter it.
 *
 * <p><strong>Bundle cost: none.</strong> The four navigation builders are pure label/icon functions
 * whose only real imports are the capability modules, and those — along with the three API clients
 * — are already in the entry graph because the route guards import them. No page component and no
 * portal chunk is pulled in by rendering this.
 */
export function RoleShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  /*
   * The same query keys the area layouts use, so on a navigation from inside a portal these are
   * already cached and this costs no additional request. `retry: false` because a 403/404 here is
   * the ordinary answer for "not a member", not a failure worth retrying.
   */
  const adminQuery = useQuery({ queryKey: ['admin', 'session'], queryFn: adminApi.getAdminSession, retry: false })
  const organizationQuery = useQuery({
    queryKey: ['organization', 'my-memberships'],
    queryFn: organizationApi.getMyMemberships,
    retry: false,
  })
  const universityQuery = useQuery({
    queryKey: ['university', 'my-membership'],
    queryFn: universityApi.getMyMembership,
    retry: false,
  })

  /*
   * No staff or platform membership: is this a STUDENT, or an account that has set nothing up yet?
   * Registration stores no account type, so the answer is the student's own records — a claimed
   * enrollment or a saved profile — read through the student area's own cache entries. Only a 404
   * counts as absence (the same rule sign-in uses in resolveAccountWorkspace); any other failure keeps
   * the student shell, so a network hiccup never strips a real student of their navigation. These
   * two reads run only for accounts with no membership at all, never for staff.
   */
  const membershipsResolved = !adminQuery.isLoading && !organizationQuery.isLoading && !universityQuery.isLoading
  const noMembership =
    membershipsResolved && !adminQuery.data?.platformAdmin && !organizationQuery.data?.[0] && !universityQuery.data
  const enrollmentQuery = useQuery({ ...studentQueries.enrollment(), enabled: noMembership })
  const profileQuery = useQuery({ ...studentQueries.profile(), enabled: noMembership })

  const resolving =
    !membershipsResolved || (noMembership && (enrollmentQuery.isLoading || profileQuery.isLoading))
  if (resolving) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner size="lg" label={t('common:status.loading')} />
      </div>
    )
  }

  const adminSession = adminQuery.data
  const organizationMembership = organizationQuery.data?.[0]
  const universityMembership = universityQuery.data

  if (adminSession?.platformAdmin) {
    return (
      <AppShell
        workspace="platform"
        areaLabel={t('common:nav.admin')}
        tone="navy"
        brand={{ portalLabel: t(adminWorkspaceLabelKey(adminSession)) }}
        sections={buildAdminNav(t, adminSession)}
      >
        {children}
      </AppShell>
    )
  }

  if (organizationMembership) {
    return (
      <AppShell
        workspace="organization"
        areaLabel={t('common:nav.organization')}
        sections={buildOrganizationNav(t, organizationMembership)}
        brand={{ portalLabel: t('common:shell.portals.organization') }}
      >
        {children}
      </AppShell>
    )
  }

  if (universityMembership) {
    return (
      <AppShell
        workspace="university"
        areaLabel={t('common:nav.university')}
        tone="navy"
        sections={buildUniversityNav(t, universityMembership)}
        brand={{ portalLabel: t('common:shell.portals.university') }}
      >
        {children}
      </AppShell>
    )
  }

  const hasNoStudentRecord =
    enrollmentQuery.isError && isNotFound(enrollmentQuery.error) && profileQuery.isError && isNotFound(profileQuery.error)
  if (hasNoStudentRecord) {
    // Signed in, nothing set up yet: a neutral account shell — the way into setup and the account's
    // own settings — rather than Student navigation for someone who is not a student. Navigation
    // only; nothing here grants or withholds access (CLAUDE.md section 24).
    return (
      <AppShell
        workspace="neutral"
        areaLabel={t('common:nav.account')}
        sections={[
          { items: [{ to: GET_STARTED_PATH, label: t('common:nav.getStarted'), icon: 'home' }] },
          { label: t('common:shell.sections.account'), items: [accountSettingsNavItem(t)] },
        ]}
      >
        {children}
      </AppShell>
    )
  }

  return (
    <AppShell workspace="student" areaLabel={t('common:nav.student')} sections={buildStudentNav(t)}>
      {children}
    </AppShell>
  )
}
