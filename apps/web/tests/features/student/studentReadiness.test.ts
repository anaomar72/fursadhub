import { describe, expect, it } from 'vitest'
import { applyBlocker, readinessPercent, readinessSteps } from '../../../src/features/student/studentReadiness'
import type { StudentEnrollmentResponse } from '../../../src/features/student/types'
import type { PlacementResponse } from '../../../src/features/placements/types'
import type { StudentCandidacyResponse } from '../../../src/features/recruitment/types'

function enrollment(status: string): StudentEnrollmentResponse {
  return {
    id: 'enr-1',
    universityId: 'univ-1',
    departmentId: 'dept-1',
    studentNumber: 'S-1',
    program: 'CS',
    academicYear: '4',
    verificationStatus: status,
  }
}

function placement(status: PlacementResponse['status']): PlacementResponse {
  return { id: 'plc-1', status } as PlacementResponse
}

function candidacy(opportunityId: string): StudentCandidacyResponse {
  return { id: 'cand-1', opportunityId } as StudentCandidacyResponse
}

const OPEN_OPPORTUNITY = { id: 'opp-1', mode: 'PUBLIC' as const, applicationDeadline: null }

describe('applyBlocker', () => {
  const base = { enrollment: enrollment('VERIFIED'), placements: [], candidacies: [], opportunity: OPEN_OPPORTUNITY }

  it('allows a verified, available student with no existing candidacy', () => {
    expect(applyBlocker(base)).toBeNull()
  })

  it('blocks an unverified enrollment, mirroring StudentEligibility', () => {
    expect(applyBlocker({ ...base, enrollment: enrollment('SUBMITTED') })).toBe('STUDENT_NOT_VERIFIED')
    expect(applyBlocker({ ...base, enrollment: null })).toBe('STUDENT_NOT_VERIFIED')
  })

  it('blocks a student who already holds a live placement', () => {
    for (const status of ['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'] as const) {
      expect(applyBlocker({ ...base, placements: [placement(status)] })).toBe('STUDENT_NOT_AVAILABLE')
    }
  })

  it('does not count a finished placement against availability', () => {
    for (const status of ['COMPLETED', 'CANCELLED', 'TERMINATED'] as const) {
      expect(applyBlocker({ ...base, placements: [placement(status)] })).toBeNull()
    }
  })

  it('blocks a second application to the same opportunity', () => {
    expect(applyBlocker({ ...base, candidacies: [candidacy('opp-1')] })).toBe('STUDENT_ALREADY_APPLIED')
    expect(applyBlocker({ ...base, candidacies: [candidacy('opp-2')] })).toBeNull()
  })

  it('blocks self-application to a nomination-only opportunity', () => {
    expect(
      applyBlocker({ ...base, opportunity: { ...OPEN_OPPORTUNITY, mode: 'UNIVERSITY_TARGETED' } }),
    ).toBe('OPPORTUNITY_NOT_PUBLIC')
    expect(applyBlocker({ ...base, opportunity: { ...OPEN_OPPORTUNITY, mode: 'HYBRID' } })).toBeNull()
  })

  it('treats the deadline day itself as still open, like the backend', () => {
    const today = new Date(2026, 8, 2)
    expect(
      applyBlocker({ ...base, opportunity: { ...OPEN_OPPORTUNITY, applicationDeadline: '2026-09-02' }, today }),
    ).toBeNull()
    expect(
      applyBlocker({ ...base, opportunity: { ...OPEN_OPPORTUNITY, applicationDeadline: '2026-09-01' }, today }),
    ).toBe('OPPORTUNITY_DEADLINE_PASSED')
  })

  it('reports verification before availability, matching the order the API checks them', () => {
    expect(
      applyBlocker({ ...base, enrollment: enrollment('REJECTED'), placements: [placement('ACTIVE')] }),
    ).toBe('STUDENT_NOT_VERIFIED')
  })
})

describe('readiness', () => {
  it('counts only real backend facts', () => {
    const steps = readinessSteps({
      profile: { userId: 'u1', fullName: 'Amina Yusuf', phone: null },
      hasCv: true,
      enrollment: enrollment('VERIFIED'),
    })
    expect(steps.every((step) => step.done)).toBe(true)
    expect(readinessPercent(steps)).toBe(100)
  })

  it('marks a claimed but unverified enrollment as one step short', () => {
    const steps = readinessSteps({ profile: null, hasCv: false, enrollment: enrollment('SUBMITTED') })
    expect(steps.find((step) => step.id === 'enrollment')?.done).toBe(true)
    expect(steps.find((step) => step.id === 'verification')?.done).toBe(false)
    expect(readinessPercent(steps)).toBe(25)
  })

  it('is zero for a brand-new account', () => {
    expect(readinessPercent(readinessSteps({ profile: null, hasCv: false, enrollment: null }))).toBe(0)
  })
})
