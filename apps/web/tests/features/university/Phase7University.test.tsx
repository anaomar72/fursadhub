import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import { VerificationQueuePage } from '../../../src/features/university/pages/VerificationQueuePage'
import { VerificationCaseDetailPage } from '../../../src/features/university/pages/VerificationCaseDetailPage'
import { UniversityNominationsPage } from '../../../src/features/recruitment/pages/UniversityNominationsPage'
import { NominateStudentsPage } from '../../../src/features/recruitment/pages/NominateStudentsPage'
import { UniversityPlacementsPage } from '../../../src/features/placements/pages/UniversityPlacementsPage'
import { UniversityPlacementOverview } from '../../../src/features/placements/pages/UniversityPlacementOverview'
import { WeeklyLogsPage } from '../../../src/features/weekly-logs/pages/WeeklyLogsPage'
import { FinalReportPage } from '../../../src/features/final-reports/pages/FinalReportPage'
import { DefensePage } from '../../../src/features/defense/pages/DefensePage'
import { buildUniversityNav } from '../../../src/features/university/components/universityNavigation'
import {
  coordinationAttention,
  nominationDeadlinePassed,
  requestNeedsNominees,
  supervisionAttention,
} from '../../../src/features/university/universityAttention'
import i18n from '../../../src/lib/i18n'
import type { MyMembershipResponse, UniversityRole } from '../../../src/features/university/types'

/** Phase 7: the University portal's coordination and academic-supervision workflows. */

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
      if (method !== 'GET') return jsonResponse({})
      const hit = routes.find(([pattern]) => pattern.test(url))
      return jsonResponse(hit ? hit[1] : [])
    }),
  )
}

const posted = (fragment: string) => calls.some((call) => call.method === 'POST' && call.url.includes(fragment))

function membership(role: UniversityRole = 'UNIVERSITY_ADMIN', departmentIds = ['dep-1']): MyMembershipResponse {
  return { universityId: 'uni-1', role, departmentIds }
}

function renderAt(path: string, route: string, element: ReactElement, role: UniversityRole = 'UNIVERSITY_ADMIN') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <UniversityMembershipContext.Provider value={membership(role)}>
          <Routes>
            <Route path={route} element={element} />
          </Routes>
        </UniversityMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

const DEPARTMENTS = [{ id: 'dep-1', universityId: 'uni-1', name: 'Computer Science', code: 'CS' }]

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

describe('attention rules', () => {
  const request = {
    targetId: 't', opportunityId: 'o', opportunityTitle: 'X', organizationName: 'Y', mode: 'HYBRID',
    requestedNominees: 2, liveNominationCount: 0, nominationDeadline: '2026-10-08', targetStatus: 'REQUESTED',
    eligibleDepartmentIds: [], startDate: '2027-01-01', endDate: '2027-03-01',
  }

  it('treats the nomination deadline as inclusive, exactly as NominationService does', () => {
    expect(nominationDeadlinePassed(request, '2026-10-08')).toBe(false)
    expect(nominationDeadlinePassed(request, '2026-10-09')).toBe(true)
  })

  it('counts a request as work only while it is open, before its deadline and short of nominees', () => {
    expect(requestNeedsNominees(request, '2026-10-01')).toBe(true)
    expect(requestNeedsNominees({ ...request, liveNominationCount: 2 }, '2026-10-01')).toBe(false)
    expect(requestNeedsNominees({ ...request, targetStatus: 'COMPLETED' }, '2026-10-01')).toBe(false)
    expect(requestNeedsNominees(request, '2026-10-09')).toBe(false)
  })

  it('never turns a list that has not loaded into "nothing to do" for another category', () => {
    const items = coordinationAttention({
      cases: [{ status: 'SUBMITTED' }, { status: 'NEEDS_MORE_EVIDENCE' }] as never,
      placements: undefined,
      requests: undefined,
      nominations: [{ status: 'ACCEPTED' }] as never,
    })
    expect(items).toEqual([{ kind: 'casesToReview', count: 1 }])
  })

  it('gives a supervisor only the academic records they review', () => {
    const items = supervisionAttention({
      logs: [[{ state: 'SUBMITTED' }, { state: 'REVIEWED' }] as never, undefined],
      reports: [{ state: 'SUBMITTED' } as never, null, undefined],
    })
    expect(items).toEqual([
      { kind: 'logsToReview', count: 1 },
      { kind: 'reportsToReview', count: 1 },
    ])
  })
})

