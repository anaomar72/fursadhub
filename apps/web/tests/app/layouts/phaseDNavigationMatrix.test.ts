import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../../src/lib/i18n'
import { buildStudentNav } from '../../../src/features/student/components/studentNavigation'
import { buildOrganizationNav } from '../../../src/features/organization/components/organizationNavigation'
import { buildUniversityNav } from '../../../src/features/university/components/universityNavigation'
import type { NavSection } from '../../../src/app/layouts/navigation'
import type { OrganizationRole } from '../../../src/features/organization/types'
import type { UniversityRole } from '../../../src/features/university/types'

function destinations(sections: NavSection[]): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.to))
}

function organizationNav(role: OrganizationRole) {
  return destinations(buildOrganizationNav(i18n.t, { organizationId: 'org-1', role }))
}

function universityNav(role: UniversityRole) {
  return destinations(buildUniversityNav(i18n.t, { universityId: 'uni-1', role, departmentIds: ['dept-it'] }))
}

/**
 * The Phase D navigation matrix: one place that states, for each of the seven roles in scope, what
 * its menu offers and — more importantly — what it must never offer.
 *
 * <p>The per-feature navigation tests already assert each portal's own rules in detail. This adds
 * the ACROSS-portal assertions those cannot make: that no role's menu reaches into another tenant
 * family's area, and that the two platform roles excluded from Phase D are untouched here.
 *
 * <p>Navigation is UX only. The backend re-authorizes every request from current PostgreSQL data,
 * so a hidden item is a courtesy and a visible one is never permission (CLAUDE.md section 24).
 */
