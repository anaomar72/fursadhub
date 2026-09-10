import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DashboardPage } from '../../../src/features/organization/pages/DashboardPage'
import { CandidateDetailPage } from '../../../src/features/recruitment/pages/CandidateDetailPage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { OrganizationRole } from '../../../src/features/organization/types'

const ORGANIZATION_ID = 'org-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

const OPPORTUNITY = {
  id: 'opp-1',
  organizationId: ORGANIZATION_ID,
  title: 'Backend Intern',
  description: 'Build APIs',
  responsibilities: null,
  requirements: null,
  mode: 'PUBLIC',
  numberOfOpenings: 2,
  workMode: 'ONSITE',
  location: 'Mogadishu',
  startDate: '2026-03-01',
  endDate: '2026-06-01',
  applicationDeadline: '2026-02-01',
  status: 'PUBLISHED',
  publishedAt: '2026-01-15T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
}

const CANDIDATE = {
  candidacyId: 'cand-1',
  studentUserId: 'stu-1',
  studentEmail: 'amina@example.test',
  studentFullName: 'Amina Yusuf',
  source: 'SELF_APPLICATION',
  status: 'SUBMITTED',
  createdAt: '2026-08-01T00:00:00Z',
  liveOffer: null,
}

const DETAIL = {
  candidacyId: 'cand-1',
  opportunityId: 'opp-1',
  studentUserId: 'stu-1',
  studentEmail: 'amina@example.test',
  studentFullName: 'Amina Yusuf',
  source: 'SELF_APPLICATION',
  status: 'SUBMITTED',
  createdAt: '2026-08-01T00:00:00Z',
  answers: [],
  offers: [],
  history: [],
}

function stubApi({
  opportunities = [OPPORTUNITY] as unknown[],
  candidates = [CANDIDATE] as unknown[],
  detail = DETAIL as unknown,
  onCommand,
}: {
  opportunities?: unknown[]
  candidates?: unknown[]
  detail?: unknown
  onCommand?: (url: string) => Promise<Response>
} = {}) {
  const calls: { url: string; method: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (init?.method === 'POST' && url.includes('/candidacies/')) {
        return onCommand ? onCommand(url) : jsonResponse({ id: 'cand-1', status: 'UNDER_REVIEW' })
      }
      if (url.includes('/screening-questions')) return jsonResponse([])
      if (url.includes('/candidacies/cand-1')) return jsonResponse(detail)
      if (url.includes('/candidacies')) return jsonResponse(candidates)
      if (url.includes('/opportunities')) return jsonResponse(opportunities)
      if (url.includes('/placements')) return jsonResponse([])
      return jsonResponse({})
    }),
  )
  return calls
}

