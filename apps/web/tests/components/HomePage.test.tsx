import { act, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '../../src/app/pages/HomePage'
import i18n from '../../src/lib/i18n'
import { useAuth } from '../../src/lib/auth/AuthContext'

vi.mock('../../src/lib/auth/AuthContext', () => ({ useAuth: vi.fn(() => ({ isAuthenticated: false })) }))

const emptyPage = { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 }

const opportunity = {
  id: 'opp-1',
  organization: { id: 'org-1', name: 'Hormuud', slug: 'hormuud', type: 'COMPANY', verified: true, hasLogo: false },
  title: 'Backend Intern',
  description: 'Work on the API.',
  responsibilities: null,
  requirements: null,
  mode: 'PUBLIC',
  numberOfOpenings: 2,
  workMode: 'ONSITE',
  location: 'Mogadishu',
  startDate: '2099-03-01',
  endDate: '2099-06-01',
  applicationDeadline: '2099-02-01',
  skills: ['java'],
  perks: [],
  publishedAt: '2026-08-01T00:00:00Z',
}

function renderPage(page: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>
    </MemoryRouter>,
  )
}

function stubFetch(body: (url: string) => unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(new Response(JSON.stringify(body(String(input))), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    ),
  )
}

describe('public home page', () => {
  beforeEach(() => {
    // Everything the page renders comes from these responses — never from illustrative examples.
    stubFetch(() => emptyPage)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
    await act(() => i18n.changeLanguage('en'))
  })

  it('reports an unavailable backend as an inline section error, not an empty marketplace', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network unavailable'))))
    renderPage(<HomePage />)
    expect(await screen.findByText('Internship opportunities could not be loaded.')).toBeInTheDocument()
    expect(screen.queryByText('New internships are on their way')).not.toBeInTheDocument()
    // The rest of the page still renders: one failed section does not take the page down.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How FursadHub Works' })).toBeInTheDocument()
  })

  it('states the value proposition with a single h1 and searches the marketplace as its primary action', () => {
    renderPage(<HomePage />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: /Find Internships\./ })).toBeInTheDocument()
    expect(screen.getByText(/one internship pipeline/i)).toBeInTheDocument()
    const search = screen.getByRole('search', { name: 'Search internships' })
    expect(within(search).getByPlaceholderText('Search internships, skills, or organizations')).toBeInTheDocument()
    expect(within(search).getByRole('button', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See how it works' })).toHaveAttribute('href', '#how-it-works')
  })

  it('earns trust from what the product enforces, never from counts or placeholder stories', async () => {
    renderPage(<HomePage />)

    expect(screen.getByRole('heading', { name: 'Built on verification, not just listings' })).toBeInTheDocument()
    for (const title of ['Verified institutions', 'Confirmed enrollment', 'One candidate pipeline', 'Followed to completion']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    await screen.findByText('New internships are on their way')
    expect(screen.queryByText(/Published internships|Partner organizations|Partner universities/)).not.toBeInTheDocument()
    expect(screen.queryByText('Awaiting approved testimonials')).not.toBeInTheDocument()
  })

  it('designs the low-data state instead of leaving a blank grid', async () => {
    renderPage(<HomePage />)

    expect(await screen.findByText('New internships are on their way')).toBeInTheDocument()
    expect(screen.getByText('Opportunities appear here as soon as verified organizations publish them.')).toBeInTheDocument()
    // No "view all" into an empty marketplace.
    expect(screen.queryByRole('link', { name: 'View all internships' })).not.toBeInTheDocument()
  })

  it('shows real published internships, linked by title, with a way into the marketplace', async () => {
    stubFetch((url) => (url.includes('/public/opportunities') ? { ...emptyPage, content: [opportunity], totalElements: 1, totalPages: 1 } : emptyPage))
    renderPage(<HomePage />)

    expect(await screen.findByRole('link', { name: 'Backend Intern' })).toHaveAttribute('href', '/opportunities/opp-1')
    expect(screen.getByRole('link', { name: 'View all internships' })).toHaveAttribute('href', '/opportunities')
  })

  it('explains the journey, the three roles and the lifecycle after the offer, with real routes', () => {
    renderPage(<HomePage />)

    expect(screen.getByRole('heading', { name: 'How FursadHub Works' }).closest('section')).toHaveAttribute('id', 'how-it-works')
    expect(screen.getByRole('heading', { name: 'One platform, three ways in' })).toBeInTheDocument()
    // Browsing is the student-facing action; institutions are invited to register.
    expect(screen.getByRole('link', { name: 'Find internships' })).toHaveAttribute('href', '/opportunities')
    expect(screen.getByRole('link', { name: 'Post an internship' })).toHaveAttribute('href', '/register?role=organization')
    expect(screen.getByRole('link', { name: 'Partner with us' })).toHaveAttribute('href', '/register?role=university')
    const lifecycle = screen.getByRole('heading', { name: 'One pipeline, start to finish' }).closest('section')!
    for (const stage of ['Weekly logs', 'Attendance', 'Evaluation', 'Final report', 'Final defense']) {
      expect(within(lifecycle).getByText(stage)).toBeInTheDocument()
    }
  })

  it('closes with one primary call to action for visitors, and none for a signed-in account', () => {
    const { unmount } = renderPage(<HomePage />)
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
    unmount()

    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>)
    renderPage(<HomePage />)
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument()
  })

  it('renders the hero, journey and low-data state in Somali', async () => {
    await act(() => i18n.changeLanguage('so'))
    renderPage(<HomePage />)

    expect(screen.getByRole('heading', { level: 1, name: /Hel Tababaro\./ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sida FursadHub u Shaqayso' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lagu dhisay xaqiijin, ma aha liis keliya' })).toBeInTheDocument()
    expect(await screen.findByText('Tababaro cusub ayaa soo socda')).toBeInTheDocument()
  })
})
