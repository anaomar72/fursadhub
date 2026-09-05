import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminDashboardPage } from '../../../src/features/admin/pages/AdminDashboardPage'
import i18n from '../../../src/lib/i18n'
import type { PlatformStatistics } from '../../../src/features/admin/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const STATISTICS: PlatformStatistics = {
  usersByStatus: { ACTIVE: 40, SUSPENDED: 2 },
  studentProfiles: 24,
  studentEnrollmentsByVerificationStatus: { VERIFIED: 18, SUBMITTED: 4 },
  universities: 3,
  universitiesByVerificationStatus: { VERIFIED: 2, SUBMITTED: 1 },
  organizationsByVerificationStatus: { VERIFIED: 5, SUBMITTED: 2 },
  opportunitiesByStatus: { PUBLISHED: 12, DRAFT: 4 },
  publiclyDiscoverableOpportunities: 9,
  candidacies: 130,
  placementsByStatus: { ACTIVE: 9 },
  openPrivacyRequests: 1,
  escalatedVerificationCases: 0,
  failedEmailDeliveries: 0,
  recentLoginFailures: 4,
}

function stubFetch(options: { statistics?: PlatformStatistics | null; types?: string[]; auditFails?: boolean } = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/admin/audit-events/types')) {
      return jsonResponse(options.types ?? ['LOGIN_SUCCESS', 'OFFER_ACCEPTED'])
    }
    if (url.includes('/admin/audit-events')) {
      if (options.auditFails) {
        return jsonResponse(
          { code: 'INTERNAL_ERROR', message: 'x', status: 500, path: '/x', timestamp: '', fieldErrors: [] },
          500,
        )
      }
      return jsonResponse({ content: [], page: 0, size: 1, totalElements: 7, totalPages: 7 })
    }
    if (url.includes('/admin/statistics')) {
      if (options.statistics === null) {
        return jsonResponse(
          { code: 'ACCESS_DENIED', message: 'x', status: 403, path: '/x', timestamp: '', fieldErrors: [] },
          403,
        )
      }
      return jsonResponse(options.statistics ?? STATISTICS)
    }
    if (url.includes('/admin/users')) {
      return jsonResponse({
        content: [
          {
            id: 'u-9',
            email: 'newest@example.test',
            status: 'ACTIVE',
            preferredLocale: 'en',
            emailVerifiedAt: null,
            createdAt: '2026-09-01T00:00:00Z',
          },
        ],
        page: 0,
        size: 25,
        totalElements: 1,
        totalPages: 1,
      })
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <AdminDashboardPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AdminDashboardPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('shows the headline counts computed from the statistics endpoint', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('42')).toBeInTheDocument() // accounts: 40 + 2
    expect(screen.getByText('130')).toBeInTheDocument() // candidacies, verbatim
    expect(screen.getByText('16')).toBeInTheDocument() // opportunities: 12 + 4
  })

  it('shows none of the prototype figures it could not source', async () => {
    stubFetch()
    renderPage()

    await screen.findByText('42')
    // The mock hero numbers from the approved prototype must not survive anywhere on the page.
    for (const invented of ['12,450', '8,500', '1,250', '18,450', '2,800']) {
      expect(screen.queryByText(invented)).not.toBeInTheDocument()
    }
    // No GROWTH annotation: FursadHub stores no historical series to compute one from, so any
    // "+12% this month" would be invented. The percentages that DO appear are StatusDistribution
    // shares of a real GROUP BY — a proportion of data the page already has, not a trend.
    for (const trend of [/[+−-]\s*\d+%/, /this month/i, /vs\.? last/i, /↑|↓/]) {
      expect(screen.queryByText(trend)).not.toBeInTheDocument()
    }
  })

  /**
   * Backend Phase B6 gave the Students card a real source. It must read studentProfiles (24), never
   * the account total (42) — the distinction is the whole reason the metric was added.
   */
  it('shows students from the student-profile count, not the account count', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('Students')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
  })

  /**
   * The dashboard must say plainly that PUBLISHED is not the same as publicly visible, because
   * Backend Phase B1.5 hides some published listings and an administrator comparing this page to
   * the public site would otherwise conclude one of them was broken.
   */
  it('states how many published internships the public can actually see', async () => {
    stubFetch()
    renderPage()

    expect(
      await screen.findByText(/9 of 12 published internships are visible on the public site/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/3 are hidden/i)).toBeInTheDocument()
  })

  it('surfaces the operational counts that mean somebody has work to do', async () => {
    stubFetch()
    renderPage()

    const attention = await screen.findByRole('region', { name: 'Needs attention' })
    expect(within(attention).getByText('Open privacy requests')).toBeInTheDocument()
    expect(within(attention).getByText('Failed email deliveries')).toBeInTheDocument()
    expect(within(attention).getByText('Login failures (24h)')).toBeInTheDocument()
  })

  it('counts the activity chart from the audit endpoint one month at a time', async () => {
    const fetchMock = stubFetch()
    renderPage()
    // The chart's own queries only start once the event-type list has resolved.
    await screen.findByLabelText('Event type')
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).includes('/admin/audit-events?')).length,
      ).toBeGreaterThan(0),
    )

    const auditCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/admin/audit-events?'))

    expect(auditCalls.length).toBe(12)
    // Each bucket asks for the smallest page and reads totalElements, rather than downloading events.
    expect(auditCalls.every((url) => url.includes('from=') && url.includes('to=') && url.includes('size=1'))).toBe(true)
  })

  it('offers only event types the trail actually holds', async () => {
    stubFetch({ types: ['LOGIN_SUCCESS'] })
    renderPage()

    const select = await screen.findByLabelText('Event type')
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(1))
  })

  it('says so rather than drawing an empty chart when nothing is recorded', async () => {
    stubFetch({ types: [] })
    renderPage()

    expect(await screen.findByText('Nothing has been recorded yet.')).toBeInTheDocument()
  })

  it('opens on an event that tracks activity, not whichever sorts first alphabetically', async () => {
    // The API returns the distinct types alphabetically, so types[0] is ACCOUNT_SUSPENDED on a real
    // trail — the rarest event, and a useless default.
    stubFetch({ types: ['ACCOUNT_SUSPENDED', 'LOGIN_SUCCESS', 'LOGOUT'] })
    renderPage()

    const select = await screen.findByLabelText<HTMLSelectElement>('Event type')
    await waitFor(() => expect(select.value).toBe('LOGIN_SUCCESS'))
  })

  it('shows an error instead of a flat zero line when every month fails', async () => {
    // Plotting `count ?? 0` here would draw a line along zero, which reads as "nothing happened all
    // year" — a fabricated fact rather than a missing one.
    stubFetch({ auditFails: true })
    renderPage()

    expect(
      await screen.findByText(
        'Platform activity could not be counted. The audit search endpoint is returning an error.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Recorded events per month' })).not.toBeInTheDocument()
  })

  it('does not retry the twelve-request fan-out when the endpoint is failing', async () => {
    const fetchMock = stubFetch({ auditFails: true })
    renderPage()
    await screen.findByText(
      'Platform activity could not be counted. The audit search endpoint is returning an error.',
      {},
      { timeout: 5000 },
    )

    const bucketCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/admin/audit-events?'))
    // One per month, never a second attempt: retrying turns one load into two dozen failures.
    expect(bucketCalls.length).toBe(12)
  })

  it('lists the newest accounts, which the users endpoint already sorts', async () => {
    stubFetch()
    renderPage()

    const recent = await screen.findByRole('link', { name: 'newest@example.test' })
    expect(recent).toHaveAttribute('href', '/admin/users/u-9')
  })

  it('shows the API refusal rather than a dashboard of zeroes', async () => {
    stubFetch({ statistics: null })
    renderPage()

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'Statistics are not available right now.',
    )
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByText('Wadarta xisaabaadka')).toBeInTheDocument()
    expect(screen.getByText('Dhaqdhaqaaqa nidaamka')).toBeInTheDocument()
  })
})