describe('navigation', () => {
  const labels = (role: UniversityRole, departmentIds = ['dep-1']) =>
    buildUniversityNav(i18n.t, membership(role, departmentIds)).map((section) => section.label)

  it('groups the admin menu by the academic workflow, in a fixed order', () => {
    expect(labels('UNIVERSITY_ADMIN')).toEqual([undefined, 'Students', 'Nominations', 'Internships', 'University', 'Account'])
  })

  it('omits groups a role has nothing in, rather than showing them empty', () => {
    expect(labels('UNIVERSITY_SUPERVISOR')).toEqual([undefined, 'Students', 'Internships', 'Account'])
    // A coordinator without departments has no scope at all (requireDepartmentScope).
    expect(labels('DEPARTMENT_COORDINATOR', [])).not.toContain('Nominations')
  })
})

describe('verification queue', () => {
  const cases = [
    { id: 'c-verified', status: 'VERIFIED', studentFullName: 'Done Student', submittedAt: '2026-08-01T00:00:00Z', hasEvidence: true },
    { id: 'c-late', status: 'UNDER_REVIEW', studentFullName: 'Later Student', submittedAt: '2026-09-05T00:00:00Z', hasEvidence: true },
    { id: 'c-early', status: 'SUBMITTED', studentFullName: 'Early Student', submittedAt: '2026-09-01T00:00:00Z', hasEvidence: false },
  ]

  it('opens on "Needs review": both reviewable states, oldest submission first', async () => {
    stub([[/verification-cases/, cases], [/departments/, DEPARTMENTS]])
    renderAt('/university/verification-cases', '/university/verification-cases', <VerificationQueuePage />)

    await screen.findByText('Early Student')
    const names = screen.getAllByRole('link').map((link) => link.textContent)
    expect(names[0]).toContain('Early Student')
    expect(names[1]).toContain('Later Student')
    expect(screen.queryByText('Done Student')).not.toBeInTheDocument()
    expect(screen.getByText('No evidence')).toBeInTheDocument()
  })

  it('sends a single status to the server when one is chosen', async () => {
    stub([[/verification-cases/, []], [/departments/, DEPARTMENTS]])
    renderAt('/university/verification-cases?status=REJECTED', '/university/verification-cases', <VerificationQueuePage />)

    expect(await screen.findByText('No verification cases found.')).toBeInTheDocument()
    await waitFor(() => expect(calls.some((call) => call.url.includes('verification-cases?status=REJECTED'))).toBe(true))
  })
})

describe('verification decisions', () => {
  const record = {
    id: 'case-1', enrollmentId: 'e', status: 'UNDER_REVIEW', reviewNotes: null, submittedAt: '2026-09-01T00:00:00Z', reviewedAt: null,
    studentEmail: 'hodan@example.test', studentFullName: 'Hodan Ali', universityId: 'uni-1', departmentId: 'dep-1',
    studentNumber: 'JU-1', program: 'IT', academicYear: '2026', hasEvidence: false, escalatedAt: null, escalationReason: null,
  }

  it('confirms a rejection before sending it, and keeps the claim and decision side by side', async () => {
    stub([[/verification-cases\/case-1$/, record], [/departments$/, DEPARTMENTS]])
    renderAt('/university/verification-cases/case-1', '/university/verification-cases/:caseId', <VerificationCaseDetailPage />)

    // The claim shows the department by name.
    expect(await screen.findByText('Computer Science')).toBeInTheDocument()
    const decision = screen.getByRole('complementary', { name: 'Your decision' })
    await userEvent.type(within(decision).getByLabelText(/^Notes/), 'Number does not match our records')
    await userEvent.click(within(decision).getByRole('button', { name: 'Reject' }))

    const dialog = await screen.findByRole('dialog', { name: 'Reject this enrollment?' })
    expect(posted('/reject')).toBe(false)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }))
    await waitFor(() => expect(posted('/verification-cases/case-1/reject')).toBe(true))
  })

  it('offers revocation only to an admin on a verified case, and confirms it first', async () => {
    stub([[/verification-cases\/case-1$/, { ...record, status: 'VERIFIED' }], [/departments$/, DEPARTMENTS]])
    renderAt('/university/verification-cases/case-1', '/university/verification-cases/:caseId', <VerificationCaseDetailPage />)

    await userEvent.type(await screen.findByLabelText('Reason for revocation'), 'Enrollment withdrawn')
    await userEvent.click(screen.getByRole('button', { name: 'Revoke verification' }))
    expect(await screen.findByRole('dialog', { name: 'Revoke this verification?' })).toBeInTheDocument()
    expect(posted('/revoke')).toBe(false)
  })
})

