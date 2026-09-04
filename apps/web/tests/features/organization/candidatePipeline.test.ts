import { describe, expect, it } from 'vitest'
import {
  CLOSED_STATUSES,
  PIPELINE_STAGES,
  availableCommands,
  canTransition,
  canSendOffer,
  closedCount,
  isClosed,
  pipelineColumns,
} from '../../../src/features/organization/candidatePipeline'
import type { CandidacyStatus, CandidateRowResponse } from '../../../src/features/recruitment/types'

function candidate(status: CandidacyStatus, id = status): CandidateRowResponse {
  return {
    candidacyId: id,
    studentUserId: `stu-${id}`,
    studentEmail: `${id}@example.test`,
    studentFullName: `Student ${id}`,
    source: 'SELF_APPLICATION',
    status,
    createdAt: '2026-08-01T00:00:00Z',
    liveOffer: null,
  }
}

/** Every state the backend's CandidacyStatus enum actually has (CLAUDE.md section 37). */
const ALL_STATUSES: CandidacyStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'OFFER_DECLINED',
  'OFFER_EXPIRED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
]

describe('candidatePipeline', () => {
  it('uses only real backend statuses as its stages', () => {
    // The approved design's columns — New, Reviewing, Shortlisted, Interview, Accepted — are not
    // statuses. Every column here must be a state the API can actually report.
    for (const stage of PIPELINE_STAGES) {
      expect(ALL_STATUSES).toContain(stage)
    }
  })

  it('includes OFFERED, which the prototype omitted', () => {
    // A candidate who has been sent an offer is neither "Interview" nor "Accepted". Dropping the
    // column would make the board misreport where real people are.
    expect(PIPELINE_STAGES).toContain('OFFERED')
  })

  it('orders the stages by the lifecycle, not by size', () => {
    expect(PIPELINE_STAGES).toEqual([
      'SUBMITTED',
      'UNDER_REVIEW',
      'SHORTLISTED',
      'INTERVIEW',
      'OFFERED',
      'ACCEPTED',
    ])
  })

  it('covers every backend status exactly once across stages and closed states', () => {
    // No status may be silently unrepresented, and none may appear in both groups.
    const covered = [...PIPELINE_STAGES, ...CLOSED_STATUSES].sort()
    expect(covered).toEqual([...ALL_STATUSES].sort())
    expect(new Set(covered).size).toBe(ALL_STATUSES.length)
  })

  it('keeps terminal states off the board', () => {
    const columns = pipelineColumns([
      candidate('SUBMITTED'),
      candidate('REJECTED'),
      candidate('WITHDRAWN'),
      candidate('OFFER_DECLINED'),
    ])

    expect(columns.map((column) => column.status)).toEqual(PIPELINE_STAGES)
    expect(columns.find((column) => column.status === 'SUBMITTED')!.candidates).toHaveLength(1)
    // A rejected candidate is not "at a stage"; a column for them would imply work in progress.
    expect(columns.flatMap((column) => column.candidates)).toHaveLength(1)
  })

  it('reports the closed candidates as a count instead of losing them', () => {
    expect(closedCount([candidate('REJECTED'), candidate('WITHDRAWN'), candidate('SUBMITTED')])).toBe(2)
    expect(isClosed('OFFER_EXPIRED')).toBe(true)
    expect(isClosed('INTERVIEW')).toBe(false)
  })

  describe('availableCommands', () => {
    it('offers exactly the transitions Candidacy.ALLOWED_TRANSITIONS accepts from here', () => {
      // Transcribed from the backend table, not approximated. An earlier hand-written version was
      // narrower than the server in four places and silently removed real recruiter capability.
      expect(availableCommands('SUBMITTED')).toEqual(['review', 'shortlist', 'interview', 'reject'])
      expect(availableCommands('UNDER_REVIEW')).toEqual(['shortlist', 'interview', 'reject'])
      expect(availableCommands('SHORTLISTED')).toEqual(['interview', 'reject'])
      expect(availableCommands('INTERVIEW')).toEqual(['reject'])
    })

    it('lets a fresh applicant go straight to interview', () => {
      // SUBMITTED -> INTERVIEW is in the backend table: intermediate stages are optional
      // (CLAUDE.md section 37). Hiding it forced a pointless extra click through shortlisting.
      expect(canTransition('SUBMITTED', 'INTERVIEW')).toBe(true)
      expect(availableCommands('SUBMITTED')).toContain('interview')
    })

    it('still allows rejecting a candidate who is holding an offer', () => {
      // OFFERED -> REJECTED is a real transition, so the button must be there.
      expect(availableCommands('OFFERED')).toEqual(['reject'])
      expect(availableCommands('OFFER_DECLINED')).toEqual(['reject'])
    })

    it('lets a lapsed offer be re-engaged', () => {
      // OFFER_EXPIRED returns the candidate to the pool: shortlist again, or re-offer.
      expect(availableCommands('OFFER_EXPIRED')).toEqual(['shortlist', 'reject'])
      expect(canSendOffer('OFFER_EXPIRED')).toBe(true)
    })

    it('offers nothing once the candidacy is truly terminal', () => {
      for (const status of ['ACCEPTED', 'REJECTED', 'WITHDRAWN'] as CandidacyStatus[]) {
        expect(availableCommands(status)).toEqual([])
      }
    })

    it('never offers a backwards move', () => {
      // Moving a shortlisted candidate back to review is not a transition the backend has.
      expect(availableCommands('SHORTLISTED')).not.toContain('review')
      expect(availableCommands('INTERVIEW')).not.toContain('shortlist')
      expect(availableCommands('OFFERED')).not.toContain('shortlist')
    })

    it('never offers withdrawal, which belongs to the student', () => {
      // WITHDRAWN is reachable in the table, but POST /candidacies/{id}/withdraw authorizes the
      // owning student — it is not an organization action.
      for (const status of ALL_STATUSES) {
        expect(availableCommands(status)).not.toContain('withdraw' as never)
      }
    })
  })

  describe('canSendOffer', () => {
    it('allows an offer from the active stages and after one expires', () => {
      for (const status of ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFER_EXPIRED'] as CandidacyStatus[]) {
        expect(canSendOffer(status)).toBe(true)
      }
    })

    it('refuses a second offer while one is live, or after the candidacy is closed', () => {
      for (const status of ['OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as CandidacyStatus[]) {
        expect(canSendOffer(status)).toBe(false)
      }
    })
  })
})
