import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DashboardPage } from '../../../src/features/university/pages/DashboardPage'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { UniversityRole } from '../../../src/features/university/types'

const UNIVERSITY_ID = 'univ-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function stubApi({
  students = [] as unknown[],
  placements = [] as unknown[],
  departments = [] as unknown[],
  nominations = [] as unknown[],
  cases = [] as unknown[],
  requests = [] as unknown[],
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (url.includes('/students')) return jsonResponse(students)
      if (url.includes('/departments')) return jsonResponse(departments)
      if (url.includes('/verification-cases')) return jsonResponse(cases)
      if (url.includes('/opportunity-requests')) return jsonResponse(requests)
      if (url.includes('/nominations')) return jsonResponse(nominations)
      if (url.includes('/placements')) return jsonResponse(placements)
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
  organizationId: 'org-1',
  organizationName: 'TechSolutions',
  opportunityTitle: 'Frontend Intern',
  status: 'ACTIVE',
  startDate: '2026-09-01',
  endDate: '2026-12-01',
}

describe('university DashboardPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('counts every headline metric from the real list endpoints', async () => {
    stubApi({
      students: [STUDENT, { ...STUDENT, enrollmentId: 'enr-2', studentUserId: 'stu-2', verificationStatus: 'SUBMITTED' }],
      placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', studentUserId: 'stu-2', organizationId: 'org-2', organizationName: 'DataSmart', status: 'COMPLETED' }],
      departments: [{ id: 'dept-1', universityId: UNIVERSITY_ID, name: 'Computer Science', code: 'CS' }],
    })
    renderDashboard()

    expect(await screen.findByText('Total students')).toBeInTheDocument()
    expect(screen.getByText('Total students').closest('div')?.parentElement).toHaveTextContent('2')
    // One ACTIVE placement is live; the COMPLETED one is not.
    expect(screen.getByText('Active placements').closest('div')?.parentElement).toHaveTextContent('1')
    // Two distinct students have been placed, across two distinct organizations.
    expect(screen.getByText('Placed students').closest('div')?.parentElement).toHaveTextContent('2')
    expect(screen.getAllByText('Partner organizations')[0].closest('div')?.parentElement).toHaveTextContent('2')
  })

  it('shows the placement distribution instead of a fabricated trend line', async () => {
    stubApi({ placements: [PLACEMENT, { ...PLACEMENT, id: 'plc-2', status: 'COMPLETED' }] })
    renderDashboard()

    const distribution = await screen.findByRole('list', { name: 'Placements by status' })
    expect(distribution).toHaveTextContent('Active')
    expect(distribution).toHaveTextContent('Completed')
    // Percentages are computed from the real counts: one of two each.
    expect(distribution).toHaveTextContent('50%')
  })

  it('reports verification progress from the real enrollment states', async () => {
    stubApi({
      students: [STUDENT, { ...STUDENT, enrollmentId: 'enr-2', verificationStatus: 'SUBMITTED' }],
    })
    renderDashboard()

    // The same phrase also labels each department row, so target the meter itself.
    expect(await screen.findByRole('progressbar', { name: '1 of 2 verified' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('lists real partner organizations derived from placements', async () => {
    stubApi({ placements: [PLACEMENT] })
    renderDashboard()

    expect(await screen.findByText('TechSolutions')).toBeInTheDocument()
    expect(screen.getByText('1 placement')).toBeInTheDocument()
  })

  it('keeps the department breakdown for admins only', async () => {
    stubApi({ students: [STUDENT], departments: [{ id: 'dept-1', universityId: UNIVERSITY_ID, name: 'Computer Science', code: 'CS' }] })
    const admin = renderDashboard('UNIVERSITY_ADMIN')
    expect(await screen.findByText('Students by department')).toBeInTheDocument()
    admin.unmount()

    stubApi({ students: [STUDENT], departments: [{ id: 'dept-1', universityId: UNIVERSITY_ID, name: 'Computer Science', code: 'CS' }] })
    renderDashboard('DEPARTMENT_COORDINATOR', ['dept-1'])
    await screen.findByText('Total students')
    expect(screen.queryByText('Students by department')).not.toBeInTheDocument()
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderDashboard()

    expect(await screen.findByText('Wadarta ardayda')).toBeInTheDocument()
    expect(screen.queryByText('Total students')).not.toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})