describe('nominations', () => {
  const nominations = [
    { id: 'n-pending', opportunityId: 'o', opportunityTitle: 'Data Intern', organizationName: 'Hormuud', studentUserId: 's1', studentEmail: null, studentFullName: 'Amina Yusuf', departmentId: 'dep-1', status: 'PENDING_STUDENT_CONSENT', note: null, createdAt: '2026-09-01T00:00:00Z', respondedAt: null },
    { id: 'n-accepted', opportunityId: 'o', opportunityTitle: 'Data Intern', organizationName: 'Hormuud', studentUserId: 's2', studentEmail: null, studentFullName: 'Bashir Ali', departmentId: 'dep-1', status: 'ACCEPTED', note: null, createdAt: '2026-08-01T00:00:00Z', respondedAt: '2026-08-03T00:00:00Z' },
  ]

  it('says whose move it is, and withdraws only a pending nomination after confirmation', async () => {
    stub([[/nominations/, nominations], [/departments/, DEPARTMENTS]])
    renderAt('/university/nominations', '/university/nominations', <UniversityNominationsPage />)

    expect(await screen.findByText('Waiting for the student to agree to be considered.')).toBeInTheDocument()
    // ACCEPTED means "agreed to be considered" — not an offer.
    expect(screen.getByText('The student agreed and is now a candidate with the organization.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Withdraw the nomination of/ })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw the nomination of Amina Yusuf' }))
    const dialog = await screen.findByRole('dialog', { name: 'Withdraw this nomination?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep nomination' }))
    expect(posted('/withdraw')).toBe(false)
  })

  it('filters by the status in the URL, so the dashboard can link straight to it', async () => {
    stub([[/nominations/, nominations], [/departments/, DEPARTMENTS]])
    renderAt('/university/nominations?status=ACCEPTED', '/university/nominations', <UniversityNominationsPage />)

    expect(await screen.findByText('Bashir Ali')).toBeInTheDocument()
    expect(screen.queryByText('Amina Yusuf')).not.toBeInTheDocument()
  })

  it('closes nomination past the deadline instead of offering buttons that can only fail', async () => {
    const request = {
      targetId: 'tgt-1', opportunityId: 'opp-1', opportunityTitle: 'Data Intern', organizationName: 'Hormuud', mode: 'UNIVERSITY_TARGETED',
      requestedNominees: 2, liveNominationCount: 0, nominationDeadline: '2020-01-01', targetStatus: 'REQUESTED',
      eligibleDepartmentIds: ['dep-1'], startDate: '2027-01-01', endDate: '2027-03-01',
    }
    stub([
      [/eligible-students/, [{ studentUserId: 's1', email: null, fullName: 'Amina Yusuf', departmentId: 'dep-1', studentNumber: 'JU-1', program: 'IT', academicYear: '2026', alreadyNominated: false }]],
      [/opportunity-requests$/, [request]],
      [/departments/, DEPARTMENTS],
    ])
    renderAt('/university/opportunity-requests/tgt-1', '/university/opportunity-requests/:targetId', <NominateStudentsPage />)

    expect(await screen.findByText('Nominations are closed for this request')).toBeInTheDocument()
    await screen.findByText('Amina Yusuf')
    expect(screen.queryByRole('button', { name: /Nominate/ })).not.toBeInTheDocument()
    // What a nomination means is said plainly — consent first, no automation.
    expect(screen.getByText(/The student is asked whether they want to be considered/)).toBeInTheDocument()
  })
})

const PLACEMENT = {
  id: 'plc-1', candidacyId: 'c', opportunityId: 'o', opportunityTitle: 'Backend Intern', organizationId: 'org-1', organizationName: 'CloudWorks',
  universityId: 'uni-1', universityName: 'Jamhuriya', departmentId: 'dep-1', departmentName: 'Computer Science', studentUserId: 's1',
  studentFullName: 'Amina Yusuf', studentEmail: null, startDate: '2026-09-01', endDate: '2026-12-01', location: null, status: 'ACTIVE',
  startedAt: '2026-09-01T08:00:00Z', completionRequestedAt: null, completedAt: null, cancelledAt: null, terminatedAt: null,
  cancellationReason: null, terminationReason: null, universitySupervisor: null, organizationSupervisor: null,
  createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z',
}

