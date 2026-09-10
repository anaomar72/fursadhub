import type { PlacementResponse, PlacementStatus } from '../placements/types'
import type { StudentRowResponse } from './types'

/**
 * Everything the university dashboard shows, counted from the list endpoints the university's own
 * pages already call. There is no university statistics endpoint on the backend, so nothing here is
 * a server aggregate — and nothing here is invented either: each figure is a count over records the
 * caller is already authorized to read, which means it is automatically scoped the same way the
 * API scoped the list (a coordinator's lists arrive department-scoped, so their totals are too).
 */

/** Placements that still occupy a student — the same set `StudentEligibility` treats as live. */
export const LIVE_PLACEMENT_STATUSES: PlacementStatus[] = ['PLANNED', 'ACTIVE', 'COMPLETION_PENDING']

/** The order statuses are shown in: the lifecycle's own order, not by size. */
export const PLACEMENT_STATUS_ORDER: PlacementStatus[] = [
  'PLANNED',
  'ACTIVE',
  'COMPLETION_PENDING',
  'COMPLETED',
  'CANCELLED',
  'TERMINATED',
]

export function countByPlacementStatus(placements: PlacementResponse[]): Record<PlacementStatus, number> {
  const counts = Object.fromEntries(PLACEMENT_STATUS_ORDER.map((status) => [status, 0])) as Record<PlacementStatus, number>
  for (const placement of placements) {
    if (placement.status in counts) counts[placement.status] += 1
  }
  return counts
}

export function livePlacementCount(placements: PlacementResponse[]): number {
  return placements.filter((placement) => LIVE_PLACEMENT_STATUSES.includes(placement.status)).length
}

/**
 * Students who have ever been placed — distinct by student, since one student may hold several
 * placements over time and counting rows would overstate it.
 */
export function placedStudentCount(placements: PlacementResponse[]): number {
  return new Set(placements.map((placement) => placement.studentUserId)).size
}

export interface PartnerOrganization {
  id: string
  name: string | null
  placementCount: number
  livePlacementCount: number
}

/**
 * The organizations this university actually has placements with, derived from the placement list.
 *
 * <p>FursadHub has no "partnership" record — an organization becomes a partner by hosting one of
 * your students, so that is exactly how this is counted, rather than inventing a directory.
 */
export function partnerOrganizations(placements: PlacementResponse[]): PartnerOrganization[] {
  const byId = new Map<string, PartnerOrganization>()

  for (const placement of placements) {
    const existing = byId.get(placement.organizationId)
    const isLive = LIVE_PLACEMENT_STATUSES.includes(placement.status)
    if (existing) {
      existing.placementCount += 1
      if (isLive) existing.livePlacementCount += 1
    } else {
      byId.set(placement.organizationId, {
        id: placement.organizationId,
        name: placement.organizationName,
        placementCount: 1,
        livePlacementCount: isLive ? 1 : 0,
      })
    }
  }

  return [...byId.values()].sort(
    (a, b) => b.livePlacementCount - a.livePlacementCount || b.placementCount - a.placementCount,
  )
}

/** Verified enrollments over all enrollments — the university's own verification progress. */
export function verifiedStudentCount(students: StudentRowResponse[]): number {
  return students.filter((student) => student.verificationStatus === 'VERIFIED').length
}

export interface DepartmentBreakdownRow {
  departmentId: string
  studentCount: number
  verifiedCount: number
}

export function studentsByDepartment(students: StudentRowResponse[]): DepartmentBreakdownRow[] {
  const byDepartment = new Map<string, DepartmentBreakdownRow>()

  for (const student of students) {
    const row = byDepartment.get(student.departmentId) ?? {
      departmentId: student.departmentId,
      studentCount: 0,
      verifiedCount: 0,
    }
    row.studentCount += 1
    if (student.verificationStatus === 'VERIFIED') row.verifiedCount += 1
    byDepartment.set(student.departmentId, row)
  }

  return [...byDepartment.values()].sort((a, b) => b.studentCount - a.studentCount)
}
