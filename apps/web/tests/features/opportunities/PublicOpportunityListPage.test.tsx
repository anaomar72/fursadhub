import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { PublicOpportunityListPage } from '../../../src/features/opportunities/pages/PublicOpportunityListPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

const publishedOpportunity = {
  id: 'opp-1',
  organization: { id: 'org-1', name: 'Hormuud', slug: 'hormuud', type: 'COMPANY' },
  title: 'Backend Intern',
  description: 'Work on the FursadHub API.',
  responsibilities: null,
  requirements: null,
  mode: 'PUBLIC',
  numberOfOpenings: 3,
  workMode: 'ONSITE',
  location: 'Mogadishu',
  startDate: '2027-03-01',
  endDate: '2027-06-01',
  applicationDeadline: '2027-02-01',
  publishedAt: '2026-08-01T00:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/opportunities']}>
      <AppProviders>
        <PublicOpportunityListPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('PublicOpportunityListPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders published opportunities returned by the public endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ content: [publishedOpportunity], page: 0, size: 12, totalElements: 1, totalPages: 1 })),
    )

    renderPage()

    expect(await screen.findByText('Backend Intern')).toBeInTheDocument()
    expect(screen.getByText('Hormuud')).toBeInTheDocument()
    expect(screen.getByText('Mogadishu')).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 })),
    )

    renderPage()

    expect(await screen.findByText(/no opportunities match your search/i)).toBeInTheDocument()
  })

  it('requests the public endpoint with the default pagination parameters', async () => {
    const fetchMock = vi.fn(() => jsonResponse({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 }))
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    await screen.findByText(/no opportunities match your search/i)

    const requestedUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestedUrl).toContain('/public/opportunities')
    expect(requestedUrl).toContain('page=0')
    expect(requestedUrl).toContain('size=12')
  })

  it('hides pagination when there is only a single page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ content: [publishedOpportunity], page: 0, size: 12, totalElements: 1, totalPages: 1 })),
    )

    renderPage()

    await screen.findByText('Backend Intern')
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('shows pagination controls when more than one page exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ content: [publishedOpportunity], page: 0, size: 12, totalElements: 30, totalPages: 3 })),
    )

    renderPage()

    expect(await screen.findByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
  })

  it('renders Somali translations when the language is Somali', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 })),
    )
    await i18n.changeLanguage('so')

    renderPage()

    // The approved internships hero headline (design-reference/presentation-refresh-2026, reference 02).
    expect(await screen.findByRole('heading', { name: /hel tababaro la xaqiijiyay/i })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
