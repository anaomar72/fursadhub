import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DashboardPage } from '../../../src/features/organization/pages/DashboardPage'
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

const PLACEMENT = {
  id: 'plc-1',
  candidacyId: 'cnd-1',
  opportunityId: 'opp-1',
  opportunityTitle: 'Backend Intern',
  organizationId: ORGANIZATION_ID,
  organizationName: 'TechSolutions',
  universityId: 'uni-1',
  universityName: 'Jamhuriya University',
  departmentId: 'dept-1',
  departmentName: 'Computer Science',
  studentUserId: 'stu-1',
  studentFullName: 'Amina Yusuf',
  studentEmail: 'amina@example.test',
  startDate: '2026-03-01',
  endDate: '2026-06-01',
  location: null,
  status: 'ACTIVE',
  startedAt: '2026-03-01T00:00:00Z',
  completionRequestedAt: null,
  completedAt: null,
  cancelledAt: null,
  terminatedAt: null,
  cancellationReason: null,
  terminationReason: null,
  universitySupervisor: null,
  organizationSupervisor: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
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

function stubApi({
  opportunities = [OPPORTUNITY] as unknown[],
  placements = [PLACEMENT] as unknown[],
  candidates = [] as unknown[],
} = {}) {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      // Most specific first: the candidate pool sits under /opportunities/{id}/candidacies.
      if (url.includes('/candidacies')) return jsonResponse(candidates)
      if (url.includes('/opportunities')) return jsonResponse(opportunities)
      if (url.includes('/placements')) return jsonResponse(placements)
      return jsonResponse({})
    }),
  )
  return calls
}

function renderDashboard(role: OrganizationRole = 'ORGANIZATION_ADMIN') {
  return render(
    <MemoryRouter>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: ORGANIZATION_ID, role }}>
          <DashboardPage />
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('organization DashboardPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('counts every headline metric from the real list endpoints', async () => {
    stubApi({
      opportunities: [OPPORTUNITY, { ...OPPORTUNITY, id: 'opp-2', status: 'DRAFT' }],
      placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', status: 'COMPLETED' }],
      candidates: [CANDIDATE, { ...CANDIDATE, candidacyId: 'cand-2', status: 'SHORTLISTED' }],
    })
    renderDashboard()

    // One PUBLISHED internship; the DRAFT is not live.
    expect((await screen.findByText('Active internships')).closest('div')?.parentElement).toHaveTextContent('1')
    // One ACTIVE placement is a current intern; the COMPLETED one is not.
    expect(screen.getByText('Current interns').closest('div')?.parentElement).toHaveTextContent('1')
  })

  it('reads the pipeline from the real candidacy states, not the prototype labels', async () => {
    stubApi({
      candidates: [
        CANDIDATE,
        { ...CANDIDATE, candidacyId: 'cand-2', status: 'SHORTLISTED' },
        { ...CANDIDATE, candidacyId: 'cand-3', status: 'OFFERED' },
      ],
    })
    renderDashboard()

    const board = await screen.findByRole('list', { name: 'Candidate pipeline' })
    expect(board).toHaveTextContent('Submitted')
    expect(board).toHaveTextContent('Offer sent')
    // "New" and "Reviewing" are prototype inventions, not statuses.
    expect(board).not.toHaveTextContent('New')
    expect(board).not.toHaveTextContent('Reviewing')
  })

  it('hands a supervisor their own dashboard instead of this one', async () => {
    // CandidacyAuthorization refuses ORGANIZATION_SUPERVISOR outright and the opportunity list is
    // not their list either, so this page would have shown them "Active internships: 0" and
    // "Applications: 0" — zeros that look like facts but are really endpoints they cannot read.
    const calls = stubApi()
    renderDashboard('ORGANIZATION_SUPERVISOR')

    await screen.findByText('Supervision overview')

    expect(screen.queryByText('Organization overview')).not.toBeInTheDocument()
    expect(calls.some((url) => url.includes('/candidacies'))).toBe(false)
    expect(screen.queryByText('Recent applications')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Candidate pipeline' })).not.toBeInTheDocument()
  })

  it('surfaces drafts and unsupervised placements as work to do', async () => {
    stubApi({
      opportunities: [{ ...OPPORTUNITY, status: 'DRAFT' }],
      placements: [PLACEMENT],
    })
    renderDashboard()

    expect(await screen.findByText('Needs publishing')).toBeInTheDocument()
    expect(screen.getByText('Placements without a supervisor')).toBeInTheDocument()
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderDashboard()

    expect(await screen.findByText('Guudmarka ururka')).toBeInTheDocument()
    expect(screen.queryByText('Organization overview')).not.toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})
