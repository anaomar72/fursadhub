import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { OpportunityDetailPage } from '../../../src/features/opportunities/pages/OpportunityDetailPage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import type { OrganizationRole } from '../../../src/features/organization/types'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function opportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    organizationId: 'org-1',
    title: 'Backend Intern',
    description: 'Work on the API.',
    responsibilities: null,
    requirements: null,
    mode: 'PUBLIC',
    numberOfOpenings: 2,
    workMode: 'ONSITE',
    location: 'Mogadishu',
    startDate: '2027-03-01',
    endDate: '2027-06-01',
    applicationDeadline: '2027-02-01',
    status: 'DRAFT',
    publishedAt: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(detail: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/refresh')) {
        return jsonResponse({ code: 'REFRESH_TOKEN_INVALID', message: '', status: 401, path: '', timestamp: '', fieldErrors: [] }, 401)
      }
      if (url.includes('/targets')) {
        return jsonResponse([])
      }
      // Phase 4 mounts the screening-question editor on a draft opportunity, so this page now
      // also fetches its questions.
      if (url.includes('/screening-questions')) {
        return jsonResponse([])
      }
      if (url.includes('/universities')) {
        return jsonResponse([])
      }
      return jsonResponse(detail)
    }),
  )
}

function renderPage(role: OrganizationRole = 'ORGANIZATION_ADMIN') {
  return render(
    <MemoryRouter initialEntries={['/organization/opportunities/opp-1']}>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: 'org-1', role }}>
          <Routes>
            <Route path="/organization/opportunities/:opportunityId" element={<OpportunityDetailPage />} />
          </Routes>
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('OpportunityDetailPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('offers publish and cancel for a draft, but not pause or resume', async () => {
    stubFetch(opportunity({ status: 'DRAFT' }))
    renderPage()

    expect(await screen.findByRole('button', { name: /^publish$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^pause$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^resume$/i })).not.toBeInTheDocument()
  })

  it('offers pause and close for a published opportunity, but not publish', async () => {
    stubFetch(opportunity({ status: 'PUBLISHED' }))
    renderPage()

    expect(await screen.findByRole('button', { name: /^pause$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument()
  })

  it('offers resume for a paused opportunity', async () => {
    stubFetch(opportunity({ status: 'PAUSED' }))
    renderPage()

    expect(await screen.findByRole('button', { name: /^resume$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^pause$/i })).not.toBeInTheDocument()
  })

  it('offers no lifecycle actions for a cancelled opportunity', async () => {
    stubFetch(opportunity({ status: 'CANCELLED' }))
    renderPage()

    expect(await screen.findByText(/cancelled/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^resume$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument()
  })

  it('does not show targeting controls for a PUBLIC opportunity', async () => {
    stubFetch(opportunity({ mode: 'PUBLIC', status: 'DRAFT' }))
    renderPage()

    await screen.findByRole('button', { name: /^publish$/i })
    expect(screen.queryByRole('heading', { name: /target universities/i })).not.toBeInTheDocument()
  })

  it('shows targeting controls for a UNIVERSITY_TARGETED draft', async () => {
    stubFetch(opportunity({ mode: 'UNIVERSITY_TARGETED', status: 'DRAFT' }))
    renderPage()

    expect(await screen.findByRole('heading', { name: /target universities/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/requested nominees/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nomination deadline/i)).toBeInTheDocument()
  })

  it('shows targeting controls for a HYBRID draft', async () => {
    stubFetch(opportunity({ mode: 'HYBRID', status: 'DRAFT' }))
    renderPage()

    expect(await screen.findByRole('heading', { name: /target universities/i })).toBeInTheDocument()
  })

  it('hides management actions from an organization supervisor', async () => {
    stubFetch(opportunity({ status: 'DRAFT' }))
    renderPage('ORGANIZATION_SUPERVISOR')

    expect(await screen.findByRole('heading', { name: /backend intern/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })
})
