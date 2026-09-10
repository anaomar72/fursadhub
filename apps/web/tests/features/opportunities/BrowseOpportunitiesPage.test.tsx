import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { BrowseOpportunitiesPage } from '../../../src/features/opportunities/pages/BrowseOpportunitiesPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function opportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    title: 'Frontend Developer Intern',
    organization: { id: 'org-1', name: 'TechSolutions', verified: true },
    description: 'Build interfaces.',
    responsibilities: null,
    requirements: null,
    mode: 'PUBLIC',
    numberOfOpenings: 2,
    workMode: 'ONSITE',
    location: 'Mogadishu',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    applicationDeadline: '2026-09-20',
    publishedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

let requestedUrls: string[] = []

function stubApi({ items = [opportunity()], candidacies = [] as unknown[], fail = false } = {}) {
  requestedUrls = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      requestedUrls.push(url)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (url.includes('/students/me/candidacies')) return jsonResponse(candidacies)
      if (url.includes('/public/opportunities')) {
        if (fail) {
          return jsonResponse({ code: 'SERVER_ERROR', message: '', status: 500, path: '', timestamp: '', fieldErrors: [] }, 500)
        }
        return jsonResponse({ content: items, page: 0, size: 9, totalElements: items.length, totalPages: 1 })
      }
      return jsonResponse({})
    }),
  )
}

function renderBrowse(path = '/student/opportunities') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <BrowseOpportunitiesPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('BrowseOpportunitiesPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('lists real opportunities and links them into the student shell', async () => {
    stubApi()
    renderBrowse()

    const link = await screen.findByRole('link', { name: /frontend developer intern/i })
    expect(link).toHaveAttribute('href', '/student/opportunities/opp-1')
    expect(screen.getByText('TechSolutions')).toBeInTheDocument()
    expect(screen.getByText('1 internship found')).toBeInTheDocument()
  })

  it('sends only the filters the API actually accepts', async () => {
    const user = userEvent.setup()
    stubApi()
    renderBrowse()
    await screen.findByRole('link', { name: /frontend developer intern/i })

    await user.type(screen.getByRole('searchbox', { name: 'Search internships' }), 'data')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by work mode' }), 'REMOTE')

    await waitFor(() => {
      const last = requestedUrls.filter((url) => url.includes('/public/opportunities')).at(-1)!
      expect(last).toContain('query=data')
      expect(last).toContain('workMode=REMOTE')
    })

    // No filter is offered — or sent — for anything the endpoint cannot honour.
    const last = requestedUrls.filter((url) => url.includes('/public/opportunities')).at(-1)!
    expect(last).not.toContain('department')
    expect(last).not.toContain('mode=')
    expect(last).not.toContain('deadline')
  })

  it('marks an opportunity the student already applied to', async () => {
    stubApi({ candidacies: [{ id: 'c1', opportunityId: 'opp-1', opportunityTitle: 'x', source: 'SELF_APPLICATION', status: 'SUBMITTED', createdAt: '2026-08-01T00:00:00Z', liveOffer: null }] })
    renderBrowse()

    expect(await screen.findByText('Applied')).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    stubApi({ items: [] })
    renderBrowse()

    expect(await screen.findByText(/no opportunities match your search/i)).toBeInTheDocument()
  })

  it('shows a retryable error state when the search fails', async () => {
    stubApi({ fail: true })
    renderBrowse()

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
