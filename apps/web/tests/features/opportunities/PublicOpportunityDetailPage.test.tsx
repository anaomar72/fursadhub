import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicOpportunityDetailPage } from '../../../src/features/opportunities/pages/PublicOpportunityDetailPage'
import i18n from '../../../src/lib/i18n'

vi.mock('../../../src/features/student/hooks/useStudentMarketplaceAccess', () => ({
  useStudentMarketplaceAccess: () => ({ isAuthenticated: false, canAct: false, isLoading: false }),
}))
vi.mock('../../../src/lib/auth/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, isInitializing: false }) }))

const base = {
  id: 'opp-1',
  organization: { id: 'org-1', name: 'Hormuud', slug: 'hormuud', type: 'COMPANY', verified: true, hasLogo: false },
  title: 'Backend Intern',
  description: 'Build the FursadHub API.',
  responsibilities: 'Write endpoints.',
  requirements: 'Java basics.',
  mode: 'PUBLIC',
  numberOfOpenings: 2,
  workMode: 'ONSITE',
  location: 'Mogadishu',
  startDate: '2099-03-01',
  endDate: '2099-06-01',
  applicationDeadline: '2099-02-01',
  skills: [],
  perks: [],
  publishedAt: '2026-08-01T00:00:00Z',
}

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function stub(opportunity: typeof base) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/public/opportunities/opp-1')) return json(opportunity)
      if (url.includes('/public/opportunities')) return json({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 })
      if (url.includes('/public/organizations/org-1')) return json({ id: 'org-1', name: 'Hormuud', verified: true, hasLogo: false, hasCover: false })
      return json({}, 404)
    }),
  )
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/opportunities/opp-1']}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <Routes>
          <Route path="/opportunities/:opportunityId" element={<PublicOpportunityDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('public internship detail', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows the role as the page’s single h1, with the organization and key details', async () => {
    stub(base)
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Backend Intern' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: 'Hormuud' })[0]).toHaveAttribute('href', '/organizations/org-1')
    expect(screen.getByRole('heading', { name: 'Key details' })).toBeInTheDocument()
    expect(screen.getByText('Openings')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Responsibilities' })).toBeInTheDocument()
  })

  it('offers a signed-out visitor the sign-in route to apply while applications are open', async () => {
    stub(base)
    renderPage()

    expect(await screen.findByRole('link', { name: 'Sign in to apply for this internship' })).toHaveAttribute('href', '/login')
  })

  it('does not invite an application once the deadline has passed', async () => {
    stub({ ...base, applicationDeadline: '2020-01-01' })
    renderPage()

    expect(await screen.findByText('This internship is no longer accepting applications.')).toBeInTheDocument()
    expect(screen.getAllByText('Applications have closed').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /apply/i })).not.toBeInTheDocument()
  })

  it('puts the apply panel before the description in reading order, for phones', async () => {
    stub(base)
    renderPage()

    const apply = await screen.findByRole('heading', { name: 'Apply for this internship' })
    const about = screen.getByRole('heading', { name: 'About the internship' })
    expect(apply.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('holds the page shape with a skeleton while loading, not a spinner', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderPage()

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('explains a missing opportunity and links back to the list', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json({ code: 'NOT_FOUND', message: 'x' }, 404)))
    renderPage()

    expect(await screen.findByText('This opportunity is no longer available.')).toBeInTheDocument()
    const back = screen.getByRole('link', { name: 'Back to all opportunities' })
    expect(within(back.parentElement!).getByRole('link')).toHaveAttribute('href', '/opportunities')
  })
})