function renderAs(role: OrganizationRole, ui: ReactElement, initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: ORGANIZATION_ID, role }}>
          {ui}
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recruiter dashboard', () => {
  it('renders the recruitment dashboard for a recruiter, not the admin one', async () => {
    stubApi()
    renderAs('RECRUITER', <DashboardPage />)

    expect(await screen.findByText('Recruitment overview')).toBeInTheDocument()
    expect(screen.queryByText('Organization overview')).not.toBeInTheDocument()
  })

  it('keeps the admin dashboard for an admin', async () => {
    stubApi()
    renderAs('ORGANIZATION_ADMIN', <DashboardPage />)

    expect(await screen.findByText('Organization overview')).toBeInTheDocument()
    expect(screen.queryByText('Recruitment overview')).not.toBeInTheDocument()
  })

  it('never asks for organization-administration data as a recruiter', async () => {
    // A recruiter administers nothing about the organization: UpdateOrganizationService and
    // OrganizationMembershipService both require ORGANIZATION_ADMIN. Asking anyway would turn
    // 403s into zeros presented as facts.
    const calls = stubApi()
    renderAs('RECRUITER', <DashboardPage />)
    await screen.findByText('Recruitment overview')

    expect(calls.some((call) => call.url.includes('/members'))).toBe(false)
    expect(calls.some((call) => call.url.endsWith(`/organizations/${ORGANIZATION_ID}`))).toBe(false)
  })

  it('counts the recruiter queues from the real candidate pools', async () => {
    stubApi({
      candidates: [
        CANDIDATE,
        { ...CANDIDATE, candidacyId: 'c2', status: 'SHORTLISTED' },
        { ...CANDIDATE, candidacyId: 'c3', status: 'OFFERED' },
        { ...CANDIDATE, candidacyId: 'c4', status: 'REJECTED' },
      ],
    })
    renderAs('RECRUITER', <DashboardPage />)

    expect((await screen.findByText('New applications')).closest('div')?.parentElement).toHaveTextContent('1')
    // "Shortlisted" is both a stat-card label and a pipeline column; the card comes first in the DOM.
    expect(screen.getAllByText('Shortlisted')[0].closest('div')?.parentElement).toHaveTextContent('1')
    // OFFERED is the student's move, surfaced separately from the recruiter's own queue.
    expect(screen.getAllByText('Awaiting candidate')[0].closest('div')?.parentElement).toHaveTextContent('1')
  })

  it('links its pipeline columns at the real stage filter', async () => {
    stubApi()
    renderAs('RECRUITER', <DashboardPage />)

    const board = await screen.findByRole('list', { name: 'Candidate pipeline' })
    const links = [...board.querySelectorAll('a')].map((a) => a.getAttribute('href'))

    expect(links).toContain('/organization/candidates?stage=SHORTLISTED')
    expect(links).toContain('/organization/candidates?stage=OFFERED')
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderAs('RECRUITER', <DashboardPage />)

    expect(await screen.findByText('Guudmarka qorista')).toBeInTheDocument()
    expect(screen.queryByText('Recruitment overview')).not.toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})

describe('recruiter candidate actions', () => {
  function renderDetail(role: OrganizationRole = 'RECRUITER') {
    return renderAs(
      role,
      <Routes>
        <Route path="/organization/candidacies/:candidacyId" element={<CandidateDetailPage />} />
      </Routes>,
      '/organization/candidacies/cand-1',
    )
  }

  it('offers every command the backend accepts from this state', async () => {
    stubApi()
    renderDetail()

    await screen.findByRole('heading', { name: 'Amina Yusuf' })

    // SUBMITTED accepts all four in Candidacy.ALLOWED_TRANSITIONS, interview included.
    expect(screen.getByRole('button', { name: /move to review/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /shortlist/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move to interview/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
  })

  it('calls the real command endpoint and never mutates status locally', async () => {
    const calls = stubApi()
    renderDetail()

    await screen.findByRole('heading', { name: 'Amina Yusuf' })
    await userEvent.click(screen.getByRole('button', { name: /shortlist/i }))

    await waitFor(() => {
      expect(
        calls.some((call) => call.method === 'POST' && call.url.endsWith('/candidacies/cand-1/shortlist')),
      ).toBe(true)
    })
  })

  it('leaves the candidate where they were when the API refuses the transition', async () => {
    // The critical rule: never animate a candidate into a new state before the backend confirms it.
    stubApi({
      onCommand: () =>
        jsonResponse(
          {
            code: 'CANDIDACY_INVALID_TRANSITION',
            message: 'raw backend text',
            status: 409,
            path: '/api/v1/candidacies/cand-1/shortlist',
            timestamp: '2026-08-22T00:00:00Z',
            fieldErrors: [],
          },
          409,
        ),
    })
    renderDetail()

    await screen.findByRole('heading', { name: 'Amina Yusuf' })
    await userEvent.click(screen.getByRole('button', { name: /shortlist/i }))

    // The backend's error code is surfaced, translated...
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't available for the candidate's current stage/i)
    // ...and the displayed status is still the one the server last reported.
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0)
    expect(screen.queryByText('Shortlisted')).not.toBeInTheDocument()
  })

  it('shows no recruitment actions to an organization supervisor', async () => {
    // CandidacyAuthorization.RECRUITING_ROLES excludes the role outright.
    stubApi()
    renderDetail('ORGANIZATION_SUPERVISOR')

    await screen.findByRole('heading', { name: 'Amina Yusuf' })

    expect(screen.queryByRole('button', { name: /shortlist/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send offer/i })).not.toBeInTheDocument()
  })
})
