import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import { CandidateDetailPage } from '../../../src/features/recruitment/pages/CandidateDetailPage'
import { OpportunityDetailPage } from '../../../src/features/opportunities/pages/OpportunityDetailPage'
import { EvaluationPage } from '../../../src/features/evaluations/pages/EvaluationPage'
import { OrganizationPlacementOverview } from '../../../src/features/placements/pages/OrganizationPlacementOverview'
import { adminAttention, recruitingAttention, supervisorAttention } from '../../../src/features/organization/organizationAttention'
import i18n from '../../../src/lib/i18n'
import type { OrganizationRole } from '../../../src/features/organization/types'

/** Phase 6: role-aware attention, confirmed irreversible actions, and the organization's placement view. */

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let calls: { url: string; method: string }[] = []

function stub(routes: [RegExp, unknown][]) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method })
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (method === 'POST') return jsonResponse({})
      const hit = routes.find(([pattern]) => pattern.test(url))
      return jsonResponse(hit ? hit[1] : {})
    }),
  )
}

function renderAs(role: OrganizationRole, path: string, route: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: 'org-1', role }}>
          <Routes>
            <Route path={route} element={element} />
          </Routes>
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

const posted = (fragment: string) => calls.some((call) => call.method === 'POST' && call.url.includes(fragment))
const candidate = (status: string, id = status) => ({ candidacyId: id, status }) as never

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

describe('organization attention, by role', () => {
  it('recruiting work counts real candidacy states and leaves out empty queues', () => {
    expect(recruitingAttention([candidate('SUBMITTED', 'a'), candidate('SUBMITTED', 'b'), candidate('OFFERED'), candidate('REJECTED')])).toEqual([
      { kind: 'newApplications', count: 2 },
      { kind: 'offersAwaitingCandidate', count: 1 },
    ])
  })

  it('the admin also sees unsupervised interns, and drafts only once the organization is verified', () => {
    const placements = [{ status: 'ACTIVE', organizationSupervisor: null }] as never
    const opportunities = [{ status: 'DRAFT' }] as never
    expect(adminAttention({ candidates: [], placements, opportunities, verified: false }).map((i) => i.kind)).toEqual(['placementsWithoutSupervisor'])
    expect(adminAttention({ candidates: [], placements, opportunities, verified: true }).map((i) => i.kind)).toEqual(['placementsWithoutSupervisor', 'draftsToPublish'])
  })

  it('the supervisor sees disputes, attendance to confirm and evaluations not final — and never a failed read as due', () => {
    const items = supervisorAttention({
      attendance: [[{ confirmationStatus: 'RECORDED' }, { confirmationStatus: 'DISPUTED' }, { confirmationStatus: 'CONFIRMED' }] as never, undefined],
      evaluations: [
        { loaded: true, data: null },
        { loaded: true, data: { state: 'FINAL' } as never },
        { loaded: false, data: undefined },
      ],
    })
    expect(items).toEqual([
      { kind: 'attendanceDisputed', count: 1 },
      { kind: 'attendanceToConfirm', count: 1 },
      { kind: 'evaluationsDue', count: 1 },
    ])
  })
})

