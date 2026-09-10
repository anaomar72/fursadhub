import { describe, expect, it } from 'vitest'
import {
  disputedAttendance,
  logsAwaitingReview,
  reportAwaitingReview,
  supervisablePlacements,
  supervisedStudents,
} from '../../../src/features/university/supervisionMetrics'
import type { PlacementResponse, PlacementStatus } from '../../../src/features/placements/types'
import type { WeeklyLogResponse, WeeklyLogState } from '../../../src/features/weekly-logs/types'
import type { AttendanceConfirmationStatus, AttendanceResponse } from '../../../src/features/attendance/types'
import type { FinalReportState } from '../../../src/features/final-reports/types'

function placement(overrides: Partial<PlacementResponse> = {}): PlacementResponse {
  return {
    id: 'plc-1',
    candidacyId: 'cnd-1',
    opportunityId: 'opp-1',
    opportunityTitle: 'Frontend Intern',
    organizationId: 'org-1',
    organizationName: 'TechSolutions',
    universityId: 'univ-1',
    universityName: 'Jamhuriya',
    departmentId: 'dept-1',
    departmentName: 'Computer Science',
    studentUserId: 'stu-1',
    studentFullName: 'Amina Yusuf',
    studentEmail: 'amina@example.test',
    startDate: '2026-02-01',
    endDate: '2026-05-01',
    location: null,
    status: 'ACTIVE',
    startedAt: null,
    completionRequestedAt: null,
    completedAt: null,
    cancelledAt: null,
    terminatedAt: null,
    cancellationReason: null,
    terminationReason: null,
    universitySupervisor: null,
    organizationSupervisor: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function log(state: WeeklyLogState, weekNumber = 1): WeeklyLogResponse {
  return {
    id: `log-${weekNumber}`,
    placementId: 'plc-1',
    weekNumber,
    periodStart: '2026-02-01',
    periodEnd: '2026-02-07',
    summary: 'Worked on the dashboard',
    activities: null,
    challenges: null,
    learningOutcomes: null,
    state,
    submittedAt: '2026-02-08T00:00:00Z',
    reviewedAt: null,
    reviewComment: null,
    editable: false,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-08T00:00:00Z',
  }
}

function attendance(confirmationStatus: AttendanceConfirmationStatus, attendanceDate = '2026-02-03'): AttendanceResponse {
  return {
    id: `att-${attendanceDate}`,
    placementId: 'plc-1',
    attendanceDate,
    attendanceValue: 'PRESENT',
    confirmationStatus,
    notes: null,
    disputeReason: null,
    resolutionNote: null,
    confirmedAt: null,
    disputedAt: null,
    resolvedAt: null,
    createdAt: '2026-02-03T00:00:00Z',
    updatedAt: '2026-02-03T00:00:00Z',
  }
}

function report(state: FinalReportState) {
  return {
    id: 'rep-1',
    placementId: 'plc-1',
    state,
    hasDocument: true,
    documentFilename: 'report.pdf',
    documentSizeBytes: 1024,
    submittedAt: '2026-05-02T00:00:00Z',
    reviewedAt: null,
    reviewComment: null,
    fileEditable: false,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-02T00:00:00Z',
  }
}

describe('supervisablePlacements', () => {
  it('keeps only the placements that can actually hold records', () => {
    // Matches the backend's RECORDABLE set: a PLANNED internship has no records yet and a closed one
    // has nothing left to review, so querying either can only come back empty.
    const statuses: PlacementStatus[] = ['PLANNED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED', 'CANCELLED', 'TERMINATED']
    const rows = statuses.map((status, index) => placement({ id: `plc-${index}`, status }))

    expect(supervisablePlacements(rows).map((row) => row.status)).toEqual(['ACTIVE', 'COMPLETION_PENDING'])
  })
})

describe('logsAwaitingReview', () => {
  it('counts only logs the student has handed over', () => {
    const pending = logsAwaitingReview([
      log('DRAFT', 1),
      log('SUBMITTED', 2),
      log('RETURNED_FOR_CHANGES', 3),
      log('REVIEWED', 4),
      log('SUBMITTED', 5),
    ])

    // DRAFT is unstarted and RETURNED_FOR_CHANGES is back with the student — neither is the
    // supervisor's turn, and flattening them into "pending" would misstate whose move it is.
    expect(pending.map((entry) => entry.weekNumber)).toEqual([2, 5])
  })
})

describe('reportAwaitingReview', () => {
  it('is true only for a submitted report', () => {
    expect(reportAwaitingReview(report('SUBMITTED'))).toBe(true)
    expect(reportAwaitingReview(report('DRAFT'))).toBe(false)
    expect(reportAwaitingReview(report('NEEDS_REVISION'))).toBe(false)
    expect(reportAwaitingReview(report('APPROVED'))).toBe(false)
    expect(reportAwaitingReview(null)).toBe(false)
  })
})

describe('disputedAttendance', () => {
  it('surfaces disputes only, not every unconfirmed day', () => {
    const rows = disputedAttendance([
      attendance('RECORDED', '2026-02-01'),
      attendance('DISPUTED', '2026-02-02'),
      attendance('CONFIRMED', '2026-02-03'),
      attendance('RESOLVED', '2026-02-04'),
    ])

    expect(rows.map((row) => row.attendanceDate)).toEqual(['2026-02-02'])
  })
})

describe('supervisedStudents', () => {
  it('collapses a scoped placement list into distinct students', () => {
    const rows = supervisedStudents([
      placement({ id: 'plc-1', studentUserId: 'stu-1', studentFullName: 'Amina Yusuf' }),
      placement({ id: 'plc-2', studentUserId: 'stu-2', studentFullName: 'Bashir Ali' }),
    ])

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.fullName)).toEqual(['Amina Yusuf', 'Bashir Ali'])
  })

  it('keeps a student once even when they hold several placements over time', () => {
    const rows = supervisedStudents([
      placement({ id: 'plc-old', status: 'COMPLETED', startDate: '2025-02-01' }),
      placement({ id: 'plc-now', status: 'ACTIVE', startDate: '2026-02-01' }),
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].placements).toHaveLength(2)
    // Newest first, and the running one is the placement the supervisor is actually working on.
    expect(rows[0].placements[0].id).toBe('plc-now')
    expect(rows[0].currentPlacement?.id).toBe('plc-now')
  })

  it('reports no current placement when nothing is running', () => {
    const rows = supervisedStudents([placement({ id: 'plc-done', status: 'COMPLETED' })])

    expect(rows[0].currentPlacement).toBeNull()
    expect(rows[0].placements).toHaveLength(1)
  })

  it('never invents a student the placement list did not contain', () => {
    // The whole point of deriving the roster this way: it can only ever be as wide as the scoped
    // list the API returned, so a supervisor cannot reach a student they are not assigned to.
    expect(supervisedStudents([])).toEqual([])
  })
})
