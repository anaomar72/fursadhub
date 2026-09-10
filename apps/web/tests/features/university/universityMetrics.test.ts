import { describe, expect, it } from 'vitest'
import {
  countByPlacementStatus,
  livePlacementCount,
  partnerOrganizations,
  placedStudentCount,
  studentsByDepartment,
  verifiedStudentCount,
} from '../../../src/features/university/universityMetrics'
import type { PlacementResponse, PlacementStatus } from '../../../src/features/placements/types'
import type { StudentRowResponse } from '../../../src/features/university/types'

function placement(overrides: Partial<PlacementResponse> = {}): PlacementResponse {
  return {
    id: 'plc-1',
    studentUserId: 'stu-1',
    organizationId: 'org-1',
    organizationName: 'TechSolutions',
    status: 'ACTIVE' as PlacementStatus,
    ...overrides,
  } as PlacementResponse
}

function student(overrides: Partial<StudentRowResponse> = {}): StudentRowResponse {
  return {
    studentUserId: 'stu-1',
    email: 'a@example.test',
    enrollmentId: 'enr-1',
    departmentId: 'dept-1',
    studentNumber: 'S1',
    program: 'CS',
    academicYear: '4',
    verificationStatus: 'VERIFIED',
    ...overrides,
  }
}

describe('university metrics', () => {
  it('counts only live placements as active', () => {
    const placements = [
      placement({ id: '1', status: 'PLANNED' }),
      placement({ id: '2', status: 'ACTIVE' }),
      placement({ id: '3', status: 'COMPLETION_PENDING' }),
      placement({ id: '4', status: 'COMPLETED' }),
      placement({ id: '5', status: 'CANCELLED' }),
      placement({ id: '6', status: 'TERMINATED' }),
    ]
    expect(livePlacementCount(placements)).toBe(3)
  })

  it('buckets every placement into its own lifecycle state without merging any', () => {
    const counts = countByPlacementStatus([
      placement({ id: '1', status: 'CANCELLED' }),
      placement({ id: '2', status: 'TERMINATED' }),
      placement({ id: '3', status: 'TERMINATED' }),
    ])
    // CANCELLED (never started) and TERMINATED (ended early) are not one "ended" state.
    expect(counts.CANCELLED).toBe(1)
    expect(counts.TERMINATED).toBe(2)
    expect(counts.COMPLETED).toBe(0)
  })

  it('counts placed students distinctly, not one per placement row', () => {
    const placements = [
      placement({ id: '1', studentUserId: 'stu-1', status: 'COMPLETED' }),
      placement({ id: '2', studentUserId: 'stu-1', status: 'ACTIVE' }),
      placement({ id: '3', studentUserId: 'stu-2', status: 'ACTIVE' }),
    ]
    expect(placedStudentCount(placements)).toBe(2)
  })

  it('derives partners from real placements, counting live ones separately', () => {
    const partners = partnerOrganizations([
      placement({ id: '1', organizationId: 'org-1', organizationName: 'TechSolutions', status: 'ACTIVE' }),
      placement({ id: '2', organizationId: 'org-1', organizationName: 'TechSolutions', status: 'COMPLETED' }),
      placement({ id: '3', organizationId: 'org-2', organizationName: 'DataSmart', status: 'COMPLETED' }),
    ])

    expect(partners).toHaveLength(2)
    // Ordered by live placements first — who is hosting students right now.
    expect(partners[0]).toMatchObject({ id: 'org-1', placementCount: 2, livePlacementCount: 1 })
    expect(partners[1]).toMatchObject({ id: 'org-2', placementCount: 1, livePlacementCount: 0 })
  })

  it('returns no partners when the university has no placements', () => {
    expect(partnerOrganizations([])).toEqual([])
  })

  it('counts verified enrollments only', () => {
    const students = [
      student({ enrollmentId: '1', verificationStatus: 'VERIFIED' }),
      student({ enrollmentId: '2', verificationStatus: 'SUBMITTED' }),
      student({ enrollmentId: '3', verificationStatus: 'REVOKED' }),
    ]
    expect(verifiedStudentCount(students)).toBe(1)
  })

  it('breaks students down by department, largest first', () => {
    const rows = studentsByDepartment([
      student({ enrollmentId: '1', departmentId: 'dept-1', verificationStatus: 'VERIFIED' }),
      student({ enrollmentId: '2', departmentId: 'dept-1', verificationStatus: 'SUBMITTED' }),
      student({ enrollmentId: '3', departmentId: 'dept-2', verificationStatus: 'VERIFIED' }),
    ])

    expect(rows[0]).toEqual({ departmentId: 'dept-1', studentCount: 2, verifiedCount: 1 })
    expect(rows[1]).toEqual({ departmentId: 'dept-2', studentCount: 1, verifiedCount: 1 })
  })
})
