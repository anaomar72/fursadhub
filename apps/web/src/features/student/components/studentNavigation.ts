import type { TFunction } from 'i18next'
import { accountSettingsNavItem, type NavSection } from '../../../app/layouts/navigation'

/**
 * The student area's sidebar. Every signed-in account may enter this area — StudentAreaLayout
 * performs no membership check, because a student profile/enrollment is created inside it — so
 * there is no role branching here, only the routes that actually exist.
 *
 * <p>"Explore internships" stays inside the shell (Phase 8): `/student/opportunities` reads the same
 * public catalogue endpoint as the signed-out page, so a student never loses their navigation to
 * browse, and applying continues at `/student/opportunities/:id/apply`.
 */
export function buildStudentNav(t: TFunction): NavSection[] {
  return [
    // Phase 5: grouped by what the student is doing — finding an internship, then doing one — so
    // the internship has its own place instead of being the sixth item in one long list. Every
    // destination is a real route that exists for every student; nothing is hidden by state, so the
    // sidebar never shifts under the student as their records change.
    {
      items: [{ to: '/student/dashboard', label: t('student:nav.dashboard'), icon: 'home' }],
    },
    {
      label: t('student:nav.sections.opportunities'),
      items: [
        { to: '/student/opportunities', label: t('student:nav.exploreInternships'), icon: 'briefcase' },
        // Backend Phase B4. Every signed-in account reaches this area, and the page itself renders
        // the endpoint's own answer — a non-student simply sees the error state, not another
        // student's bookmarks, because the route is scoped to the caller server-side.
        { to: '/student/saved', label: t('student:nav.savedInternships'), icon: 'bookmark' },
        { to: '/student/applications', label: t('recruitment:nav.applications'), icon: 'clipboard' },
        { to: '/student/nominations', label: t('recruitment:nav.nominations'), icon: 'userCheck' },
      ],
    },
    {
      label: t('student:nav.sections.internship'),
      items: [{ to: '/student/placements', label: t('placements:nav.myPlacements'), icon: 'badgeCheck' }],
    },
    {
      label: t('common:shell.sections.account'),
      items: [
        { to: '/student/enrollment', label: t('student:nav.enrollment'), icon: 'graduationCap' },
        { to: '/student/profile', label: t('student:nav.profile'), icon: 'user' },
        accountSettingsNavItem(t),
      ],
    },
  ]
}
