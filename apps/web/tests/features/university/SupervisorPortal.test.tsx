import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import { DashboardPage } from '../../../src/features/university/pages/DashboardPage'
import { SupervisedStudentsPage } from '../../../src/features/university/pages/SupervisedStudentsPage'
import { SupervisionQueuePage } from '../../../src/features/university/pages/SupervisionQueuePage'
import i18n from '../../../src/lib/i18n'
import type { UniversityRole } from '../../../src/features/university/types'

const UNIVERSITY_ID = 'univ-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

const PLACEMENT = {
  id: 'plc-1',
  candidacyId: 'cnd-1',
  opportunityId: 'opp-1',
  opportunityTitle: 'Frontend Intern',
  organizationId: 'org-1',
  organizationName: 'TechSolutions',
  universityId: UNIVERSITY_ID,
  universityName: 'Jamhuriya',
  departmentId: 'dept-1',
  departmentName: 'Computer Science',
  studentUserId: 'stu-1',
  studentFullName: 'Amina Yusuf',
  studentEmail: 'amina@example.test',
  startDate: '2026-02-01',
  endDate: '2026-05-01',
  location: null,
  status: 'ACTIVE',
  startedAt: '2026-02-01T00:00:00Z',
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

const SUBMITTED_LOG = {
  id: 'log-2',
  placementId: 'plc-1',
  weekNumber: 2,
  periodStart: '2026-02-08',
  periodEnd: '2026-02-14',
  summary: 'Built the settings screen',
  activities: null,
  challenges: null,
  learningOutcomes: null,
  state: 'SUBMITTED',
  submittedAt: '2026-02-15T00:00:00Z',
  reviewedAt: null,
  reviewComment: null,
  editable: false,
  createdAt: '2026-02-08T00:00:00Z',
  updatedAt: '2026-02-15T00:00:00Z',
}

const DISPUTED_ATTENDANCE = {
  id: 'att-1',
  placementId: 'plc-1',
  attendanceDate: '2026-02-10',
  attendanceValue: 'ABSENT',
  confirmationStatus: 'DISPUTED',
  notes: null,
  disputeReason: 'I was at the client site.',
  resolutionNote: null,
  confirmedAt: null,
  disputedAt: '2026-02-11T00:00:00Z',
  resolvedAt: null,
  createdAt: '2026-02-10T00:00:00Z',
  updatedAt: '2026-02-11T00:00:00Z',
}

interface Stub {
  placements?: unknown[]
  weeklyLogs?: unknown[]
  finalReport?: unknown
  attendance?: unknown[]
  /** Endpoints the caller's role is not allowed to reach, answered the way the API would. */
  forbid?: string[]
}

function stubApi({ placements = [PLACEMENT], weeklyLogs = [], finalReport = null, attendance = [], forbid = [] }: Stub = {}) {
  const calls: string[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (forbid.some((fragment) => url.includes(fragment))) {
        return jsonResponse({ code: 'ACCESS_DENIED', message: 'nope', status: 403 }, 403)
      }
      // Most specific first: the per-placement record routes all sit under /placements/{id}/…
      if (url.includes('/weekly-logs')) return jsonResponse(weeklyLogs)
      if (url.includes('/final-report')) return jsonResponse(finalReport)
      if (url.includes('/attendance')) return jsonResponse(attendance)
      if (url.includes('/placements')) return jsonResponse(placements)
      // The admin/coordinator-only endpoints, so the admin comparison case has something to render.
      if (
        url.includes('/students') ||
        url.includes('/departments') ||
        url.includes('/verification-cases') ||
        url.includes('/opportunity-requests') ||
        url.includes('/nominations')
      ) {
        return jsonResponse([])
      }
      return jsonResponse({})
    }),
  )
  return calls
}

