import { render, screen, within, waitFor } from '@testing-library/react'
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
  verification = 'VERIFIED' as string | null,
  failPlacements = false,
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
      if (/\/organizations\/org-1$/.test(url)) return jsonResponse(verification ? { id: 'org-1', verificationStatus: verification } : {})
      if (failPlacements && url.includes('/placements')) return jsonResponse({ code: 'X', message: '', status: 500, path: '', timestamp: '', fieldErrors: [] }, 500)
      if (url.includes('/opportunities')) return jsonResponse(opportunities)
      if (url.includes('/placements')) return jsonResponse(placements)
      return jsonResponse({})
    }),
  )
  return calls
}


/** The figure shown beside a metric's label (Metric renders a dt/dd pair). */
const metric = async (label: string) => (await screen.findByText(label)).parentElement!
/** Waits for a metric to settle on a figure (it shows a dash while its source loads). */
const expectMetric = (label: string, value: string) => waitFor(async () => expect(await metric(label)).toHaveTextContent(value))

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

  it('shows at most four figures, each counted from the real list endpoints', async () => {
    stubApi({
      opportunities: [OPPORTUNITY, { ...OPPORTUNITY, id: 'opp-2', status: 'DRAFT' }],
      placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', status: 'COMPLETED' }],
      candidates: [CANDIDATE, { ...CANDIDATE, candidacyId: 'cand-2', status: 'OFFERED' }],
    })
    renderDashboard()

    // One PUBLISHED internship; the DRAFT is not recruiting.
    await expectMetric('Recruiting internships', '1')
    // One ACTIVE placement is a current intern; the COMPLETED one is not.
    await expectMetric('Current interns', '1')
    await expectMetric('Offers out', '1')
    expect(screen.getByRole('region', { name: 'At a glance' }).querySelectorAll('li')).toHaveLength(4)
  })

  it('puts the real candidacy states in the attention queue — waiting work, and offers waiting on candidates', async () => {
    stubApi({
      candidates: [CANDIDATE, { ...CANDIDATE, candidacyId: 'cand-2', status: 'OFFERED' }],
    })
    renderDashboard()

    const review = await screen.findByText('1 new application to review')
    expect(within(review.closest('li')!).getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/organization/candidates?stage=SUBMITTED')
    expect(screen.getByText("1 offer waiting for the candidate's answer")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Candidates waiting on you' })).toBeInTheDocument()
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
    expect(screen.queryByText('Candidates waiting on you')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Candidate pipeline' })).not.toBeInTheDocument()
  })

  it('surfaces drafts and unsupervised placements as work to do once verified', async () => {
    stubApi({
      opportunities: [{ ...OPPORTUNITY, status: 'DRAFT' }],
      placements: [PLACEMENT],
    })
    renderDashboard()

    expect(await screen.findByText('1 draft internship not yet published')).toBeInTheDocument()
    expect(screen.getByText('1 intern has no organization supervisor')).toBeInTheDocument()
  })

  it('does not ask an unverified organization to publish drafts — the verification cue covers that', async () => {
    stubApi({ opportunities: [{ ...OPPORTUNITY, status: 'DRAFT' }], verification: 'DRAFT' })
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Verification' })).toBeInTheDocument()
    await screen.findByText('1 intern has no organization supervisor')
    expect(screen.queryByText(/draft internship not yet published/)).not.toBeInTheDocument()
  })

  it('keeps the page when the placements cannot be read: the queue reports it, the rest still renders', async () => {
    stubApi({ failPlacements: true })
    renderDashboard()

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Organization overview' })).toBeInTheDocument()
    await expectMetric('Recruiting internships', '1')
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
