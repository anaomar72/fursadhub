import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { MyApplicationsPage } from '../../../src/features/recruitment/pages/MyApplicationsPage'
import { MyNominationsPage } from '../../../src/features/recruitment/pages/MyNominationsPage'
import { StudentPlacementDetailPage } from '../../../src/features/placements/pages/StudentPlacementDetailPage'
import i18n from '../../../src/lib/i18n'

/** Phase 5: applications, nominations and the internship hub read as guidance, not records. */

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let requested: string[] = []

function stub(routes: Record<string, unknown>) {
  requested = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      requested.push(url)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      const match = Object.keys(routes).find((fragment) => url.includes(fragment))
      if (match) {
        const body = routes[match]
        return typeof body === 'number'
          ? jsonResponse({ code: 'X', message: '', status: body, path: '', timestamp: '', fieldErrors: [] }, body)
          : jsonResponse(body)
      }
      return jsonResponse({})
    }),
  )
}

const render$ = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <AppProviders>{ui}</AppProviders>
    </MemoryRouter>,
  )

describe('MyApplicationsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('says what each status means, and gives a live offer its deadline and one action', async () => {
    stub({
      '/students/me/candidacies': [
        { id: 'c1', opportunityId: 'o1', opportunityTitle: 'Data Intern', source: 'SELF_APPLICATION', status: 'SHORTLISTED', createdAt: '2026-08-01T00:00:00Z', liveOffer: null },
        { id: 'c2', opportunityId: 'o2', opportunityTitle: 'Web Intern', source: 'UNIVERSITY_NOMINATION', status: 'OFFERED', createdAt: '2026-08-02T00:00:00Z', liveOffer: { id: 'of', status: 'PENDING', responseDeadline: '2026-11-20' } },
      ],
    })
    render$(<MyApplicationsPage />)

    const shortlisted = (await screen.findByRole('link', { name: 'Data Intern' })).closest('li')!
    expect(within(shortlisted).getByText("You're on the shortlist.")).toBeInTheDocument()

    const offered = screen.getByRole('link', { name: 'Web Intern' }).closest('li')!
    expect(within(offered).getByText(/offer awaiting your response/i)).toBeInTheDocument()
    expect(within(offered).getByRole('link', { name: 'Review offer' })).toHaveAttribute('href', '/student/applications/c2')
    expect(within(offered).getByText('University nomination')).toBeInTheDocument()
  })
})

describe('MyNominationsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('gives a pending nomination everything needed to decide, and explains each answered one', async () => {
    stub({
      '/students/me/nominations': [
        { id: 'n1', opportunityId: 'o1', opportunityTitle: 'Network Intern', organizationName: 'Hormuud', status: 'PENDING_STUDENT_CONSENT', note: 'You fit their brief.', createdAt: '2026-08-01T00:00:00Z', respondedAt: null },
        { id: 'n2', opportunityId: 'o2', opportunityTitle: 'Old Role', organizationName: 'Org', status: 'WITHDRAWN', note: null, createdAt: '2026-07-01T00:00:00Z', respondedAt: null },
      ],
    })
    render$(<MyNominationsPage />)

    const pending = (await screen.findByRole('heading', { name: 'Network Intern' })).closest('li')!
    expect(within(pending).getByText('Nominated by your university')).toBeInTheDocument()
    expect(within(pending).getByText('You fit their brief.')).toBeInTheDocument()
    expect(within(pending).getByRole('button', { name: 'Accept nomination' })).toBeInTheDocument()
    expect(within(pending).getByRole('button', { name: 'Decline' })).toBeInTheDocument()

    expect(screen.getByText('Your university withdrew this nomination.')).toBeInTheDocument()
  })

  it('shares the student cache keys, so it never re-fetches what the dashboard already has under another name', async () => {
    stub({ '/students/me/nominations': [] })
    render$(<MyNominationsPage />)
    expect(await screen.findByText('You have no nominations yet.')).toBeInTheDocument()
    expect(screen.getByText(/You do not need one to apply directly/)).toBeInTheDocument()
  })
})

describe('StudentPlacementDetailPage (internship hub)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  const placement = {
    id: 'plc-1',
    status: 'ACTIVE',
    opportunityTitle: 'Backend Intern',
    organizationName: 'CloudWorks',
    universityName: 'Jamhuriya',
    departmentName: 'IT',
    startDate: '2026-09-01',
    endDate: '2026-12-01',
    startedAt: '2026-09-01T08:00:00Z',
    location: null,
    universitySupervisor: null,
    organizationSupervisor: { supervisorEmail: 'sup@cloud.test' },
  }

  function renderHub() {
    return render(
      <MemoryRouter initialEntries={['/student/placements/plc-1']}>
        <AppProviders>
          <Routes>
            <Route path="/student/placements/:placementId" element={<Outlet context={placement} />}>
              <Route index element={<StudentPlacementDetailPage />} />
            </Route>
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )
  }

  it('orients the student: attention, the lifecycle with links into each module, and who is involved', async () => {
    stub({
      '/completion': {
        canComplete: false,
        policySource: 'UNIVERSITY',
        requirements: [
          { type: 'WEEKLY_LOGS', required: true, satisfied: false, detail: '2/10', unmetCode: 'X' },
          { type: 'ATTENDANCE', required: false, satisfied: false, detail: null, unmetCode: 'X' },
          { type: 'DEFENSE', required: true, satisfied: false, detail: 'MISSING', unmetCode: 'X' },
        ],
      },
      '/weekly-logs': [{ id: 'w4', weekNumber: 4, state: 'RETURNED_FOR_CHANGES' }],
      '/defense': [{ id: 'd1', attemptNumber: 1, state: 'SCHEDULED', scheduledAt: '2026-11-30T09:00:00Z', locationDetails: 'Room 4', result: null }],
      '/evaluation': 404,
    })
    renderHub()

    expect(await screen.findByText('Week 4 log was returned for changes')).toBeInTheDocument()
    expect(await screen.findByText('Your defense is scheduled')).toBeInTheDocument()

    const tracker = screen.getByRole('list', { name: 'Internship progress' })
    expect(within(tracker).getByRole('link', { name: /Open\s+Weekly logs/ })).toHaveAttribute('href', '/student/placements/plc-1/weekly-logs')
    expect(within(tracker).queryByText('Attendance')).not.toBeInTheDocument()

    expect(screen.getByText('sup@cloud.test')).toBeInTheDocument()
    // A refused evaluation read means "not final yet" — never an error.
    expect(await screen.findByText('The organization has not shared an evaluation yet.')).toBeInTheDocument()
    // Attendance is not required here, so its list is never requested.
    expect(requested.some((url) => url.includes('/attendance'))).toBe(false)
  })
})
