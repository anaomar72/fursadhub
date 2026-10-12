import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const EMPTY = { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 }

function renderPage(route = '/opportunities') {
  return render(
    <MemoryRouter initialEntries={[route]}>
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
    expect(screen.getByRole('heading', { level: 1, name: 'Internships' })).toBeInTheDocument()
  })

  it('says nothing is published yet when no filter is applied and the marketplace is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(EMPTY)))

    renderPage()

    expect(await screen.findByText('No internships are published right now')).toBeInTheDocument()
    // Not a "no matches" message: nothing was searched for.
    expect(screen.queryByText('No internships match your search')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('explains a search with no results and offers to clear the filters', async () => {
    const fetchMock = vi.fn(() => jsonResponse(EMPTY))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage('/opportunities?query=astronomy&workMode=REMOTE')

    expect(await screen.findByText('No internships match your search')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search internships' })).toHaveValue('astronomy')

    // Two ways to clear: beside the result heading and inside the empty state.
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])
    expect(await screen.findByText('No internships are published right now')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search internships' })).toHaveValue('')
    const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0])
    expect(lastUrl).not.toContain('query=')
    expect(lastUrl).not.toContain('workMode=')
  })

  it('sends the applied filters to the server rather than filtering on the client', async () => {
    const fetchMock = vi.fn(() => jsonResponse(EMPTY))
    vi.stubGlobal('fetch', fetchMock)

    renderPage('/opportunities?query=backend&location=Hargeisa&workMode=HYBRID')
    await screen.findByText('No internships match your search')

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('query=backend')
    expect(url).toContain('location=Hargeisa')
    expect(url).toContain('workMode=HYBRID')
  })

  it('links each card by its title and states when applications have closed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({
          content: [{ ...publishedOpportunity, applicationDeadline: '2020-01-01' }],
          page: 0,
          size: 12,
          totalElements: 1,
          totalPages: 1,
        }),
      ),
    )

    renderPage()

    const title = await screen.findByRole('link', { name: 'Backend Intern' })
    expect(title).toHaveAttribute('href', '/opportunities/opp-1')
    const card = title.closest('li') as HTMLElement
    expect(within(card).getByText('Applications have closed')).toBeInTheDocument()
  })

  it('requests the public endpoint with the default pagination parameters', async () => {
    const fetchMock = vi.fn(() => jsonResponse(EMPTY))
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    await screen.findByText('No internships are published right now')

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
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(EMPTY)))
    await i18n.changeLanguage('so')

    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Tababarada' })).toBeInTheDocument()
    expect(await screen.findByText('Hadda ma jiraan tababaro la daabacay')).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
