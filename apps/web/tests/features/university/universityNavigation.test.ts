import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../../src/lib/i18n'
import { buildUniversityNav } from '../../../src/features/university/components/universityNavigation'
import type { MyMembershipResponse } from '../../../src/features/university/types'

function membership(overrides: Partial<MyMembershipResponse> = {}): MyMembershipResponse {
  return { universityId: 'univ-1', role: 'UNIVERSITY_ADMIN', departmentIds: [], ...overrides }
}

function destinations(sections: ReturnType<typeof buildUniversityNav>): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.to))
}

describe('buildUniversityNav', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('gives a university admin the full staff menu', () => {
    const items = destinations(buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_ADMIN' })))

    expect(items).toEqual(
      expect.arrayContaining([
        '/university/dashboard',
        '/university/students',
        '/university/verification-cases',
        '/university/opportunity-requests',
        '/university/nominations',
        '/university/placements',
        '/university/departments',
        '/university/internship-policy',
        '/university/staff',
      ]),
    )
  })

  it('never offers staff provisioning to a coordinator or a supervisor', () => {
    // UniversityStaffService requires UNIVERSITY_ADMIN (CLAUDE.md section 26A).
    expect(destinations(buildUniversityNav(i18n.t, membership({ role: 'DEPARTMENT_COORDINATOR', departmentIds: ['dept-1'] }))))
      .not.toContain('/university/staff')
    expect(destinations(buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_SUPERVISOR' }))))
      .not.toContain('/university/staff')
  })

  it('gives a supervisor a focused menu, not the admin menu with items removed', () => {
    // A supervisor's scope is assigned placements only (CLAUDE.md section 25), and the student
    // directory, verification queue, nominations and policy endpoints all reject the role outright.
    const items = destinations(buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_SUPERVISOR' })))

    expect(items).toContain('/university/dashboard')
    expect(items).toContain('/university/placements')
    expect(items).not.toContain('/university/students')
    expect(items).not.toContain('/university/verification-cases')
    expect(items).not.toContain('/university/nominations')
    expect(items).not.toContain('/university/opportunity-requests')
    expect(items).not.toContain('/university/internship-policy')
    expect(items).not.toContain('/university/departments')
  })

  it('routes a supervisor to their own roster instead of the university directory', () => {
    // GET /universities/{id}/students admits only UNIVERSITY_ADMIN/DEPARTMENT_COORDINATOR, so the
    // supervisor gets a different destination with different content — never the directory route.
    const items = destinations(buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_SUPERVISOR' })))

    expect(items).toContain('/university/my-students')
    expect(items).not.toContain('/university/students')
  })

  it('keeps the derived roster away from roles that have the real directory', () => {
    for (const role of ['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR'] as const) {
      const items = destinations(buildUniversityNav(i18n.t, membership({ role, departmentIds: ['dept-1'] })))
      expect(items).toContain('/university/students')
      expect(items).not.toContain('/university/my-students')
    }
  })

  it('offers the supervision queue to every role, since all three review in their own scope', () => {
    // requireUniversityAcademicAccess admits all three roles, each narrowed by the server:
    // whole university, assigned departments, or assigned placements.
    for (const role of ['UNIVERSITY_ADMIN', 'DEPARTMENT_COORDINATOR', 'UNIVERSITY_SUPERVISOR'] as const) {
      const items = destinations(buildUniversityNav(i18n.t, membership({ role, departmentIds: ['dept-1'] })))
      expect(items).toContain('/university/supervision')
    }
  })

  it('does not offer a supervisor an institution-wide partner directory', () => {
    // Partners are derived from the placement list; a supervisor's list is their own two or three
    // assignments, which is not a directory of who the university works with.
    expect(destinations(buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_SUPERVISOR' }))))
      .not.toContain('/university/partners')
    expect(destinations(buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_ADMIN' }))))
      .toContain('/university/partners')
  })

  it('never offers a supervisor a department or university-wide destination', () => {
    const items = destinations(buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_SUPERVISOR', departmentIds: ['dept-1'] })))

    // Department rows on a supervisor membership must not promote them to coordinator reach.
    expect(items).not.toContain('/university/students')
    expect(items).not.toContain('/university/departments')
    expect(items).not.toContain('/university/internship-policy')
    expect(items).not.toContain('/university/staff')
  })

  it('gives a scoped coordinator the department-scoped destinations', () => {
    const items = destinations(
      buildUniversityNav(i18n.t, membership({ role: 'DEPARTMENT_COORDINATOR', departmentIds: ['dept-1'] })),
    )

    expect(items).toEqual(
      expect.arrayContaining([
        '/university/students',
        '/university/verification-cases',
        '/university/nominations',
        '/university/internship-policy',
      ]),
    )
  })

  it('fails closed for a coordinator with no assigned department', () => {
    // UniversityAuthorization.requireDepartmentScope denies every scoped operation for a coordinator
    // with an empty scope, so offering those destinations would offer a guaranteed 403.
    const items = destinations(buildUniversityNav(i18n.t, membership({ role: 'DEPARTMENT_COORDINATOR', departmentIds: [] })))

    expect(items).not.toContain('/university/students')
    expect(items).not.toContain('/university/verification-cases')
    expect(items).not.toContain('/university/nominations')
    expect(items).not.toContain('/university/opportunity-requests')
    expect(items).toContain('/university/dashboard')
  })

  it('translates its labels rather than hardcoding English', async () => {
    await i18n.changeLanguage('so')
    const labels = buildUniversityNav(i18n.t, membership()).flatMap((section) => section.items.map((item) => item.label))

    expect(labels).toContain('Ardayda')
    expect(labels).not.toContain('Students')
  })

  it('translates the supervisor menu too', async () => {
    await i18n.changeLanguage('so')
    const labels = buildUniversityNav(i18n.t, membership({ role: 'UNIVERSITY_SUPERVISOR' }))
      .flatMap((section) => section.items.map((item) => item.label))

    expect(labels).toContain('Ardaydayda')
    expect(labels).toContain('Kormeerka')
    expect(labels).not.toContain('My students')
    expect(labels).not.toContain('Supervision')
  })
})