function renderAs(role: UniversityRole, ui: ReactElement, departmentIds: string[] = []) {
  return render(
    <MemoryRouter>
      <AppProviders>
        <UniversityMembershipContext.Provider value={{ universityId: UNIVERSITY_ID, role, departmentIds }}>
          {ui}
        </UniversityMembershipContext.Provider>
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

describe('university supervisor dashboard', () => {
  it('renders the supervision dashboard for a supervisor, not the admin one', async () => {
    stubApi()
    renderAs('UNIVERSITY_SUPERVISOR', <DashboardPage />)

    expect(await screen.findByText('Supervision overview')).toBeInTheDocument()
    expect(screen.queryByText('University overview')).not.toBeInTheDocument()
    // Institution-wide framing has no place on a placement-scoped dashboard.
    expect(screen.queryByText('Total students')).not.toBeInTheDocument()
    expect(screen.queryByText('Partner organizations')).not.toBeInTheDocument()
  })

  it('never calls an endpoint the supervisor role is refused', async () => {
    // VerificationQueryService and NominationQueryService both require UNIVERSITY_ADMIN or
    // DEPARTMENT_COORDINATOR. Asking anyway would turn four 403s into four zeros on screen.
    const calls = stubApi()
    renderAs('UNIVERSITY_SUPERVISOR', <DashboardPage />)
    await screen.findByText('Supervision overview')

    expect(calls.some((url) => url.includes('/verification-cases'))).toBe(false)
    expect(calls.some((url) => url.includes('/nominations'))).toBe(false)
    expect(calls.some((url) => url.includes('/opportunity-requests'))).toBe(false)
    expect(calls.some((url) => url.includes(`/universities/${UNIVERSITY_ID}/students`))).toBe(false)
  })

  it('counts pending reviews from the real per-placement records', async () => {
    stubApi({ weeklyLogs: [SUBMITTED_LOG, { ...SUBMITTED_LOG, id: 'log-3', weekNumber: 3, state: 'REVIEWED' }] })
    renderAs('UNIVERSITY_SUPERVISOR', <DashboardPage />)

    const tile = (await screen.findByText('Logs awaiting review')).closest('div')?.parentElement
    // One SUBMITTED log; the REVIEWED one is finished and must not be counted.
    expect(tile).toHaveTextContent('1')
    expect((await screen.findByText('Assigned students')).closest('div')?.parentElement).toHaveTextContent('1')
  })

  it('keeps the admin dashboard for an admin', async () => {
    stubApi()
    renderAs('UNIVERSITY_ADMIN', <DashboardPage />)

    expect(await screen.findByText('University overview')).toBeInTheDocument()
    expect(screen.queryByText('Supervision overview')).not.toBeInTheDocument()
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderAs('UNIVERSITY_SUPERVISOR', <DashboardPage />)

    expect(await screen.findByText('Guudmarka kormeerka')).toBeInTheDocument()
    expect(screen.queryByText('Supervision overview')).not.toBeInTheDocument()
  })
})

describe('supervised students page', () => {
  it('builds the roster from the scoped placement list without calling the directory', async () => {
    const calls = stubApi({
      placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', studentUserId: 'stu-2', studentFullName: 'Bashir Ali' }],
    })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisedStudentsPage />)

    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.getByText('Bashir Ali')).toBeInTheDocument()
    expect(screen.getByText('2 students')).toBeInTheDocument()
    // The university student directory is not this role's to read.
    expect(calls.some((url) => url.includes(`/universities/${UNIVERSITY_ID}/students`))).toBe(false)
  })

  it('shows placement facts, never enrollment facts the role cannot read', async () => {
    stubApi()
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisedStudentsPage />)
    await screen.findByText('Amina Yusuf')

    expect(screen.getByText('Computer Science')).toBeInTheDocument()
    expect(screen.getByText('TechSolutions')).toBeInTheDocument()
    // Student number, program and verification status come from the enrollment record, which is
    // only readable by admins and coordinators — so those columns do not exist here.
    expect(screen.queryByText('Student number')).not.toBeInTheDocument()
    expect(screen.queryByText('Program')).not.toBeInTheDocument()
  })

  it('links the student name instead of adding an off-screen action column', async () => {
    // The roster table scrolls horizontally on a phone. An absolutely-positioned `sr-only` header
    // inside that scroll container is laid out against the page, not the container, so it escapes
    // the clip and drags the document wider than the viewport — a real horizontal overflow found
    // at 390px. The name carries the affordance instead, which also drops a column on mobile.
    stubApi()
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisedStudentsPage />)

    const link = await screen.findByRole('link', { name: 'Amina Yusuf' })
    expect(link).toHaveAttribute('href', '/university/placements/plc-1')

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5)
    // The table's own <caption> is sr-only and sits at the table's left edge, so it clips fine.
    // A column HEADER cannot be: it is laid out at the far right of a 1000px-wide scrolled table.
    expect(table.querySelector('thead .sr-only')).toBeNull()
  })

  it('narrows the rows that arrived rather than pretending to search the server', async () => {
    stubApi({
      placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', studentUserId: 'stu-2', studentFullName: 'Bashir Ali' }],
    })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisedStudentsPage />)
    await screen.findByText('Amina Yusuf')

    await userEvent.type(screen.getByLabelText('Search students'), 'bashir')

    expect(screen.queryByText('Amina Yusuf')).not.toBeInTheDocument()
    expect(screen.getByText('Bashir Ali')).toBeInTheDocument()
  })

  it('invites the supervisor rather than dead-ending when nothing is assigned', async () => {
    stubApi({ placements: [] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisedStudentsPage />)

    expect(await screen.findByText('No students assigned to you yet.')).toBeInTheDocument()
  })
})

