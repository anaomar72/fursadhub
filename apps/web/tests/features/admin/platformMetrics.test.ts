import { describe, expect, it } from 'vitest'
import {
  attentionItems,
  headlineCounts,
  pendingInstitutionReviews,
  publiclyDiscoverable,
  total,
} from '../../../src/features/admin/platformMetrics'
import type { PlatformStatistics } from '../../../src/features/admin/types'

function statistics(overrides: Partial<PlatformStatistics> = {}): PlatformStatistics {
  return {
    usersByStatus: { ACTIVE: 40, SUSPENDED: 2, PENDING_CONTACT_VERIFICATION: 8 },
    studentProfiles: 24,
    studentEnrollmentsByVerificationStatus: { VERIFIED: 18, SUBMITTED: 4, DRAFT: 2 },
    universities: 3,
    universitiesByVerificationStatus: { VERIFIED: 2, SUBMITTED: 1 },
    organizationsByVerificationStatus: { VERIFIED: 5, SUBMITTED: 2, UNDER_REVIEW: 1 },
    opportunitiesByStatus: { PUBLISHED: 12, DRAFT: 4, CLOSED: 2 },
    publiclyDiscoverableOpportunities: 9,
    candidacies: 130,
    placementsByStatus: { ACTIVE: 9, COMPLETED: 20 },
    openPrivacyRequests: 0,
    escalatedVerificationCases: 0,
    failedEmailDeliveries: 0,
    recentLoginFailures: 0,
    ...overrides,
  }
}

describe('total', () => {
  it('sums a GROUP BY map', () => {
    expect(total({ A: 1, B: 2, C: 3 })).toBe(6)
  })

  it('is zero for a machine with no rows yet', () => {
    expect(total({})).toBe(0)
  })
})

describe('headlineCounts', () => {
  it('derives every figure from the statistics payload', () => {
    const counts = headlineCounts(statistics())
    const byId = Object.fromEntries(counts.map((count) => [count.id, count.value]))

    expect(byId.users).toBe(50)
    expect(byId.universities).toBe(3)
    expect(byId.organizations).toBe(8)
    expect(byId.opportunities).toBe(18)
    expect(byId.candidacies).toBe(130)
    expect(byId.placements).toBe(29)
  })

  it('links only to screens that exist', () => {
    const counts = headlineCounts(statistics())
    const linked = counts.filter((count) => count.to !== null).map((count) => count.id)

    // Backend Phase B6 added the internships screen, so that card's link now goes somewhere. The
    // three that remain unlinked have no platform-wide list endpoint, and B6 did not add one.
    expect(linked).toEqual(['users', 'universities', 'organizations', 'opportunities'])
  })

  it('gives the unlinkable counts a real breakdown instead of a dead link', () => {
    const counts = headlineCounts(statistics())

    // Applications and placements still cannot be listed platform-wide, so they carry their real
    // figures rather than a "View all" that would 404.
    const placements = counts.find((count) => count.id === 'placements')!
    expect(placements.to).toBeNull()
    expect(placements.breakdown).toEqual({ ACTIVE: 9, COMPLETED: 20 })

    const candidacies = counts.find((count) => count.id === 'candidacies')!
    expect(candidacies.to).toBeNull()
    expect(candidacies.value).toBe(130)
  })

  it('sources the students card from student profiles, not the account count', () => {
    // Backend Phase B6 added studentProfiles. The card must read THAT, never the users table —
    // a recruiter has an account and is not a student.
    const counts = headlineCounts(statistics())
    const students = counts.find((count) => count.id === 'students')!

    expect(students.value).toBe(24)
    expect(students.value).not.toBe(total(statistics().usersByStatus))
    // No list screen exists for students, so the card must not pretend one does.
    expect(students.to).toBeNull()
  })

  it('survives an empty platform without inventing numbers', () => {
    const counts = headlineCounts(
      statistics({
        usersByStatus: {},
        studentProfiles: 0,
        studentEnrollmentsByVerificationStatus: {},
        universities: 0,
        universitiesByVerificationStatus: {},
        organizationsByVerificationStatus: {},
        opportunitiesByStatus: {},
        publiclyDiscoverableOpportunities: 0,
        candidacies: 0,
        placementsByStatus: {},
      }),
    )
    expect(counts.every((count) => count.value === 0)).toBe(true)
  })

  describe('publiclyDiscoverable', () => {
    it('reports the gap between what is published and what the public can see', () => {
      // 12 PUBLISHED, 9 actually discoverable — the 3 are targeted-only listings or ones whose
      // organization has since been suspended (Backend Phase B1.5).
      expect(publiclyDiscoverable(statistics())).toEqual({
        discoverable: 9,
        published: 12,
        hidden: 3,
      })
    })

    it('never reports a negative hidden count', () => {
      // Defensive: the two figures are counted by separate queries, so a race between them must
      // read as "nothing hidden" rather than as a negative number on the dashboard.
      expect(
        publiclyDiscoverable(statistics({ publiclyDiscoverableOpportunities: 20 })).hidden,
      ).toBe(0)
    })

    it('treats an absent PUBLISHED key as zero', () => {
      expect(publiclyDiscoverable(statistics({ opportunitiesByStatus: { DRAFT: 4 } }))).toEqual({
        discoverable: 9,
        published: 0,
        hidden: 0,
      })
    })
  })
})

describe('attentionItems', () => {
  it('reads healthy when every queue is empty', () => {
    const items = attentionItems(statistics())
    const queues = items.filter((item) => !item.informational)

    expect(queues.every((item) => item.tone === 'success')).toBe(true)
  })

  it('never calls routine login failures an alarm', () => {
    // Some failed sign-ins every day is normal. Flagging that would train an administrator to
    // ignore this strip, which is the one place a real outage has to be visible.
    const failures = attentionItems(statistics({ recentLoginFailures: 42 })).find(
      (item) => item.id === 'recentLoginFailures',
    )!

    expect(failures.informational).toBe(true)
    expect(failures.tone).toBe('info')
  })

  it('raises the tone as soon as something needs a person', () => {
    const items = attentionItems(
      statistics({ failedEmailDeliveries: 3, escalatedVerificationCases: 1 }),
    )
    const byId = Object.fromEntries(items.map((item) => [item.id, item]))

    // A failing outbox means mail is not reaching people at all.
    expect(byId.failedEmails.tone).toBe('danger')
    expect(byId.escalatedCases.tone).toBe('warning')
    expect(byId.openPrivacyRequests.tone).toBe('success')
  })

  it('links only the two that have a screen to work them on', () => {
    const linked = attentionItems(statistics())
      .filter((item) => item.to !== null)
      .map((item) => item.id)

    // Failed email and login failures are indicators: no endpoint lists either.
    expect(linked).toEqual(['escalatedCases', 'openPrivacyRequests'])
  })
})

describe('pendingInstitutionReviews', () => {
  it('counts only the states where the ball is on the platform side', () => {
    expect(
      pendingInstitutionReviews({ SUBMITTED: 2, UNDER_REVIEW: 3, VERIFIED: 10, NEEDS_CHANGES: 4 }),
    ).toBe(5)
  })

  it('is zero when nothing is waiting', () => {
    expect(pendingInstitutionReviews({ VERIFIED: 10 })).toBe(0)
  })
})