describe('placements list', () => {
  it('filters to internships without an academic supervisor from the URL', async () => {
    stub([[/placements/, [PLACEMENT, { ...PLACEMENT, id: 'plc-2', studentFullName: 'Bashir Ali', universitySupervisor: { supervisorUserId: 'u', supervisorEmail: 'sup@x.test', supervisorDisplayName: 'Dr Faisal' } }]]])
    renderAt('/university/placements?supervisor=unassigned', '/university/placements', <UniversityPlacementsPage />)

    expect(await screen.findAllByText('Amina Yusuf')).not.toHaveLength(0)
    expect(screen.queryByText('Bashir Ali')).not.toBeInTheDocument()
    expect(screen.getAllByText('No academic supervisor').length).toBeGreaterThan(0)
  })
})

describe('university placement overview', () => {
  const routes: [RegExp, unknown][] = [
    [/\/completion$/, { canComplete: false, policySource: 'UNIVERSITY', requirements: [
      { type: 'WEEKLY_LOGS', required: true, satisfied: false, detail: '1/10', unmetCode: 'X' },
      { type: 'ORGANIZATION_EVALUATION', required: true, satisfied: false, detail: 'DRAFT', unmetCode: 'X' },
      { type: 'FINAL_REPORT', required: true, satisfied: false, detail: 'SUBMITTED', unmetCode: 'X' },
      { type: 'DEFENSE', required: true, satisfied: false, detail: 'MISSING', unmetCode: 'X' },
    ] }],
    [/\/weekly-logs$/, [{ id: 'l1', state: 'SUBMITTED', weekNumber: 2 }, { id: 'l2', state: 'REVIEWED', weekNumber: 1 }]],
    [/\/final-report$/, { id: 'r', state: 'SUBMITTED' }],
    [/\/defense-attempts$/, []],
    [/\/attendance$/, [{ id: 'a1', confirmationStatus: 'DISPUTED' }]],
  ]

  function renderOverview(role: UniversityRole) {
    return render(
      <MemoryRouter initialEntries={['/university/placements/plc-1']}>
        <AppProviders>
          <UniversityMembershipContext.Provider value={membership(role)}>
            <Routes>
              <Route path="/university/placements/:placementId" element={<Outlet context={PLACEMENT} />}>
                <Route index element={<UniversityPlacementOverview />} />
              </Route>
            </Routes>
          </UniversityMembershipContext.Provider>
        </AppProviders>
      </MemoryRouter>,
    )
  }

  it('gives a supervisor their academic review work, and the dispute only as information', async () => {
    stub(routes)
    renderOverview('UNIVERSITY_SUPERVISOR')

    expect(await screen.findByText('1 weekly log waiting for review')).toBeInTheDocument()
    expect(screen.getByText('Final report waiting for review')).toBeInTheDocument()
    expect(screen.getByText('Defense not scheduled yet')).toBeInTheDocument()
    const dispute = screen.getByText(/disputed attendance record/).closest('li') as HTMLElement
    // Information (outline action) — the host organization's supervisor settles attendance.
    expect(within(dispute).getByRole('link', { name: 'Open' }).className).toMatch(/border/)
    // Supervisors review the work but do not close the internship or assign supervisors.
    expect(screen.queryByText('No academic supervisor assigned')).not.toBeInTheDocument()
  })

  it('links every requirement to its module, in the university’s own wording', async () => {
    stub(routes)
    renderOverview('UNIVERSITY_ADMIN')

    const tracker = await screen.findByRole('list', { name: 'Internship progress' })
    const links = [...tracker.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(links).toEqual([
      '/university/placements/plc-1/weekly-logs',
      '/university/placements/plc-1/evaluation',
      '/university/placements/plc-1/final-report',
      '/university/placements/plc-1/defense',
    ])
    expect(within(tracker).getByText('Being written by the host organization')).toBeInTheDocument()
    expect(await screen.findByText('No academic supervisor assigned')).toBeInTheDocument()
  })
})

function renderModule(element: ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[`/university/placements/plc-1/${path}`]}>
      <AppProviders>
        <UniversityMembershipContext.Provider value={membership('UNIVERSITY_SUPERVISOR')}>
          <Routes>
            <Route path={`/university/placements/:placementId/${path}`} element={element} />
          </Routes>
        </UniversityMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

const log = (id: string, weekNumber: number, state: string) => ({
  id, placementId: 'plc-1', weekNumber, periodStart: '2026-09-01', periodEnd: '2026-09-07', summary: `Week ${weekNumber} summary`,
  activities: null, challenges: null, learningOutcomes: null, state, submittedAt: null, reviewedAt: null,
  reviewComment: state === 'RETURNED_FOR_CHANGES' ? 'Add the outcomes' : null, editable: false, createdAt: '', updatedAt: '',
})

describe('academic review', () => {
  it('groups the reviewer’s logs by whose turn it is, own work first', async () => {
    stub([[/weekly-logs$/, [log('a', 1, 'REVIEWED'), log('b', 3, 'SUBMITTED'), log('c', 2, 'RETURNED_FOR_CHANGES'), log('d', 4, 'DRAFT')]]])
    renderModule(<WeeklyLogsPage audience="reviewer" />, 'weekly-logs')

    const headings = (await screen.findAllByRole('heading', { level: 3 })).filter((h) => /\(\d\)/.test(h.textContent ?? ''))
    expect(headings.map((h) => h.textContent)).toEqual([
      'Waiting for your review (1)',
      'Returned to the student (1)',
      'Reviewed (1)',
      'Not submitted yet (1)',
    ])
    // The reviewer's feedback on a returned log stays visible.
    expect(screen.getByText(/Add the outcomes/)).toBeInTheDocument()
  })

  it('keeps a failed command’s error on the log it was for', async () => {
    calls = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
        if (init?.method === 'POST') return jsonResponse({ code: 'ACCESS_DENIED', message: 'x', status: 403, fieldErrors: [] }, 403)
        return jsonResponse([log('b', 3, 'SUBMITTED'), log('e', 5, 'SUBMITTED')])
      }),
    )
    renderModule(<WeeklyLogsPage audience="reviewer" />, 'weekly-logs')

    const week3 = (await screen.findByRole('heading', { name: /Week 3/ })).closest('article') as HTMLElement
    await userEvent.click(within(week3).getByRole('button', { name: 'Mark as reviewed' }))
    await waitFor(() => expect(within(week3).getByRole('alert')).toBeInTheDocument())
    const week5 = screen.getByRole('heading', { name: /Week 5/ }).closest('article') as HTMLElement
    expect(within(week5).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('confirms before approving a final report, because approval is final', async () => {
    stub([[/final-report$/, { id: 'r', placementId: 'plc-1', state: 'SUBMITTED', hasDocument: true, documentFilename: 'r.pdf', documentSizeBytes: 10, submittedAt: null, reviewedAt: null, reviewComment: null, fileEditable: false, createdAt: '', updatedAt: '' }]])
    renderModule(<FinalReportPage audience="reviewer" />, 'final-report')

    await userEvent.click(await screen.findByRole('button', { name: 'Approve report' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve this final report?' })
    expect(posted('/approve')).toBe(false)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve report' }))
    await waitFor(() => expect(posted('/final-report/approve')).toBe(true))
  })

  it('confirms before cancelling a scheduled defense', async () => {
    stub([[/defense-attempts$/, [{ id: 'att-1', placementId: 'plc-1', attemptNumber: 1, scheduledAt: '2026-12-01T09:00:00Z', locationDetails: 'Room 4', state: 'SCHEDULED', result: null, panelNotes: null, completedAt: null, cancelledAt: null, createdAt: '' }]]])
    renderModule(<DefensePage audience="university" />, 'defense')

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel this attempt' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this defense?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep it' }))
    expect(posted('/cancel')).toBe(false)
  })
})

describe('English / Somali parity', () => {
  function leaves(value: unknown, prefix = ''): string[] {
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k))
    return [prefix]
  }

  it('has every new University workspace string in Somali', () => {
    for (const [ns, path] of [
      ['university', 'workspace'],
      ['university', 'nav.sections'],
      ['recruitment', 'universityNominations'],
      ['recruitment', 'nominate'],
      ['recruitment', 'requests'],
      ['placements', 'university'],
    ] as const) {
      const en = i18n.getResourceBundle('en', ns)
      const so = i18n.getResourceBundle('so', ns)
      const pick = (bundle: Record<string, unknown>) => path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], bundle)
      const missing = leaves(pick(en)).filter((key) => leaves(pick(so)).indexOf(key) === -1)
      expect(missing, `${ns}:${path}`).toEqual([])
    }
  })
})
