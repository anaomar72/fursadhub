import { describe, expect, it } from 'vitest'
import {
  attentionItems,
  headlineCounts,
  pendingInstitutionReviews,
  total,
} from '../../../src/features/admin/platformMetrics'
import type { PlatformStatistics } from '../../../src/features/admin/types'

function statistics(overrides: Partial<PlatformStatistics> = {}): PlatformStatistics {
  return {
    usersByStatus: { ACTIVE: 40, SUSPENDED: 2, PENDING_CONTACT_VERIFICATION: 8 },
    universities: 3,
    organizationsByVerificationStatus: { VERIFIED: 5, SUBMITTED: 2, UNDER_REVIEW: 1 },
    opportunitiesByStatus: { PUBLISHED: 12, DRAFT: 4, CLOSED: 2 },
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

    // Accounts, universities and organizations have real platform-wide list endpoints.
    expect(linked).toEqual(['users', 'universities', 'organizations'])
  })

  it('gives the unlinkable counts a real breakdown instead of a dead link', () => {
    const counts = headlineCounts(statistics())

    // Internships and placements cannot be listed platform-wide — platform-admin authorization
    // exists only in the administration, compliance and verification-evidence services — so they
    // carry their status split rather than a "View all" that would 403.
    const opportunities = counts.find((count) => count.id === 'opportunities')!
    expect(opportunities.to).toBeNull()
    expect(opportunities.breakdown).toEqual({ PUBLISHED: 12, DRAFT: 4, CLOSED: 2 })
  })

  it('holds no metric the statistics endpoint cannot produce', () => {
    // The prototype's "Students" card has no backend source: statistics counts ACCOUNTS by status,
    // and there is no platform-wide student endpoint anywhere in the API.
    expect(headlineCounts(statistics()).map((count) => count.id)).not.toContain('students')
  })

  it('survives an empty platform without inventing numbers', () => {
    const counts = headlineCounts(
      statistics({
        usersByStatus: {},
        universities: 0,
        organizationsByVerificationStatus: {},
        opportunitiesByStatus: {},
        candidacies: 0,
        placementsByStatus: {},
      }),
    )
    expect(counts.every((count) => count.value === 0)).toBe(true)
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
