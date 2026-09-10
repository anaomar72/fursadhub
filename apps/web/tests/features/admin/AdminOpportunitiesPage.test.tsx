import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminOpportunitiesPage } from '../../../src/features/admin/pages/AdminOpportunitiesPage'
import i18n from '../../../src/lib/i18n'
import type { AdminOpportunity } from '../../../src/features/admin/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function opportunity(overrides: Partial<AdminOpportunity> = {}): AdminOpportunity {
  return {
    id: 'opp-1',
    organizationId: 'org-1',
    organizationName: 'Hormuud Telecom',
    organizationVerificationStatus: 'VERIFIED',
    title: 'Backend Engineering Intern',
    status: 'PUBLISHED',
    mode: 'PUBLIC',
    workMode: 'HYBRID',
    location: 'Mogadishu',
    numberOfOpenings: 3,
    startDate: '2026-11-01',
    endDate: '2027-02-01',
    applicationDeadline: '2026-10-01',
    createdAt: '2026-09-01T00:00:00Z',
    publishedAt: '2026-09-02T00:00:00Z',
    publiclyDiscoverable: true,
    ...overrides,
  }
}

function stubFetch(rows: AdminOpportunity[] = [opportunity()]) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/admin/opportunities/')) {
      return jsonResponse({
        summary: rows[0],
        description: 'Work with our platform team.',
        responsibilities: 'Ship features.',
        requirements: 'Java or TypeScript.',
        compensation: null,
        skills: ['Java', 'SQL'],
        perks: ['Transport allowance'],
        hoursPerWeek: 20,
      })
    }
    if (url.includes('/admin/opportunities')) {
      return jsonResponse({
        content: rows,
        page: 0,
        size: 20,
        totalElements: rows.length,
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
        <AdminOpportunitiesPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AdminOpportunitiesPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('lists opportunities with their organization and state', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('Backend Engineering Intern')).toBeInTheDocument()
    expect(screen.getByText('Hormuud Telecom')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Published')).toBeInTheDocument()
  })

  /**
   * The column the screen exists for. A PUBLISHED listing whose organization has been suspended is
   * invisible publicly, and an operator has to be able to see that at a glance rather than infer it.
   */
  it('separates the stored state from whether the public can actually see it', async () => {
    stubFetch([
      opportunity({
        id: 'opp-hidden',
        status: 'PUBLISHED',
        organizationVerificationStatus: 'SUSPENDED',
        publiclyDiscoverable: false,
      }),
    ])
    renderPage()

    const table = within(await screen.findByRole('table'))
    expect(table.getByText('Published')).toBeInTheDocument()
    expect(table.getByText('Hidden')).toBeInTheDocument()
    expect(table.queryByText('Visible')).not.toBeInTheDocument()
  })

  /** B6 is read-only: the table offers a view action and nothing that could change a listing. */
  it('offers no control that would mutate an opportunity', async () => {
    stubFetch()
    renderPage()

    await screen.findByText('Backend Engineering Intern')
    for (const forbidden of [/publish/i, /pause/i, /resume/i, /close/i, /cancel/i, /delete/i, /edit/i]) {
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
  })

  it('sends the status filter to the server rather than narrowing in the browser', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await screen.findByText('Backend Engineering Intern')
    await userEvent.selectOptions(screen.getByLabelText('State'), 'DRAFT')

    const requested = fetchMock.mock.calls.map(([input]) => String(input))
    expect(requested.some((url) => url.includes('status=DRAFT'))).toBe(true)
  })

  it('opens the full record without leaving the filtered table', async () => {
    stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'View' }))

    const drawer = within(await screen.findByRole('dialog'))
    expect(drawer.getByText('Java')).toBeInTheDocument()
    expect(drawer.getByText('Transport allowance')).toBeInTheDocument()
    expect(drawer.getByText('Work with our platform team.')).toBeInTheDocument()
    // The table is still behind it.
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