describe('Phase D navigation matrix', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  describe('area isolation', () => {
    it('keeps the student menu inside /student and the shared /account area', () => {
      const items = destinations(buildStudentNav(i18n.t))

      // '/account' itself counts: the settings entry points at the section root, which is a real
      // route whose index redirects to /account/profile.
      expect(items.every((to) => to.startsWith('/student/') || to === '/account' || to.startsWith('/account/'))).toBe(true)
      expect(items.some((to) => to.startsWith('/organization/') || to.startsWith('/university/'))).toBe(false)
    })

    it.each<OrganizationRole>(['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR'])(
      'keeps the %s menu out of the student and university areas',
      (role) => {
        const items = organizationNav(role)

        expect(items.some((to) => to.startsWith('/university/'))).toBe(false)
        expect(items.some((to) => to.startsWith('/student/'))).toBe(false)
      },
    )

    it.each<UniversityRole>(['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR'])(
      'keeps the %s menu out of the student and organization areas',
      (role) => {
        const items = universityNav(role)

        expect(items.some((to) => to.startsWith('/organization/'))).toBe(false)
        expect(items.some((to) => to.startsWith('/student/'))).toBe(false)
      },
    )
  })

  describe('no Phase D role reaches the platform console', () => {
    /**
     * `/admin` belongs to SUPER_ADMIN and VERIFICATION_OFFICER, which Phase D excludes. No tenant
     * or student menu may offer a route into it — and the backend refuses those endpoints for these
     * roles regardless of what any menu renders.
     */
    it('offers no /admin destination to any of the seven roles', () => {
      const everyMenu = [
        destinations(buildStudentNav(i18n.t)),
        ...(['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR'] as OrganizationRole[]).map(organizationNav),
        ...(['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR'] as UniversityRole[]).map(
          universityNav,
        ),
      ]

      for (const menu of everyMenu) {
        expect(menu.some((to) => to.startsWith('/admin'))).toBe(false)
      }
    })
  })

  describe('tenant administration stays with the tenant admin', () => {
    it('offers staff provisioning only to ORGANIZATION_ADMIN', () => {
      expect(organizationNav('ORGANIZATION_ADMIN')).toContain('/organization/staff')
      expect(organizationNav('RECRUITER')).not.toContain('/organization/staff')
      expect(organizationNav('ORGANIZATION_SUPERVISOR')).not.toContain('/organization/staff')
    })

    /**
     * The tenant record is READABLE by every member — ProfilePage renders it without a form for a
     * non-admin — and EDITABLE only by the admin. So the destination exists for all three roles and
     * moves between groups: under "Manage" for the admin, under "Account" for everyone else, where
     * it reads as a reference rather than as something they can change.
     */
    it('files the organization record under Manage for the admin and Account for the others', () => {
      const groupOf = (role: OrganizationRole) => {
        const sections = buildOrganizationNav(i18n.t, { organizationId: 'org-1', role })
        return sections.find((section) => section.items.some((item) => item.to === '/organization/profile'))?.label
      }

      expect(groupOf('ORGANIZATION_ADMIN')).toBe('Manage')
      expect(groupOf('RECRUITER')).toBe('Account')
      expect(groupOf('ORGANIZATION_SUPERVISOR')).toBe('Account')
    })

    it('offers staff provisioning only to UNIVERSITY_ADMIN', () => {
      expect(universityNav('UNIVERSITY_ADMIN')).toContain('/university/staff')
      expect(universityNav('DEPARTMENT_COORDINATOR')).not.toContain('/university/staff')
      expect(universityNav('UNIVERSITY_SUPERVISOR')).not.toContain('/university/staff')
    })

    it('files the university record under Manage for the admin and Account for the others', () => {
      const groupOf = (role: UniversityRole) => {
        const sections = buildUniversityNav(i18n.t, {
          universityId: 'uni-1',
          role,
          departmentIds: ['dept-it'],
        })
        return sections.find((section) => section.items.some((item) => item.to === '/university/profile'))?.label
      }

      expect(groupOf('UNIVERSITY_ADMIN')).toBe('Manage')
      expect(groupOf('DEPARTMENT_COORDINATOR')).toBe('Account')
      expect(groupOf('UNIVERSITY_SUPERVISOR')).toBe('Account')
    })
  })

  describe('supervisors do not inherit their parent admin menu', () => {
    it('gives ORGANIZATION_SUPERVISOR no recruitment pipeline', () => {
      // CandidacyAuthorization.RECRUITING_ROLES is ORGANIZATION_ADMIN + RECRUITER only.
      const items = organizationNav('ORGANIZATION_SUPERVISOR')

      expect(items).not.toContain('/organization/candidates')
      expect(items).not.toContain('/organization/opportunities')
    })

    it('gives UNIVERSITY_SUPERVISOR none of the university-admin destinations', () => {
      const supervisor = universityNav('UNIVERSITY_SUPERVISOR')
      const admin = universityNav('UNIVERSITY_ADMIN')

      expect(supervisor.length).toBeLessThan(admin.length)
      expect(supervisor).not.toContain('/university/departments')
      expect(supervisor).not.toContain('/university/students')
    })
  })

  describe('every destination is a real route', () => {
    /**
     * A menu item pointing at a path with no route renders the 404 page, which reads as a broken
     * product rather than as a permission decision.
     */
    it('offers only paths under a known area prefix', () => {
      // Each area's ROOT is a destination too — the shared settings entry points at '/account',
      // whose index route redirects to /account/profile — so an area matches its root or anything
      // beneath it, not only the latter.
      const known = ['/student', '/organization', '/university', '/account']
      const everyItem = [
        destinations(buildStudentNav(i18n.t)),
        ...(['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR'] as OrganizationRole[]).map(organizationNav),
        ...(['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR'] as UniversityRole[]).map(
          universityNav,
        ),
      ].flat()

      for (const to of everyItem) {
        // Exactly the root, or genuinely beneath it — a bare `startsWith` would also accept
        // '/studentfoo', which is not in the student area at all.
        expect(
          known.some((area) => to === area || to.startsWith(`${area}/`)),
          `${to} is outside every known area`,
        ).toBe(true)
      }
    })

    it('labels every destination in the current language', () => {
      const sections = [
        ...buildStudentNav(i18n.t),
        ...buildOrganizationNav(i18n.t, { organizationId: 'org-1', role: 'ORGANIZATION_ADMIN' }),
        ...buildUniversityNav(i18n.t, { universityId: 'uni-1', role: 'UNIVERSITY_ADMIN', departmentIds: [] }),
      ]

      for (const item of sections.flatMap((section) => section.items)) {
        // An untranslated key falls through as the key itself, which always contains a colon.
        expect(item.label, `${item.to} has no translation`).not.toContain(':')
        expect(item.label.length).toBeGreaterThan(0)
      }
    })

    it('labels every destination in Somali as well', async () => {
      await i18n.changeLanguage('so')
      try {
        const sections = [
          ...buildStudentNav(i18n.t),
          ...buildOrganizationNav(i18n.t, { organizationId: 'org-1', role: 'ORGANIZATION_ADMIN' }),
          ...buildUniversityNav(i18n.t, { universityId: 'uni-1', role: 'UNIVERSITY_ADMIN', departmentIds: [] }),
        ]

        for (const item of sections.flatMap((section) => section.items)) {
          expect(item.label, `${item.to} has no Somali translation`).not.toContain(':')
        }
      } finally {
        await i18n.changeLanguage('en')
      }
    })
  })
})