describe('supervision review queue', () => {
  it('lists logs awaiting review across the placements in scope', async () => {
    stubApi({ weeklyLogs: [SUBMITTED_LOG] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisionQueuePage />)

    expect(await screen.findByText('1 weekly log awaiting your review')).toBeInTheDocument()
    expect(screen.getByText('Amina Yusuf')).toBeInTheDocument()
  })

  it('says so plainly when nothing is waiting', async () => {
    stubApi({ weeklyLogs: [{ ...SUBMITTED_LOG, state: 'REVIEWED' }] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisionQueuePage />)

    expect(await screen.findByText('No weekly logs are waiting')).toBeInTheDocument()
  })

  it('only queries placements that are actually running', async () => {
    const calls = stubApi({ placements: [{ ...PLACEMENT, id: 'plc-planned', status: 'PLANNED' }] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisionQueuePage />)

    expect(await screen.findByText('Nothing to review right now')).toBeInTheDocument()
    expect(calls.some((url) => url.includes('plc-planned/weekly-logs'))).toBe(false)
  })

  it('offers attendance as read-only, since settling it belongs to the host organization', async () => {
    stubApi({ attendance: [DISPUTED_ATTENDANCE] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisionQueuePage />)
    await screen.findByRole('tab', { name: 'Attendance' })

    await userEvent.click(screen.getByRole('tab', { name: 'Attendance' }))

    expect(await screen.findByText('1 disputed attendance record')).toBeInTheDocument()
    expect(
      screen.getByText(/Attendance is recorded and settled by the host organization supervisor/),
    ).toBeInTheDocument()
    // AttendanceService.record/confirm/resolve all require the assigned ORGANIZATION supervisor.
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
  })

  it('fetches only the open tab, so a section costs one request per running placement', async () => {
    const calls = stubApi({ weeklyLogs: [SUBMITTED_LOG] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisionQueuePage />)
    await screen.findByText('1 weekly log awaiting your review')

    expect(calls.some((url) => url.includes('/weekly-logs'))).toBe(true)
    expect(calls.some((url) => url.includes('/attendance'))).toBe(false)
  })

  it('reports a placement it could not read instead of hiding the failure', async () => {
    // A 403 on one placement must not silently shrink the queue into a false "all clear".
    stubApi({ weeklyLogs: [SUBMITTED_LOG], forbid: ['/weekly-logs'] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisionQueuePage />)

    expect(await screen.findByText('Some internships could not be read and are not shown here.')).toBeInTheDocument()
  })

  it('serves a coordinator the same queue over their own department scope', async () => {
    // requireUniversityAcademicAccess admits coordinators too; the API narrows the placement list to
    // their assigned departments, and this page never widens it.
    stubApi({ weeklyLogs: [SUBMITTED_LOG] })
    renderAs('DEPARTMENT_COORDINATOR', <SupervisionQueuePage />, ['dept-1'])

    expect(await screen.findByText('1 weekly log awaiting your review')).toBeInTheDocument()
  })

  it('renders its tabs and empty states in Somali', async () => {
    await i18n.changeLanguage('so')
    stubApi({ placements: [] })
    renderAs('UNIVERSITY_SUPERVISOR', <SupervisionQueuePage />)

    const tablist = await screen.findByRole('tablist')
    expect(within(tablist).getByRole('tab', { name: 'Diiwaannada toddobaadka' })).toBeInTheDocument()
    expect(await screen.findByText('Wax dib u eegis ah hadda ma jiraan')).toBeInTheDocument()
  })
})
