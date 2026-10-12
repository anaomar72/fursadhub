import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DashboardPage } from '../../../src/features/university/pages/DashboardPage'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { UniversityRole } from '../../../src/features/university/types'

/** Phase 7: one dashboard per university role, each built only from lists that role may read. */

const UNIVERSITY_ID = 'univ-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let requested: string[] = []

function stubApi({
  students = [] as unknown[],
  placements = [] as unknown[],
  departments = [] as unknown[],
  nominations = [] as unknown[],
  cases = [] as unknown[],
  requests = [] as unknown[],
  failPlacements = false,
} = {}) {
  requested = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      requested.push(url)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (url.includes('/verification-cases')) return jsonResponse(cases)
      if (url.includes('/students')) return jsonResponse(students)
      if (url.includes('/departments')) return jsonResponse(departments)
      if (url.includes('/opportunity-requests')) return jsonResponse(requests)
      if (url.includes('/nominations')) return jsonResponse(nominations)
      if (url.includes('/placements')) return failPlacements ? jsonResponse({ code: 'INTERNAL', status: 500 }, 500) : jsonResponse(placements)
      return jsonResponse({})
    }),
  )
}

function renderDashboard(role: UniversityRole = 'UNIVERSITY_ADMIN', departmentIds: string[] = []) {
  return render(
    <MemoryRouter>
      <AppProviders>
        <UniversityMembershipContext.Provider value={{ universityId: UNIVERSITY_ID, role, departmentIds }}>
          <DashboardPage />
        </UniversityMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

const DEPARTMENT = { id: 'dept-1', universityId: UNIVERSITY_ID, name: 'Computer Science', code: 'CS' }

const STUDENT = {
  studentUserId: 'stu-1',
  email: 'a@example.test',
  enrollmentId: 'enr-1',
  departmentId: 'dept-1',
  studentNumber: 'S1',
  program: 'CS',
  academicYear: '4',
  verificationStatus: 'VERIFIED',
}

const PLACEMENT = {
  id: 'plc-1',
  studentUserId: 'stu-1',
  studentFullName: 'Amina Yusuf',
  organizationId: 'org-1',
  organizationName: 'TechSolutions',
  opportunityTitle: 'Frontend Intern',
  status: 'ACTIVE',
  startDate: '2026-09-01',
  endDate: '2026-12-01',
  universitySupervisor: { supervisorUserId: 'sup-1' },
}

const CASE = { id: 'case-1', status: 'SUBMITTED', studentFullName: 'Hodan Ali', studentNumber: 'JU-1', departmentId: 'dept-1', submittedAt: '2026-09-02T00:00:00Z' }

const REQUEST = {
  targetId: 'tgt-1',
  opportunityId: 'opp-1',
  opportunityTitle: 'Data Analyst Intern',
  organizationName: 'Hormuud',
  mode: 'UNIVERSITY_TARGETED',
  requestedNominees: 3,
  liveNominationCount: 1,
  nominationDeadline: '2099-01-31',
  targetStatus: 'NOMINATING',
  eligibleDepartmentIds: ['dept-1'],
  startDate: '2099-03-01',
  endDate: '2099-06-01',
}

/** A Metric's link is named by its label and value together. */
async function metric(label: string) {
  const region = await screen.findByRole('region', { name: 'At a glance' })
  return within(region).getByText(label).closest('li') as HTMLElement
}

describe('university admin dashboard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('leads with what needs the institution, from real states only', async () => {
    stubApi({
      cases: [CASE, { ...CASE, id: 'case-2', status: 'UNDER_REVIEW' }, { ...CASE, id: 'case-3', status: 'VERIFIED' }],
      requests: [REQUEST, { ...REQUEST, targetId: 'tgt-2', liveNominationCount: 3 }],
      nominations: [{ id: 'n1', status: 'PENDING_STUDENT_CONSENT', createdAt: '2026-09-01T00:00:00Z' }],
      placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', status: 'COMPLETION_PENDING' }, { ...PLACEMENT, id: 'plc-3', universitySupervisor: null }],
    })
    renderDashboard()

    // Two reviewable cases (VERIFIED is done); one request still short of nominees (the other is filled).
    expect(await screen.findByText('2 student enrollments to verify')).toBeInTheDocument()
    expect(screen.getByText('1 internship is waiting for nominees')).toBeInTheDocument()
    expect(screen.getByText('1 internship is ready for your completion decision')).toBeInTheDocument()
    expect(screen.getByText('1 internship has no academic supervisor')).toBeInTheDocument()
    expect(screen.getByText('1 nomination is waiting for the student’s answer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/university/verification-cases?status=OPEN')
  })

  it('shows at most four honest figures, counted from the lists', async () => {
    stubApi({
      students: [STUDENT, { ...STUDENT, enrollmentId: 'enr-2', studentUserId: 'stu-2', verificationStatus: 'SUBMITTED' }],
      cases: [CASE],
      requests: [REQUEST],
      placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', status: 'COMPLETED' }],
      departments: [DEPARTMENT],
    })
    renderDashboard()

    const region = await screen.findByRole('region', { name: 'At a glance' })
    expect(within(region).getAllByRole('listitem')).toHaveLength(4)
    expect(await metric('Verified students')).toHaveTextContent(/1\s*of 2 students/)
    expect(await metric('Enrollments to verify')).toHaveTextContent('1')
    expect(await metric('Requests needing nominees')).toHaveTextContent('1')
    // One ACTIVE placement is live; the COMPLETED one is not.
    expect(await metric('Students on internship')).toHaveTextContent('1')
  })

  it('makes the verification queue the primary work, oldest first, with department names', async () => {
    stubApi({
      cases: [{ ...CASE, id: 'late', studentFullName: 'Later Student', submittedAt: '2026-09-09T00:00:00Z' }, CASE],
      departments: [DEPARTMENT],
    })
    renderDashboard()

    await screen.findByRole('link', { name: 'Later Student' })
    const queue = screen.getByRole('heading', { name: 'Enrollments to verify' }).closest('section') as HTMLElement
    const names = within(queue).getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/university/verification-cases/'))
    expect(names.map((link) => link.textContent)).toEqual(['Hodan Ali', 'Later Student'])
    expect(within(queue).getAllByText(/Computer Science/).length).toBeGreaterThan(0)
  })

  it('keeps working when one list fails, and never calls the failure "caught up"', async () => {
    stubApi({ cases: [CASE], failPlacements: true })
    renderDashboard()

    expect(await screen.findByText('1 student enrollment to verify')).toBeInTheDocument()
    expect(screen.getByText('Some of your work could not be loaded, so this list may be incomplete.')).toBeInTheDocument()
    expect(screen.queryByText('You’re all caught up')).not.toBeInTheDocument()
    // The rest of the page still renders.
    expect(screen.getByRole('heading', { name: 'Enrollments to verify' })).toBeInTheDocument()
  })

  it('shows the calm caught-up state when nothing is due', async () => {
    stubApi()
    renderDashboard()
    expect(await screen.findByText('You’re all caught up')).toBeInTheDocument()
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderDashboard()

    expect(await screen.findByRole('heading', { level: 1, name: 'Guudmarka jaamacadda' })).toBeInTheDocument()
    expect(await screen.findByText('Wax kaa dhiman ma jiraan')).toBeInTheDocument()
    expect(screen.queryByText('Needs your attention')).not.toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})

describe('department coordinator dashboard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('is a coordination workspace for their departments, not the admin page with parts hidden', async () => {
    stubApi({ requests: [REQUEST], departments: [DEPARTMENT, { ...DEPARTMENT, id: 'dept-2', name: 'Medicine' }] })
    renderDashboard('DEPARTMENT_COORDINATOR', ['dept-1'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Department coordination' })).toBeInTheDocument()
    // Only their own department is named as scope.
    expect(await screen.findByText('Your departments: Computer Science')).toBeInTheDocument()
    // Nomination requests are their primary work.
    const requests = (await screen.findByRole('heading', { name: 'Requests needing nominees' })).closest('section') as HTMLElement
    expect(within(requests).getByRole('link', { name: 'Data Analyst Intern' })).toHaveAttribute('href', '/university/opportunity-requests/tgt-1')
    // No institution-only blocks.
    expect(screen.queryByText('Students by department')).not.toBeInTheDocument()
    expect(requested.some((url) => url.endsWith(`/universities/${UNIVERSITY_ID}`))).toBe(false)
  })

  it('asks nothing of the API when no department is assigned, and says why', async () => {
    stubApi()
    renderDashboard('DEPARTMENT_COORDINATOR', [])

    expect(await screen.findByText('No department assigned yet')).toBeInTheDocument()
    expect(requested.filter((url) => url.includes(`/universities/${UNIVERSITY_ID}/`))).toEqual([])
  })
})
