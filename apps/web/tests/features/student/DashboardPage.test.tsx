import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DashboardPage } from '../../../src/features/student/pages/DashboardPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

interface StubOptions {
  candidacies?: unknown[]
  nominations?: unknown[]
  offers?: unknown[]
  placements?: unknown[]
  enrollmentStatus?: string | null
  opportunities?: unknown[]
  hasCv?: boolean
}

function stubApi({
  candidacies = [],
  nominations = [],
  offers = [],
  placements = [],
  enrollmentStatus = 'VERIFIED',
  opportunities = [],
  hasCv = true,
}: StubOptions = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (url.includes('/students/me/profile')) return jsonResponse({ userId: 'u1', fullName: 'Amina Yusuf', phone: null })
      if (url.includes('/students/me/enrollment')) {
        return enrollmentStatus === null
          ? jsonResponse({ code: 'NOT_FOUND', message: '', status: 404, path: '', timestamp: '', fieldErrors: [] }, 404)
          : jsonResponse({ id: 'e1', universityId: 'u', departmentId: 'd', studentNumber: 'S1', program: 'CS', academicYear: '4', verificationStatus: enrollmentStatus })
      }
      if (url.includes('/students/me/cv')) return jsonResponse({ present: hasCv })
      if (url.includes('/students/me/candidacies')) return jsonResponse(candidacies)
      if (url.includes('/students/me/nominations')) return jsonResponse(nominations)
      if (url.includes('/students/me/offers')) return jsonResponse(offers)
      if (url.includes('/students/me/placements')) return jsonResponse(placements)
      if (url.includes('/public/opportunities')) {
        return jsonResponse({ content: opportunities, page: 0, size: 3, totalElements: opportunities.length, totalPages: 1 })
      }
      return jsonResponse({})
    }),
  )
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <DashboardPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

const CANDIDACY = {
  id: 'c1',
  opportunityId: 'opp-1',
  opportunityTitle: 'Frontend Developer Intern',
  source: 'SELF_APPLICATION',
  status: 'INTERVIEW',
  createdAt: '2026-08-01T00:00:00Z',
  liveOffer: null,
}

describe('student DashboardPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('counts each metric from the real endpoints rather than a dashboard aggregate', async () => {
    stubApi({
      candidacies: [CANDIDACY, { ...CANDIDACY, id: 'c2', status: 'SUBMITTED', opportunityId: 'opp-2' }],
      nominations: [{ id: 'n1', status: 'PENDING_STUDENT_CONSENT' }],
      offers: [{ id: 'o1', status: 'PENDING' }, { id: 'o2', status: 'DECLINED' }],
    })
    renderDashboard()

    // Applications counts both active candidacies; Interviews counts only the INTERVIEW one.
    const applications = (await screen.findByText('Applications')).closest('div')?.parentElement
    expect(applications).toHaveTextContent('2')
    expect(screen.getByText('Interviews').closest('div')?.parentElement).toHaveTextContent('1')
    expect(screen.getByText('Nominations').closest('div')?.parentElement).toHaveTextContent('1')
    // Only the PENDING offer is awaiting a decision.
    expect(screen.getByText('Offers').closest('div')?.parentElement).toHaveTextContent('1')
  })

  it('greets the student by the name on their real profile', async () => {
    stubApi()
    renderDashboard()

    expect(await screen.findByRole('heading', { name: /welcome back, amina/i })).toBeInTheDocument()
  })

  it('lists real open internships and links each into the student shell', async () => {
    stubApi({
      opportunities: [
        {
          id: 'opp-9',
          title: 'Data Analysis Intern',
          organization: { id: 'org-1', name: 'DataSmart', verified: true },
          description: 'Work with data.',
          mode: 'PUBLIC',
          numberOfOpenings: 2,
          workMode: 'REMOTE',
          location: 'Mogadishu',
          startDate: '2026-10-01',
          endDate: '2026-12-01',
          applicationDeadline: '2026-09-20',
          publishedAt: '2026-08-01T00:00:00Z',
          responsibilities: null,
          requirements: null,
        },
      ],
    })
    renderDashboard()

    const link = await screen.findByRole('link', { name: /data analysis intern/i })
    expect(link).toHaveAttribute('href', '/student/opportunities/opp-9')
    expect(screen.getByText(/DataSmart/)).toBeInTheDocument()
  })

  it('shows the readiness checklist derived from real records when there is no placement', async () => {
    stubApi({ enrollmentStatus: 'SUBMITTED', hasCv: false })
    renderDashboard()

    expect(await screen.findByText('Get ready to apply')).toBeInTheDocument()
    expect(screen.getByText('Upload your CV')).toBeInTheDocument()
    // Profile saved + enrollment claimed = 2 of 4.
    expect(screen.getByRole('progressbar', { name: 'Profile completion' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('replaces the checklist with the live placement once one exists', async () => {
    stubApi({
      placements: [
        {
          id: 'plc-1',
          status: 'ACTIVE',
          opportunityTitle: 'Backend Intern',
          organizationName: 'CloudWorks',
          startDate: '2026-09-01',
          endDate: '2026-12-01',
        },
      ],
    })
    renderDashboard()

    expect(await screen.findByText('Backend Intern')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open my internship/i })).toHaveAttribute('href', '/student/placements/plc-1')
    expect(screen.queryByText('Get ready to apply')).not.toBeInTheDocument()
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderDashboard()

    expect(await screen.findByText('Codsiyada')).toBeInTheDocument()
    expect(screen.queryByText('Applications')).not.toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})