describe('irreversible actions are confirmed first', () => {
  it('rejecting a candidate asks first and only then calls the command', async () => {
    stub([
      [/\/candidacies\/cand-1$/, { candidacyId: 'cand-1', opportunityId: 'opp-1', studentUserId: 's', studentEmail: 'a@x.test', studentFullName: 'Amina Yusuf', source: 'SELF_APPLICATION', status: 'SUBMITTED', createdAt: '2026-08-01T00:00:00Z', answers: [], offers: [], history: [] }],
      [/screening-questions/, []],
    ])
    renderAs('RECRUITER', '/organization/candidacies/cand-1', '/organization/candidacies/:candidacyId', <CandidateDetailPage />)

    await screen.findByRole('heading', { name: 'Amina Yusuf' })
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    const dialog = await screen.findByRole('dialog', { name: 'Reject this candidate?' })
    expect(posted('/reject')).toBe(false)
    await userEvent.click(within(dialog).getByRole('button', { name: /^reject$/i }))
    await waitFor(() => expect(posted('/candidacies/cand-1/reject')).toBe(true))
  })

  it('cancelling an internship asks first; keeping it sends nothing', async () => {
    stub([
      [/\/opportunities\/opp-1\/candidacies/, [{ candidacyId: 'c1', status: 'SUBMITTED' }, { candidacyId: 'c2', status: 'OFFERED' }]],
      [/\/opportunities\/opp-1$/, { id: 'opp-1', organizationId: 'org-1', title: 'Backend Intern', description: 'APIs', mode: 'PUBLIC', numberOfOpenings: 1, workMode: 'ONSITE', startDate: '2027-03-01', endDate: '2027-06-01', applicationDeadline: '2027-02-01', status: 'PUBLISHED', skills: [], perks: [] }],
      [/\/organizations\/org-1$/, { id: 'org-1', verificationStatus: 'VERIFIED' }],
    ])
    renderAs('ORGANIZATION_ADMIN', '/organization/opportunities/opp-1', '/organization/opportunities/:opportunityId', <OpportunityDetailPage />)

    // The recruiting snapshot reads the real pool.
    const snapshot = (await screen.findByRole('heading', { name: 'Recruiting' })).closest('section') ?? document.body
    await waitFor(() => expect(within(snapshot as HTMLElement).getByText('New applications').parentElement).toHaveTextContent('1'))
    expect(screen.getByRole('link', { name: 'Open candidate pipeline' })).toHaveAttribute('href', '/organization/opportunities/opp-1/candidates')

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this internship?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep it' }))
    expect(posted('/cancel')).toBe(false)
  })

  it('finalizing an evaluation asks first, because a final evaluation can never be reopened', async () => {
    stub([[/\/evaluation$/, { id: 'ev', placementId: 'plc-1', state: 'SUBMITTED' }]])
    renderAs('ORGANIZATION_SUPERVISOR', '/organization/placements/plc-1/evaluation', '/organization/placements/:placementId/evaluation', <EvaluationPage audience="evaluator" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Finalize evaluation' }))
    const dialog = await screen.findByRole('dialog', { name: 'Finalize this evaluation?' })
    expect(posted('/finalize')).toBe(false)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Finalize evaluation' }))
    await waitFor(() => expect(posted('/evaluation/finalize')).toBe(true))
  })
})

describe('OrganizationPlacementOverview', () => {
  const placement = {
    id: 'plc-1',
    status: 'ACTIVE',
    opportunityTitle: 'Backend Intern',
    organizationName: 'CloudWorks',
    startDate: '2026-09-01',
    endDate: '2026-12-01',
    startedAt: '2026-09-01T08:00:00Z',
    universitySupervisor: null,
    organizationSupervisor: null,
  }

  function renderOverview(role: OrganizationRole) {
    return render(
      <MemoryRouter initialEntries={['/organization/placements/plc-1']}>
        <AppProviders>
          <OrganizationMembershipContext.Provider value={{ organizationId: 'org-1', role }}>
            <Routes>
              <Route path="/organization/placements/:placementId" element={<Outlet context={placement} />}>
                <Route index element={<OrganizationPlacementOverview />} />
              </Route>
            </Routes>
          </OrganizationMembershipContext.Provider>
        </AppProviders>
      </MemoryRouter>,
    )
  }

  const routes: [RegExp, unknown][] = [
    [/\/completion$/, { canComplete: false, policySource: 'UNIVERSITY', requirements: [
      { type: 'WEEKLY_LOGS', required: true, satisfied: false, detail: '1/10', unmetCode: 'X' },
      { type: 'ATTENDANCE', required: true, satisfied: false, detail: '3/4', unmetCode: 'X' },
      { type: 'ORGANIZATION_EVALUATION', required: true, satisfied: false, detail: 'DRAFT', unmetCode: 'X' },
    ] }],
    [/\/attendance$/, [{ id: 'a1', confirmationStatus: 'RECORDED' }, { id: 'a2', confirmationStatus: 'DISPUTED' }]],
    [/\/evaluation$/, { id: 'ev', state: 'DRAFT' }],
    [/supervisor-assignments|supervisors/, []],
  ]

  it('gives the supervisor their own work, and links only to the records the organization can open', async () => {
    stub(routes)
    renderOverview('ORGANIZATION_SUPERVISOR')

    expect(await screen.findByText('1 disputed attendance record to resolve')).toBeInTheDocument()
    expect(screen.getByText('1 attendance record to confirm')).toBeInTheDocument()
    expect(screen.getByText('1 evaluation to finish')).toBeInTheDocument()

    const tracker = await screen.findByRole('list', { name: 'Internship progress' })
    const links = [...tracker.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(links).toEqual(['/organization/placements/plc-1/attendance', '/organization/placements/plc-1/evaluation'])
    // Staff wording: the evaluation's own state, not "your supervisor".
    expect(within(tracker).getByText('Draft in progress')).toBeInTheDocument()
    // Supervisors supervise; they do not run the lifecycle or assign themselves.
    expect(screen.queryByText(/has no organization supervisor/)).not.toBeInTheDocument()
  })

  it('tells an admin about the missing supervisor, and shows supervision as the supervisor’s queue', async () => {
    stub(routes)
    renderOverview('ORGANIZATION_ADMIN')

    expect(await screen.findByText('1 intern has no organization supervisor')).toBeInTheDocument()
    const confirm = screen.getByText('1 attendance record to confirm').closest('li')!
    // Information for the admin (outline action), not their own command.
    expect(within(confirm).getByRole('link', { name: 'Confirm' }).className).toMatch(/border/)
  })
})
