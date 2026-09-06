import { describe, expect, it } from 'vitest'
import {
  liveOffers,
  needsAttention,
  opportunityLoad,
  recruiterQueues,
  withOpportunity,
} from '../../../src/features/organization/recruiterMetrics'
import type { OpportunityResponse } from '../../../src/features/opportunities/types'
import type { CandidacyStatus, CandidateRowResponse } from '../../../src/features/recruitment/types'

function opportunity(id: string, title: string): OpportunityResponse {
  return {
    id,
    organizationId: 'org-1',
    title,
    description: 'x',
    responsibilities: null,
    requirements: null,
    mode: 'PUBLIC',
    numberOfOpenings: 1,
    workMode: 'ONSITE',
    location: null,
    startDate: '2026-03-01',
    endDate: '2026-06-01',
    applicationDeadline: '2026-02-01',
    status: 'PUBLISHED',
    publishedAt: '2026-01-15T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  }
}

function candidate(
  id: string,
  status: CandidacyStatus,
  createdAt: string,
  responseDeadline?: string,
): CandidateRowResponse {
  return {
    candidacyId: id,
    studentUserId: `stu-${id}`,
    studentEmail: `${id}@example.test`,
    studentFullName: `Student ${id}`,
    source: 'SELF_APPLICATION',
    status,
    createdAt,
    liveOffer: responseDeadline
      ? {
          id: `offer-${id}`,
          candidacyId: id,
          startDate: '2026-03-01',
          endDate: '2026-06-01',
          responseDeadline,
          location: null,
          details: null,
          status: 'PENDING',
          createdAt: '2026-02-01T00:00:00Z',
          respondedAt: null,
        }
      : null,
  }
}

const POOLS = [
  {
    opportunity: opportunity('opp-1', 'Backend Intern'),
    candidates: [
      candidate('a', 'SUBMITTED', '2026-08-01T00:00:00Z'),
      candidate('b', 'UNDER_REVIEW', '2026-08-05T00:00:00Z'),
      candidate('c', 'SHORTLISTED', '2026-08-03T00:00:00Z'),
      candidate('d', 'REJECTED', '2026-08-02T00:00:00Z'),
    ],
  },
  {
    opportunity: opportunity('opp-2', 'Data Intern'),
    candidates: [
      candidate('e', 'OFFERED', '2026-08-04T00:00:00Z', '2026-09-10'),
      candidate('f', 'OFFERED', '2026-08-06T00:00:00Z', '2026-09-01'),
      candidate('g', 'ACCEPTED', '2026-07-01T00:00:00Z'),
    ],
  },
]

describe('recruiterQueues', () => {
  it('buckets candidates by the states that decide whose move it is', () => {
    const queues = recruiterQueues(POOLS)

    expect(queues.all).toHaveLength(7)
    expect(queues.newApplications.map((c) => c.candidacyId)).toEqual(['a'])
    // SUBMITTED, UNDER_REVIEW and INTERVIEW are all the organization's move.
    expect(queues.awaitingReview.map((c) => c.candidacyId).sort()).toEqual(['a', 'b'])
    expect(queues.shortlisted.map((c) => c.candidacyId)).toEqual(['c'])
    // OFFERED is the student's move — surfaced separately because the recruiter can only wait.
    expect(queues.awaitingCandidate.map((c) => c.candidacyId).sort()).toEqual(['e', 'f'])
    expect(queues.accepted.map((c) => c.candidacyId)).toEqual(['g'])
  })

  it('never counts a shortlisted candidate as awaiting review', () => {
    // Shortlisting IS a decision; leaving them in the review queue would double-count the work.
    const queues = recruiterQueues(POOLS)
    expect(queues.awaitingReview.map((c) => c.candidacyId)).not.toContain('c')
  })

  it('returns empty queues for an empty pool rather than failing', () => {
    const queues = recruiterQueues([])
    expect(queues.all).toEqual([])
    expect(queues.awaitingReview).toEqual([])
  })
})

describe('needsAttention', () => {
  it('puts the longest-waiting applicant first, not the newest', () => {
    // An application waiting a week is more urgent than one that arrived this morning; a
    // "most recent" ordering would bury exactly the people who have waited longest.
    const rows = needsAttention(POOLS, 10)

    expect(rows.map((row) => row.candidate.candidacyId)).toEqual(['a', 'b'])
    expect(rows[0].candidate.createdAt < rows[1].candidate.createdAt).toBe(true)
  })

  it('keeps the internship each candidate came from', () => {
    expect(needsAttention(POOLS, 1)[0].opportunityTitle).toBe('Backend Intern')
  })

  it('excludes anyone who is not the organization to move', () => {
    const ids = needsAttention(POOLS, 10).map((row) => row.candidate.candidacyId)
    expect(ids).not.toContain('e') // OFFERED — with the student
    expect(ids).not.toContain('c') // SHORTLISTED — already decided
    expect(ids).not.toContain('d') // REJECTED — closed
  })

  it('respects the limit', () => {
    expect(needsAttention(POOLS, 1)).toHaveLength(1)
  })
})

describe('liveOffers', () => {
  it('orders by the soonest response deadline', () => {
    const rows = liveOffers(POOLS, 10)
    expect(rows.map((row) => row.candidate.candidacyId)).toEqual(['f', 'e'])
  })

  it('shows only offers that are actually live', () => {
    const rows = liveOffers(
      [{ opportunity: opportunity('opp-3', 'X'), candidates: [candidate('h', 'OFFERED', '2026-08-01T00:00:00Z')] }],
      10,
    )
    // OFFERED with no live offer row attached is not something to chase.
    expect(rows).toEqual([])
  })
})

describe('opportunityLoad', () => {
  it('ranks internships by how much review they are waiting on', () => {
    const load = opportunityLoad(POOLS)

    expect(load[0].opportunityId).toBe('opp-1')
    expect(load[0].total).toBe(4)
    expect(load[0].awaitingReview).toBe(2)
    expect(load[1].awaitingReview).toBe(0)
  })
})

describe('withOpportunity', () => {
  it('pairs every candidate with the internship whose pool it came from', () => {
    const rows = withOpportunity(POOLS)
    expect(rows).toHaveLength(7)
    expect(rows.find((row) => row.candidate.candidacyId === 'e')?.opportunityTitle).toBe('Data Intern')
  })
})
