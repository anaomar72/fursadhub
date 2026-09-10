import { describe, expect, it } from 'vitest'
import {
  disputedAttendance,
  evaluationOutstanding,
  evaluationRatingsComplete,
  supervisedInterns,
  unsettledAttendance,
} from '../../../src/features/organization/supervisorMetrics'
import type { AttendanceConfirmationStatus, AttendanceResponse } from '../../../src/features/attendance/types'
import type { EvaluationResponse, EvaluationState } from '../../../src/features/evaluations/types'
import type { PlacementResponse, PlacementStatus } from '../../../src/features/placements/types'

function attendance(confirmationStatus: AttendanceConfirmationStatus, date = '2026-03-02'): AttendanceResponse {
  return {
    id: `att-${date}-${confirmationStatus}`,
    placementId: 'plc-1',
    attendanceDate: date,
    attendanceValue: 'PRESENT',
    confirmationStatus,
    notes: null,
    disputeReason: null,
    resolutionNote: null,
    confirmedAt: null,
    disputedAt: null,
    resolvedAt: null,
    createdAt: '2026-03-02T00:00:00Z',
    updatedAt: '2026-03-02T00:00:00Z',
  }
}

function evaluation(state: EvaluationState, ratings: (number | null)[] = [5, 5, 5, 5, 5, 5]): EvaluationResponse {
  return {
    id: 'ev-1',
    placementId: 'plc-1',
    professionalismRating: ratings[0],
    reliabilityRating: ratings[1],
    communicationRating: ratings[2],
    workPerformanceRating: ratings[3],
    teamworkRating: ratings[4],
    overallRating: ratings[5],
    strengths: null,
    improvementAreas: null,
    finalComments: null,
    state,
    submittedAt: state === 'DRAFT' ? null : '2026-05-01T00:00:00Z',
    finalizedAt: state === 'FINAL' ? '2026-05-02T00:00:00Z' : null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  }
}

function placement(overrides: Partial<PlacementResponse> = {}): PlacementResponse {
  return {
    id: 'plc-1',
    candidacyId: 'cnd-1',
    opportunityId: 'opp-1',
    opportunityTitle: 'Backend Intern',
    organizationId: 'org-1',
    organizationName: 'TechSolutions',
    universityId: 'uni-1',
    universityName: 'Jamhuriya University',
    departmentId: 'dept-1',
    departmentName: 'Computer Science',
    studentUserId: 'stu-1',
    studentFullName: 'Amina Yusuf',
    studentEmail: 'amina@example.test',
    startDate: '2026-03-01',
    endDate: '2026-06-01',
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

describe('unsettledAttendance', () => {
  it('groups the two states that are the supervisor to move', () => {
    // RECORDED waits on them to confirm; DISPUTED waits on them to resolve. Both are settled
    // through AttendanceService, which requires the ASSIGNED organization supervisor.
    const rows = unsettledAttendance([
      attendance('RECORDED', '2026-03-01'),
      attendance('DISPUTED', '2026-03-02'),
      attendance('CONFIRMED', '2026-03-03'),
      attendance('RESOLVED', '2026-03-04'),
    ])

    expect(rows.map((row) => row.attendanceDate)).toEqual(['2026-03-01', '2026-03-02'])
  })

  it('separates disputes from merely unconfirmed days', () => {
    const records = [attendance('RECORDED', '2026-03-01'), attendance('DISPUTED', '2026-03-02')]

    expect(unsettledAttendance(records)).toHaveLength(2)
    expect(disputedAttendance(records).map((row) => row.attendanceDate)).toEqual(['2026-03-02'])
  })

  it('reports nothing outstanding when everything is settled', () => {
    expect(unsettledAttendance([attendance('CONFIRMED'), attendance('RESOLVED')])).toEqual([])
  })
})

describe('evaluationOutstanding', () => {
  it('treats a missing evaluation as work, because nobody has started it', () => {
    expect(evaluationOutstanding(null)).toBe(true)
    expect(evaluationOutstanding(undefined)).toBe(true)
  })

  it('treats DRAFT and SUBMITTED as still the supervisor to finish', () => {
    expect(evaluationOutstanding(evaluation('DRAFT'))).toBe(true)
    expect(evaluationOutstanding(evaluation('SUBMITTED'))).toBe(true)
  })

  it('treats FINAL as done, because it can never be reopened', () => {
    // PlacementEvaluationService.finalizeEvaluation is terminal.
    expect(evaluationOutstanding(evaluation('FINAL'))).toBe(false)
  })
})

describe('evaluationRatingsComplete', () => {
  it('counts the six fixed ratings, which are the only ones the schema has', () => {
    // FursadHub has no rubric builder (CLAUDE.md section 44) — six ratings, always.
    expect(evaluationRatingsComplete(evaluation('DRAFT'))).toBe(6)
    expect(evaluationRatingsComplete(evaluation('DRAFT', [5, 4, null, null, null, null]))).toBe(2)
    expect(evaluationRatingsComplete(null)).toBe(0)
  })
})

describe('supervisedInterns', () => {
  it('derives the intern list from the assigned placement list, with no extra request', () => {
    // An organization supervisor has no student directory: there is no organization-side student
    // endpoint, and CandidacyAuthorization excludes the role from the candidate pool.
    const rows = supervisedInterns([
      placement({ id: 'a', studentFullName: 'Zahra Ali' }),
      placement({ id: 'b', studentFullName: 'Amina Yusuf' }),
    ])

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.fullName)).toEqual(['Amina Yusuf', 'Zahra Ali'])
    expect(rows[0].universityName).toBe('Jamhuriya University')
  })

  it('puts running placements first, because those are the ones with work attached', () => {
    const rows = supervisedInterns([
      placement({ id: 'done', status: 'COMPLETED', studentFullName: 'Aaaa First' }),
      placement({ id: 'live', status: 'ACTIVE', studentFullName: 'Zzzz Last' }),
    ])

    expect(rows.map((row) => row.placement.id)).toEqual(['live', 'done'])
    expect(rows[0].running).toBe(true)
    expect(rows[1].running).toBe(false)
  })

  it('keeps one row per PLACEMENT, not per student', () => {
    // An organization supervisor is assigned to placements individually, so the same person on two
    // placements is two separate supervision responsibilities.
    const rows = supervisedInterns([
      placement({ id: 'p1', studentUserId: 'stu-1' }),
      placement({ id: 'p2', studentUserId: 'stu-1' }),
    ])

    expect(rows).toHaveLength(2)
  })

  it('marks only the recordable states as running', () => {
    const statuses: PlacementStatus[] = ['PLANNED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED', 'CANCELLED', 'TERMINATED']
    const rows = supervisedInterns(statuses.map((status, i) => placement({ id: `p${i}`, status })))

    expect(rows.filter((row) => row.running).map((row) => row.placement.status).sort()).toEqual([
      'ACTIVE',
      'COMPLETION_PENDING',
    ])
  })

  it('returns nothing when the supervisor is assigned to nothing', () => {
    expect(supervisedInterns([])).toEqual([])
  })
})
