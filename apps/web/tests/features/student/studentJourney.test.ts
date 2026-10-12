import { describe, expect, it } from 'vitest'
import {
  deriveAttention,
  deriveLifecycle,
  derivePrePlacementJourney,
  deriveStudentStatus,
  type StudentRecords,
} from '../../../src/features/student/studentJourney'
import type { PlacementResponse, CompletionStatusResponse } from '../../../src/features/placements/types'
import type { StudentCandidacyResponse, StudentNominationResponse } from '../../../src/features/recruitment/types'
import type { StudentEnrollmentResponse } from '../../../src/features/student/types'

const enrollment = (verificationStatus: string): StudentEnrollmentResponse =>
  ({ id: 'e', universityId: 'u', departmentId: 'd', studentNumber: 's', program: 'p', academicYear: 'y', verificationStatus }) as StudentEnrollmentResponse

const candidacy = (over: Partial<StudentCandidacyResponse> = {}): StudentCandidacyResponse =>
  ({ id: 'c1', opportunityId: 'o1', opportunityTitle: 'Role', source: 'SELF_APPLICATION', status: 'SUBMITTED', createdAt: '2026-08-01T00:00:00Z', liveOffer: null, ...over }) as StudentCandidacyResponse

const nomination = (status: StudentNominationResponse['status']): StudentNominationResponse =>
  ({ id: 'n1', opportunityId: 'o2', opportunityTitle: 'Nominated role', organizationName: 'Org', status, note: null, createdAt: '2026-08-01T00:00:00Z', respondedAt: null }) as StudentNominationResponse

const placement = (status: PlacementResponse['status']): PlacementResponse =>
  ({ id: 'p1', status, opportunityTitle: 'Intern', organizationName: 'Host', startDate: '2026-09-01', endDate: '2026-12-01', startedAt: null, completedAt: null }) as PlacementResponse

const records = (over: Partial<StudentRecords> = {}): StudentRecords => ({
  enrollment: enrollment('VERIFIED'),
  candidacies: [],
  nominations: [],
  placements: [],
  ...over,
})

const pendingOffer = { id: 'of', candidacyId: 'c1', status: 'PENDING', responseDeadline: '2026-11-20' } as StudentCandidacyResponse['liveOffer']

const completion = (requirements: Partial<CompletionStatusResponse['requirements'][number]>[]): CompletionStatusResponse => ({
  canComplete: false,
  policySource: 'UNIVERSITY',
  requirements: requirements.map((r) => ({ required: true, satisfied: false, detail: null, unmetCode: 'X', type: 'WEEKLY_LOGS', ...r })) as CompletionStatusResponse['requirements'],
})

