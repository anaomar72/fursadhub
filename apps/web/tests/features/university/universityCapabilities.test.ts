import { describe, expect, it } from 'vitest'
import { universityCapabilities } from '../../../src/features/university/universityCapabilities'
import type { MyMembershipResponse } from '../../../src/features/university/types'

function membership(overrides: Partial<MyMembershipResponse> = {}): MyMembershipResponse {
  return { universityId: 'univ-1', role: 'UNIVERSITY_ADMIN', departmentIds: [], ...overrides }
}

/**
 * These assertions restate the backend's rules. If one of them ever has to change, the server
 * changed — and the menu, the dashboards and the page bodies that all read from here change with it.
 */
describe('universityCapabilities', () => {
  it('gives a university admin everything the API grants the role', () => {
    const can = universityCapabilities(membership({ role: 'UNIVERSITY_ADMIN' }))

    expect(can.canReviewStudents).toBe(true)
    expect(can.canNominate).toBe(true)
    expect(can.canProvisionStaff).toBe(true)
    expect(can.canEditUniversityProfile).toBe(true)
    expect(can.canConfigureUniversityWidePolicy).toBe(true)
    expect(can.canCompletePlacements).toBe(true)
    expect(can.scopedToAssignedPlacements).toBe(false)
  })

  it('withholds staff provisioning and profile editing from a coordinator', () => {
    // UniversityStaffService and UpdateUniversityService both require UNIVERSITY_ADMIN.
    const can = universityCapabilities(membership({ role: 'DEPARTMENT_COORDINATOR', departmentIds: ['dept-1'] }))

    expect(can.canProvisionStaff).toBe(false)
    expect(can.canEditUniversityProfile).toBe(false)
    // A coordinator may set department policy but not the university-wide default.
    expect(can.canConfigurePolicy).toBe(true)
    expect(can.canConfigureUniversityWidePolicy).toBe(false)
    // ...while everything department-scoped stays open to them.
    expect(can.canReviewStudents).toBe(true)
    expect(can.canCompletePlacements).toBe(true)
  })

  it('fails closed for a coordinator with no assigned department', () => {
    // requireDepartmentScope denies every scoped operation when the scope set is empty, so the
    // frontend must not offer them either.
    const can = universityCapabilities(membership({ role: 'DEPARTMENT_COORDINATOR', departmentIds: [] }))

    expect(can.canReviewStudents).toBe(false)
    expect(can.canNominate).toBe(false)
    expect(can.canManageDepartments).toBe(false)
    expect(can.canConfigurePolicy).toBe(false)
    expect(can.canCompletePlacements).toBe(false)
    expect(can.hasStudentDirectory).toBe(false)
  })

  it('confines a supervisor to reviewing their assigned placements', () => {
    const can = universityCapabilities(membership({ role: 'UNIVERSITY_SUPERVISOR', departmentIds: [] }))

    // requireUniversityAcademicAccess admits the role — narrowed to assigned placements.
    expect(can.canReviewAcademicRecords).toBe(true)
    expect(can.scopedToAssignedPlacements).toBe(true)

    // requireUniversityCompletionAuthority deliberately excludes supervisors: they approve the
    // work but do not end the internship.
    expect(can.canCompletePlacements).toBe(false)
    // VerificationQueryService/NominationService/requirePolicyAuthority all refuse the role.
    expect(can.canReviewStudents).toBe(false)
    expect(can.hasStudentDirectory).toBe(false)
    expect(can.canNominate).toBe(false)
    expect(can.canConfigurePolicy).toBe(false)
    expect(can.canManageDepartments).toBe(false)
    expect(can.canProvisionStaff).toBe(false)
    expect(can.canEditUniversityProfile).toBe(false)
  })

  it('never lets a department scope entry turn a supervisor into a coordinator', () => {
    // A UNIVERSITY_SUPERVISOR membership can carry department rows, but the backend keys the
    // coordinator branch off the ROLE, not off the presence of scope. Nothing here may widen on it.
    const can = universityCapabilities(membership({ role: 'UNIVERSITY_SUPERVISOR', departmentIds: ['dept-1', 'dept-2'] }))

    expect(can.canReviewStudents).toBe(false)
    expect(can.canNominate).toBe(false)
    expect(can.canCompletePlacements).toBe(false)
    expect(can.scopedToAssignedPlacements).toBe(true)
  })
})
