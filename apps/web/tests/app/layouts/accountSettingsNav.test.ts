import { describe, expect, it } from 'vitest'
import { accountSettingsNavItem, isNavItemActive } from '../../../src/app/layouts/navigation'
import { buildStudentNav } from '../../../src/features/student/components/studentNavigation'
import { buildAdminNav } from '../../../src/features/admin/components/adminNavigation'
import { buildOrganizationNav } from '../../../src/features/organization/components/organizationNavigation'
import { buildUniversityNav } from '../../../src/features/university/components/universityNavigation'
import i18n from '../../../src/lib/i18n'
import type { OrganizationRole } from '../../../src/features/organization/types'
import type { UniversityRole } from '../../../src/features/university/types'

/**
 * The primary rail's entry into the shared account area.
 *
 * <p>It was "Notifications" pointing at `/account/notifications` — one subsection standing in for
 * the whole section, which made Profile, Privacy and data and Share your story appear to live
 * somewhere else. It is now a single "Settings" entry on the section root, and these assertions pin
 * the two properties that make that work: it reaches the section, and it stays lit across all of it.
 */
const at = (pathname: string) => ({ pathname, search: '' })

function membership(role: OrganizationRole) {
  return { organizationId: 'org-1', organizationName: 'Acme', role, status: 'ACTIVE' } as never
}

function universityMembership(role: UniversityRole) {
  return { universityId: 'uni-1', universityName: 'Jamhuriya', role, status: 'ACTIVE', departmentIds: [] } as never
}

describe('the account settings nav item', () => {
  it('is labelled Settings and carries the settings icon', () => {
    const item = accountSettingsNavItem(i18n.t.bind(i18n))
    expect(item.label).toBe('Settings')
    expect(item.icon).toBe('settings')
  })

  it('points at the section root rather than at one of its pages', () => {
    // A leaf destination would privilege one subsection and, worse, would only ever be active on
    // its own page — leaving no primary item highlighted anywhere else in the section.
    expect(accountSettingsNavItem(i18n.t.bind(i18n)).to).toBe('/account')
  })

  it('stays active across every page of the account section', () => {
    const item = accountSettingsNavItem(i18n.t.bind(i18n))
    for (const pathname of [
      '/account',
      '/account/profile',
      '/account/notifications',
      '/account/privacy',
      '/account/testimonial',
    ]) {
      expect(isNavItemActive(item, at(pathname)), `Settings should be active on ${pathname}`).toBe(true)
    }
  })

  it('is not active outside the account section', () => {
    const item = accountSettingsNavItem(i18n.t.bind(i18n))
    for (const pathname of ['/student/dashboard', '/student/profile', '/organization/dashboard', '/admin/users']) {
      expect(isNavItemActive(item, at(pathname)), `Settings must not be active on ${pathname}`).toBe(false)
    }
  })

  it('does not claim the student academic profile, which is a different page', () => {
    // `/student/profile` is the profile shared with universities and organizations; `/account/profile`
    // is the FursadHub account itself. Renaming or absorbing the first was explicitly out of scope.
    const item = accountSettingsNavItem(i18n.t.bind(i18n))
    expect(isNavItemActive(item, at('/student/profile'))).toBe(false)
    expect(buildStudentNav(i18n.t.bind(i18n)).flatMap((s) => s.items).map((i) => i.to)).toContain('/student/profile')
  })
})

describe('every role reaches the account section the same way', () => {
  const navs: [string, { to: string }[]][] = [
    ['student', buildStudentNav(i18n.t.bind(i18n)).flatMap((s) => s.items)],
    ...(['ORGANIZATION_ADMIN', 'RECRUITER', 'ORGANIZATION_SUPERVISOR'] as OrganizationRole[]).map(
      (role) => [`organization ${role}`, buildOrganizationNav(i18n.t.bind(i18n), membership(role)).flatMap((s) => s.items)] as [string, { to: string }[]],
    ),
    ...(['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR'] as UniversityRole[]).map(
      (role) => [`university ${role}`, buildUniversityNav(i18n.t.bind(i18n), universityMembership(role)).flatMap((s) => s.items)] as [string, { to: string }[]],
    ),
    ['super admin', buildAdminNav(i18n.t.bind(i18n), { platformAdmin: true, roles: ['SUPER_ADMIN'] } as never).flatMap((s) => s.items)],
    ['verification officer', buildAdminNav(i18n.t.bind(i18n), { platformAdmin: true, roles: ['VERIFICATION_OFFICER'] } as never).flatMap((s) => s.items)],
  ]

  for (const [label, items] of navs) {
    it(`${label} has exactly one entry into the account section`, () => {
      const accountItems = items.map((i) => i.to).filter((to) => to === '/account' || to.startsWith('/account/'))
      // Exactly one: a subsection listed beside the umbrella would light up together with it,
      // because the umbrella matches by prefix.
      expect(accountItems).toEqual(['/account'])
    })
  }
})