describe('deriveStudentStatus — one stage, in priority order', () => {
  it.each([
    ['ACTIVE', 'placementActive'],
    ['PLANNED', 'placementPlanned'],
    ['COMPLETION_PENDING', 'completionPending'],
  ] as const)('a %s placement is the stage, ahead of anything else', (status, stage) => {
    const result = deriveStudentStatus(records({ placements: [placement(status)], candidacies: [candidacy({ liveOffer: pendingOffer })] }))
    expect(result.stage).toBe(stage)
    expect(result.primary.to).toBe('/student/placements/p1')
  })

  it('a pending offer outranks a pending nomination and a missing enrollment', () => {
    const result = deriveStudentStatus(records({ enrollment: null, candidacies: [candidacy({ status: 'OFFERED', liveOffer: pendingOffer })], nominations: [nomination('PENDING_STUDENT_CONSENT')] }))
    expect(result.stage).toBe('offerWaiting')
    expect(result.primary.to).toBe('/student/applications/c1')
  })

  it('a nomination awaiting consent comes before enrollment work', () => {
    expect(deriveStudentStatus(records({ enrollment: enrollment('DRAFT'), nominations: [nomination('PENDING_STUDENT_CONSENT')] })).stage).toBe('nominationWaiting')
  })

  it.each([
    [null, 'enrollmentMissing', '/student/enrollment'],
    ['DRAFT', 'enrollmentIncomplete', '/student/enrollment'],
    ['NEEDS_MORE_EVIDENCE', 'enrollmentChangesRequested', '/student/enrollment'],
    ['SUBMITTED', 'enrollmentInReview', '/student/opportunities'],
    ['UNDER_REVIEW', 'enrollmentInReview', '/student/opportunities'],
    ['REJECTED', 'enrollmentClosed', '/student/enrollment'],
    ['REVOKED', 'enrollmentClosed', '/student/enrollment'],
  ])('enrollment %s → %s, next action %s', (status, stage, to) => {
    const result = deriveStudentStatus(records({ enrollment: status === null ? null : enrollment(status) }))
    expect(result.stage).toBe(stage)
    expect(result.primary.to).toBe(to)
  })

  it('a verified student with an application in play is "in progress", not "ready"', () => {
    expect(deriveStudentStatus(records({ candidacies: [candidacy({ status: 'UNDER_REVIEW' })] })).stage).toBe('applicationsInProgress')
  })

  it('closed applications do not count as in progress', () => {
    expect(deriveStudentStatus(records({ candidacies: [candidacy({ status: 'REJECTED' })] })).stage).toBe('readyToApply')
  })

  it('a completed internship is remembered when nothing else is live', () => {
    const result = deriveStudentStatus(records({ placements: [placement('COMPLETED')] }))
    expect(result.stage).toBe('completed')
    expect(result.placement?.id).toBe('p1')
  })
})

describe('deriveAttention — only what the student can act on', () => {
  it('is empty for a verified student with applications under review', () => {
    expect(deriveAttention(records({ candidacies: [candidacy({ status: 'UNDER_REVIEW' })] }))).toEqual([])
  })

  it('lists every pending offer and every nomination awaiting consent', () => {
    const items = deriveAttention(records({
      candidacies: [candidacy({ id: 'a', liveOffer: pendingOffer }), candidacy({ id: 'b', liveOffer: { ...pendingOffer!, status: 'DECLINED' } })],
      nominations: [nomination('PENDING_STUDENT_CONSENT'), { ...nomination('ACCEPTED'), id: 'n2' }],
    }))
    expect(items.map((item) => item.kind)).toEqual(['offer', 'nomination'])
  })

  it('flags enrollment only when the student must act on it — not while it is in review', () => {
    expect(deriveAttention(records({ enrollment: null }))).toEqual([{ kind: 'enrollment', status: 'missing', to: '/student/enrollment' }])
    expect(deriveAttention(records({ enrollment: enrollment('NEEDS_MORE_EVIDENCE') }))[0]).toMatchObject({ status: 'changesRequested' })
    expect(deriveAttention(records({ enrollment: enrollment('UNDER_REVIEW') }))).toEqual([])
  })

  it('reads returned logs and a report needing revision — never attendance, which the supervisor confirms', () => {
    const items = deriveAttention(records({ placements: [placement('ACTIVE')] }), {
      weeklyLogs: [{ id: 'w', weekNumber: 3, state: 'RETURNED_FOR_CHANGES' }] as never,
      attendance: [{ confirmationStatus: 'RECORDED' }, { confirmationStatus: 'RECORDED' }, { confirmationStatus: 'DISPUTED' }] as never,
      completion: completion([{ type: 'FINAL_REPORT', detail: 'NEEDS_REVISION' }]),
    })
    expect(items).toEqual([
      { kind: 'weeklyLogReturned', id: 'w', weekNumber: 3, to: '/student/placements/p1/weekly-logs' },
      { kind: 'finalReportRevision', to: '/student/placements/p1/final-report' },
    ])
  })

  it('ignores workplace records on a placement that has not started', () => {
    const items = deriveAttention(records({ placements: [placement('PLANNED')] }), {
      weeklyLogs: [{ id: 'w', weekNumber: 1, state: 'RETURNED_FOR_CHANGES' }] as never,
    })
    expect(items).toEqual([])
  })

  it('a final report revision is not attention when the policy does not require the report', () => {
    const items = deriveAttention(records({ placements: [placement('ACTIVE')] }), {
      completion: completion([{ type: 'FINAL_REPORT', required: false, detail: 'NEEDS_REVISION' }]),
    })
    expect(items).toEqual([])
  })
})

