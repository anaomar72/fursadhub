import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DashboardPage } from '../../../src/features/organization/pages/DashboardPage'
import { SupervisionQueuePage } from '../../../src/features/organization/pages/SupervisionQueuePage'
import { OrganizationPlacementsPage } from '../../../src/features/placements/pages/OrganizationPlacementsPage'
import { AttendancePage } from '../../../src/features/attendance/pages/AttendancePage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { OrganizationRole } from '../../../src/features/organization/types'

const ORGANIZATION_ID = 'org-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
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

const RECORDED_DAY = {
  id: 'att-1',
  placementId: 'plc-1',
  attendanceDate: '2026-03-02',
  attendanceValue: 'PRESENT',
  confirmationStatus: 'RECORDED',
  notes: null,
  disputeReason: null,
  resolutionNote: null,
  confirmedAt: null,
  disputedAt: null,
  resolvedAt: null,
  createdAt: '2026-03-02T00:00:00Z',
  updatedAt: '2026-03-02T00:00:00Z',
}

function stubApi({
  placements = [PLACEMENT] as unknown[],
  attendance = [] as unknown[],
  evaluation = null as unknown,
  onCommand,
}: {
  placements?: unknown[]
  attendance?: unknown[]
  evaluation?: unknown
  onCommand?: (url: string) => Promise<Response>
} = {}) {
  const calls: { url: string; method: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (init?.method && init.method !== 'GET') {
        return onCommand ? onCommand(url) : jsonResponse({ ...RECORDED_DAY, confirmationStatus: 'CONFIRMED' })
      }
      if (url.includes('/attendance')) return jsonResponse(attendance)
      if (url.includes('/evaluation')) return jsonResponse(evaluation)
      if (url.includes('/placements')) return jsonResponse(placements)
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

describe('supervisor dashboard', () => {
  it('renders the supervision dashboard for a supervisor, not the admin one', async () => {
    stubApi()
    renderAs('ORGANIZATION_SUPERVISOR', <DashboardPage />)

    expect(await screen.findByText('Supervision overview')).toBeInTheDocument()
    expect(screen.queryByText('Organization overview')).not.toBeInTheDocument()
    expect(screen.queryByText('Recruitment overview')).not.toBeInTheDocument()
  })

  it('never asks for anything the role cannot read', async () => {
    // requireAcademicReadAccess excludes organization staff from weekly logs, the final report and
    // the defense; CandidacyAuthorization excludes the role from candidates; the opportunity list
    // and the members list are not theirs either. Asking would render 403s as zeros.
    const calls = stubApi()
    renderAs('ORGANIZATION_SUPERVISOR', <DashboardPage />)
    await screen.findByText('Supervision overview')

    expect(calls.some((call) => call.url.includes('/weekly-logs'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/final-report'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/defense'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/candidacies'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/opportunities'))).toBe(false)
    expect(calls.some((call) => call.url.includes('/members'))).toBe(false)
  })

  it('reads only the two workplace records the role may act on', async () => {
    const calls = stubApi({ attendance: [RECORDED_DAY] })
    renderAs('ORGANIZATION_SUPERVISOR', <DashboardPage />)
    await screen.findByText('Supervision overview')

    await waitFor(() => {
      expect(calls.some((call) => call.url.includes('plc-1/attendance'))).toBe(true)
    })
    expect(calls.some((call) => call.url.includes('plc-1/evaluation'))).toBe(true)
  })

  it('counts the supervisor queues from real records', async () => {
    stubApi({ attendance: [RECORDED_DAY, { ...RECORDED_DAY, id: 'att-2', confirmationStatus: 'CONFIRMED' }] })
    renderAs('ORGANIZATION_SUPERVISOR', <DashboardPage />)

    expect((await screen.findByText('Assigned interns')).closest('div')?.parentElement).toHaveTextContent('1')
    // One RECORDED day is unsettled; the CONFIRMED one is done.
    await waitFor(() => {
      expect(screen.getAllByText('Attendance to settle')[0].closest('div')?.parentElement).toHaveTextContent('1')
    })
    // No evaluation row at all counts as outstanding — nobody has started writing it.
    expect(screen.getAllByText('Evaluations to finish')[0].closest('div')?.parentElement).toHaveTextContent('1')
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderAs('ORGANIZATION_SUPERVISOR', <DashboardPage />)

    expect(await screen.findByText('Guudmarka kormeerka')).toBeInTheDocument()
    expect(screen.queryByText('Supervision overview')).not.toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})

describe('supervision queue', () => {
  it('offers exactly the two sections this role may act on', async () => {
    stubApi()
    renderAs('ORGANIZATION_SUPERVISOR', <SupervisionQueuePage />)

    const tablist = await screen.findByRole('tablist')
    const tabs = within(tablist).getAllByRole('tab').map((tab) => tab.textContent)

    expect(tabs).toEqual(['Attendance', 'Evaluations'])
    // Weekly logs, the final report and the defense are university-only academic records.
    expect(tabs).not.toContain('Weekly logs')
    expect(tabs).not.toContain('Final reports')
  })

  it('lists attendance still waiting on the supervisor', async () => {
    stubApi({ attendance: [RECORDED_DAY] })
    renderAs('ORGANIZATION_SUPERVISOR', <SupervisionQueuePage />)

    expect(await screen.findByText('1 day still to confirm')).toBeInTheDocument()
    expect(screen.getByText('Amina Yusuf')).toBeInTheDocument()
  })

  it('opens the evaluations section straight from a URL', async () => {
    stubApi()
    renderAs('ORGANIZATION_SUPERVISOR', <SupervisionQueuePage />, '/organization/supervision?section=evaluation')

    const tablist = await screen.findByRole('tablist')
    expect(within(tablist).getByRole('tab', { name: 'Evaluations' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Evaluation not started')).toBeInTheDocument()
  })

  it('only queries placements that are actually running', async () => {
    const calls = stubApi({ placements: [{ ...PLACEMENT, id: 'plc-planned', status: 'PLANNED' }] })
    renderAs('ORGANIZATION_SUPERVISOR', <SupervisionQueuePage />)

    expect(await screen.findByText('Nothing to do right now')).toBeInTheDocument()
    expect(calls.some((call) => call.url.includes('plc-planned/attendance'))).toBe(false)
  })

  it('reports a placement it could not read instead of hiding the failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
        if (url.includes('/attendance')) {
          return jsonResponse({ code: 'ACCESS_DENIED', message: 'x', status: 403 }, 403)
        }
        if (url.includes('/placements')) return jsonResponse([PLACEMENT])
        return jsonResponse({})
      }),
    )
    renderAs('ORGANIZATION_SUPERVISOR', <SupervisionQueuePage />)

    // A 403 on one placement must not silently shrink the queue into a false "all clear".
    expect(
      await screen.findByText('Some internships could not be read and are not shown here.'),
    ).toBeInTheDocument()
  })
})

describe('supervisor intern list', () => {
  it('replaces the supervisor column with the records the supervisor owns', async () => {
    stubApi({ attendance: [RECORDED_DAY] })
    renderAs('ORGANIZATION_SUPERVISOR', <OrganizationPlacementsPage />)

    await screen.findByText('Amina Yusuf')
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)

    // Telling a supervisor who the supervisor is would be telling them their own name.
    expect(headers).not.toContain('Supervisor')
    expect(headers).toContain('Attendance')
    expect(headers).toContain('Evaluation')
  })

  it('keeps the supervisor column for an admin, who genuinely needs it', async () => {
    stubApi()
    renderAs('ORGANIZATION_ADMIN', <OrganizationPlacementsPage />)

    await screen.findByText('Amina Yusuf')
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)

    expect(headers).toContain('Supervisor')
    expect(headers).not.toContain('Evaluation')
  })

  it('does not fan out per-placement records for a non-supervisor', async () => {
    const calls = stubApi()
    renderAs('ORGANIZATION_ADMIN', <OrganizationPlacementsPage />)
    await screen.findByText('Amina Yusuf')

    expect(calls.some((call) => call.url.includes('plc-1/attendance'))).toBe(false)
  })
})

describe('attendance actions', () => {
  function renderAttendance() {
    return renderAs(
      'ORGANIZATION_SUPERVISOR',
      <Routes>
        <Route path="/organization/placements/:placementId/attendance" element={<AttendancePage audience="supervisor" />} />
      </Routes>,
      '/organization/placements/plc-1/attendance',
    )
  }

  it('calls the real confirm endpoint', async () => {
    const calls = stubApi({ attendance: [RECORDED_DAY] })
    renderAttendance()

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(calls.some((call) => call.method === 'POST' && call.url.endsWith('/attendance/att-1/confirm'))).toBe(true)
    })
  })

  it('leaves the record unsettled when the API refuses', async () => {
    // Never show a record as settled before the backend says it is.
    stubApi({
      attendance: [RECORDED_DAY],
      onCommand: () =>
        jsonResponse(
          {
            code: 'PLACEMENT_NOT_ACTIVE',
            message: 'raw backend text',
            status: 409,
            path: '/api/v1/attendance/att-1/confirm',
            timestamp: '2026-03-02T00:00:00Z',
            fieldErrors: [],
          },
          409,
        ),
    })
    renderAttendance()

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    // Still awaiting confirmation, and the button is still offered.
    expect(screen.getByText('Awaiting confirmation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })
})
