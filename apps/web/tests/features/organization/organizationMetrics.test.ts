import { describe, expect, it } from 'vitest'
import {
  OPPORTUNITY_STATUS_ORDER,
  activeOpportunityCount,
  allCandidates,
  countByOpportunityStatus,
  currentInternCount,
  livePlacementCount,
  placementsMissingSupervisor,
  recentApplications,
  recruitingOpportunities,
  universityPartners,
} from '../../../src/features/organization/organizationMetrics'
import type { OpportunityResponse, OpportunityStatus } from '../../../src/features/opportunities/types'
import type { PlacementResponse, PlacementStatus } from '../../../src/features/placements/types'
import type { CandidateRowResponse } from '../../../src/features/recruitment/types'

function opportunity(overrides: Partial<OpportunityResponse> = {}): OpportunityResponse {
  return {
    id: 'opp-1',
    organizationId: 'org-1',
    title: 'Backend Intern',
    description: 'Build APIs',
    responsibilities: null,
    requirements: null,
    mode: 'PUBLIC',
    numberOfOpenings: 2,
    workMode: 'ONSITE',
    location: 'Mogadishu',
    startDate: '2026-03-01',
    endDate: '2026-06-01',
    applicationDeadline: '2026-02-01',
    status: 'PUBLISHED',
    publishedAt: '2026-01-15T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    ...overrides,
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

function candidate(id: string, createdAt: string): CandidateRowResponse {
  return {
    candidacyId: id,
    studentUserId: `stu-${id}`,
    studentEmail: `${id}@example.test`,
    studentFullName: `Student ${id}`,
    source: 'SELF_APPLICATION',
    status: 'SUBMITTED',
    createdAt,
    liveOffer: null,
  }
}

describe('opportunity counts', () => {
  it('counts only PUBLISHED as active', () => {
    // A PAUSED internship still holds its candidates but is not live to applicants; counting it as
    // active would overstate what the organization has in market.
    const rows = (['DRAFT', 'PUBLISHED', 'PUBLISHED', 'PAUSED', 'CLOSED'] as OpportunityStatus[]).map((status, i) =>
      opportunity({ id: `opp-${i}`, status }),
    )

    expect(activeOpportunityCount(rows)).toBe(2)
  })

  it('scans only the internships that can hold a candidate pool', () => {
    const rows = (['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'CANCELLED'] as OpportunityStatus[]).map((status, i) =>
      opportunity({ id: `opp-${i}`, status }),
    )

    // A DRAFT has never been open to applicants and a CLOSED one is finished — querying either can
    // only come back empty.
    expect(recruitingOpportunities(rows).map((row) => row.status)).toEqual(['PUBLISHED', 'PAUSED'])
  })

  it('counts every lifecycle state, including the empty ones', () => {
    const counts = countByOpportunityStatus([opportunity({ status: 'DRAFT' })])

    expect(Object.keys(counts).sort()).toEqual([...OPPORTUNITY_STATUS_ORDER].sort())
    expect(counts.DRAFT).toBe(1)
    expect(counts.PUBLISHED).toBe(0)
  })
})

describe('placement counts', () => {
  it('separates live placements from interns actually on site', () => {
    const rows = (['PLANNED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED'] as PlacementStatus[]).map((status, i) =>
      placement({ id: `plc-${i}`, status }),
    )

    // PLANNED occupies the student but nobody has started, so it is live but not a current intern.
    expect(livePlacementCount(rows)).toBe(3)
    expect(currentInternCount(rows)).toBe(2)
  })

  it('surfaces only running placements that still need a supervisor', () => {
    const rows = [
      placement({ id: 'a', status: 'ACTIVE', organizationSupervisor: null }),
      placement({ id: 'b', status: 'PLANNED', organizationSupervisor: null }),
      // Already finished — nobody needs to be assigned to it now.
      placement({ id: 'c', status: 'COMPLETED', organizationSupervisor: null }),
      placement({
        id: 'd',
        status: 'ACTIVE',
        organizationSupervisor: {
          id: 'asg-1',
          supervisorUserId: 'sup-1',
          supervisorEmail: 'sup@example.test',
          type: 'ORGANIZATION',
          assignedAt: '2026-03-01T00:00:00Z',
          removedAt: null,
          active: true,
        },
      }),
    ]

    expect(placementsMissingSupervisor(rows).map((row) => row.id)).toEqual(['a', 'b'])
  })
})

describe('universityPartners', () => {
  it('derives partners from the placement list rather than a directory', () => {
    // FursadHub has no partnership record — a university becomes a partner by placing a student.
    const rows = universityPartners([
      placement({ id: 'p1', universityId: 'uni-1', universityName: 'Jamhuriya', studentUserId: 'stu-1', status: 'ACTIVE' }),
      placement({ id: 'p2', universityId: 'uni-1', universityName: 'Jamhuriya', studentUserId: 'stu-2', status: 'COMPLETED' }),
      placement({ id: 'p3', universityId: 'uni-2', universityName: 'SIMAD', studentUserId: 'stu-3', status: 'COMPLETED' }),
    ])

    expect(rows).toHaveLength(2)
    // Most live activity first.
    expect(rows[0].id).toBe('uni-1')
    expect(rows[0].placementCount).toBe(2)
    expect(rows[0].livePlacementCount).toBe(1)
    expect(rows[0].studentCount).toBe(2)
  })

  it('counts a repeat student once', () => {
    const rows = universityPartners([
      placement({ id: 'p1', studentUserId: 'stu-1', status: 'COMPLETED' }),
      placement({ id: 'p2', studentUserId: 'stu-1', status: 'ACTIVE' }),
    ])

    expect(rows[0].placementCount).toBe(2)
    expect(rows[0].studentCount).toBe(1)
  })

  it('returns nothing when the organization has hosted nobody', () => {
    expect(universityPartners([])).toEqual([])
  })
})

describe('recentApplications', () => {
  it('orders newest first across every scanned internship and caps the list', () => {
    const rows = [
      { opportunity: opportunity({ id: 'opp-1' }), candidates: [candidate('a', '2026-08-01T00:00:00Z')] },
      {
        opportunity: opportunity({ id: 'opp-2', title: 'Data Intern' }),
        candidates: [candidate('b', '2026-08-05T00:00:00Z'), candidate('c', '2026-08-03T00:00:00Z')],
      },
    ]

    const recent = recentApplications(rows, 2)

    expect(recent.map((row) => row.candidate.candidacyId)).toEqual(['b', 'c'])
    // Each row keeps the internship it came from, so the panel can name it.
    expect(recent[0].opportunity.title).toBe('Data Intern')
    expect(allCandidates(rows)).toHaveLength(3)
  })
})