describe('deriveLifecycle — placement status + the backend checklist only', () => {
  const checklist = completion([
    { type: 'DEFENSE', detail: 'MISSING' },
    { type: 'WEEKLY_LOGS', satisfied: true, detail: '10/10' },
    { type: 'ORGANIZATION_EVALUATION', required: false },
    { type: 'FINAL_REPORT', detail: 'NEEDS_REVISION' },
  ])

  it('an active internship: confirmed and started done, requirements in nav order as one group, completion ahead', () => {
    const steps = deriveLifecycle(placement('ACTIVE'), { completion: checklist })
    expect(steps.map((step) => [step.id, step.state, step.group])).toEqual([
      ['placement', 'complete', undefined],
      ['started', 'complete', undefined],
      ['WEEKLY_LOGS', 'complete', 'requirements'],
      ['FINAL_REPORT', 'attention', 'requirements'],
      ['DEFENSE', 'current', 'requirements'],
      ['completion', 'upcoming', undefined],
    ])
  })

  it('a planned internship: not started yet, so requirements are upcoming', () => {
    const steps = deriveLifecycle(placement('PLANNED'), { completion: checklist })
    expect(steps.find((step) => step.id === 'started')?.state).toBe('current')
    expect(steps.find((step) => step.id === 'DEFENSE')?.state).toBe('upcoming')
  })

  it('completion pending and completed', () => {
    expect(deriveLifecycle(placement('COMPLETION_PENDING')).at(-1)?.state).toBe('current')
    expect(deriveLifecycle(placement('COMPLETED')).at(-1)?.state).toBe('complete')
  })

  it('an internship that ended early marks what was never reached, without pretending it was done', () => {
    const steps = deriveLifecycle(placement('TERMINATED'), { completion: checklist })
    expect(steps.find((step) => step.id === 'WEEKLY_LOGS')?.state).toBe('complete')
    expect(steps.find((step) => step.id === 'DEFENSE')?.state).toBe('notReached')
    expect(steps.at(-1)?.state).toBe('notReached')
    expect(deriveLifecycle(placement('CANCELLED')).find((step) => step.id === 'started')?.state).toBe('notReached')
  })

  it('without the checklist, no requirement is guessed', () => {
    expect(deriveLifecycle(placement('ACTIVE')).map((step) => step.id)).toEqual(['placement', 'started', 'completion'])
  })
})

describe('derivePrePlacementJourney — the road to a placement', () => {
  it('a new student must start with enrollment', () => {
    expect(derivePrePlacementJourney(records({ enrollment: null })).map((s) => s.state)).toEqual(['attention', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('an enrollment in review is in progress, not needing action', () => {
    expect(derivePrePlacementJourney(records({ enrollment: enrollment('UNDER_REVIEW') }))[0].state).toBe('current')
  })

  it('verified with nothing in play: applying is the current step', () => {
    expect(derivePrePlacementJourney(records()).map((s) => s.state)).toEqual(['complete', 'current', 'upcoming', 'upcoming'])
  })

  it('an application in play completes "apply"; a pending offer needs attention', () => {
    const steps = derivePrePlacementJourney(records({ candidacies: [candidacy({ status: 'OFFERED', liveOffer: pendingOffer })] }))
    expect(steps.map((s) => s.state)).toEqual(['complete', 'complete', 'attention', 'upcoming'])
  })

  it('a nomination awaiting consent is attention on the apply step', () => {
    expect(derivePrePlacementJourney(records({ nominations: [nomination('PENDING_STUDENT_CONSENT')] }))[1].state).toBe('attention')
  })
})
