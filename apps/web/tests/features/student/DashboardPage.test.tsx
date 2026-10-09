import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DashboardPage } from '../../../src/features/student/pages/DashboardPage'
import i18n from '../../../src/lib/i18n'

/**
 * Phase 5. The student dashboard answers "where am I, what needs me, how far along am I" from the
 * student's own records — it is no longer a row of counters. These tests pin the state logic to the
 * real endpoints and pin the loading contract: nothing blanks the page, and one failed section
 * stays one failed section.
 */

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function apiError(status: number, code = 'ERROR') {
  return jsonResponse({ code, message: '', status, path: '', timestamp: '', fieldErrors: [] }, status)
}

interface StubOptions {
  candidacies?: unknown[]
  nominations?: unknown[]
  placements?: unknown[]
  enrollmentStatus?: string | null
  opportunities?: unknown[]
  completion?: unknown
  weeklyLogs?: unknown[]
  attendance?: unknown[]
  fail?: string[]
  hang?: boolean
}

let requested: string[] = []

function stubApi({
  candidacies = [],
  nominations = [],
  placements = [],
  enrollmentStatus = 'VERIFIED',
  opportunities = [],
  completion,
  weeklyLogs = [],
  attendance = [],
  fail = [],
  hang = false,
}: StubOptions = {}) {
  requested = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      requested.push(url)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (fail.some((fragment) => url.includes(fragment))) return apiError(500)
      if (hang && url.includes('/students/me/')) return new Promise<Response>(() => {})
      if (url.includes('/students/me/profile')) return jsonResponse({ userId: 'u1', fullName: 'Amina Yusuf', phone: null })
      if (url.includes('/students/me/enrollment')) {
        return enrollmentStatus === null
          ? apiError(404, 'STUDENT_ENROLLMENT_NOT_FOUND')
          : jsonResponse({ id: 'e1', universityId: 'u', departmentId: 'd', studentNumber: 'S1', program: 'CS', academicYear: '4', verificationStatus: enrollmentStatus })
      }
      if (url.includes('/students/me/candidacies')) return jsonResponse(candidacies)
      if (url.includes('/students/me/nominations')) return jsonResponse(nominations)
      if (url.includes('/students/me/placements')) return jsonResponse(placements)
      if (url.includes('/completion')) return jsonResponse(completion ?? { canComplete: false, policySource: 'UNIVERSITY', requirements: [] })
      if (url.includes('/weekly-logs')) return jsonResponse(weeklyLogs)
      if (url.includes('/attendance')) return jsonResponse(attendance)
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

const ACTIVE_PLACEMENT = {
  id: 'plc-1',
  status: 'ACTIVE',
  opportunityTitle: 'Backend Intern',
  organizationName: 'CloudWorks',
  startDate: '2026-09-01',
  endDate: '2026-12-01',
  startedAt: '2026-09-01T08:00:00Z',
  completedAt: null,
}

const COMPLETION = {
  canComplete: false,
  policySource: 'UNIVERSITY',
  requirements: [
    { type: 'WEEKLY_LOGS', required: true, satisfied: false, detail: '1/10', unmetCode: 'X' },
    { type: 'ATTENDANCE', required: true, satisfied: false, detail: '3/4', unmetCode: 'X' },
    { type: 'ORGANIZATION_EVALUATION', required: false, satisfied: false, detail: null, unmetCode: 'X' },
    { type: 'FINAL_REPORT', required: true, satisfied: false, detail: 'NEEDS_REVISION', unmetCode: 'X' },
    { type: 'DEFENSE', required: true, satisfied: false, detail: 'MISSING', unmetCode: 'X' },
  ],
}

const hero = async () => {
  const heading = await screen.findByText('Where you are')
  return heading.closest('section') as HTMLElement
}

describe('student DashboardPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('greets the student by the name on their real profile', async () => {
    stubApi()
    renderDashboard()
    expect(await screen.findByRole('heading', { level: 1, name: /welcome back, amina/i })).toBeInTheDocument()
  })

  it('renders the page header at once and skeletons the rest — no page-wide spinner', async () => {
    stubApi({ hang: true })
    renderDashboard()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect((await screen.findAllByRole('status')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Where you are')).not.toBeInTheDocument()
  })

  describe('where am I', () => {
    it('a verified student with nothing in progress is ready to apply, and is told to browse', async () => {
      stubApi()
      renderDashboard()
      const section = await hero()
      expect(within(section).getByRole('heading', { name: "You're ready to apply" })).toBeInTheDocument()
      expect(within(section).getByRole('link', { name: 'Browse internships' })).toHaveAttribute('href', '/student/opportunities')
    })

    it('a student without an enrollment is sent to claim one first', async () => {
      stubApi({ enrollmentStatus: null })
      renderDashboard()
      const section = await hero()
      expect(within(section).getByRole('heading', { name: /claiming your university enrollment/i })).toBeInTheDocument()
      expect(within(section).getByRole('link', { name: 'Continue enrollment' })).toHaveAttribute('href', '/student/enrollment')
    })

    it('an enrollment under review asks for nothing, and points at browsing', async () => {
      stubApi({ enrollmentStatus: 'UNDER_REVIEW' })
      renderDashboard()
      const section = await hero()
      expect(within(section).getByRole('heading', { name: /reviewing your enrollment/i })).toBeInTheDocument()
      expect(within(section).getByRole('link', { name: 'Browse internships' })).toBeInTheDocument()
    })

    it('a pending offer outranks everything except a live internship', async () => {
      stubApi({
        nominations: [{ id: 'n1', status: 'PENDING_STUDENT_CONSENT', opportunityTitle: 'Other', organizationName: 'Org', createdAt: '2026-08-01T00:00:00Z' }],
        candidacies: [{ ...CANDIDACY, status: 'OFFERED', liveOffer: { id: 'o1', status: 'PENDING', responseDeadline: '2026-11-20' } }],
      })
      renderDashboard()
      const section = await hero()
      expect(within(section).getByRole('heading', { name: 'You have an internship offer waiting' })).toBeInTheDocument()
      expect(within(section).getByRole('link', { name: 'Review offer' })).toHaveAttribute('href', '/student/applications/c1')
    })

    it('a live internship leads the page, with the placement itself and one action', async () => {
      stubApi({ placements: [ACTIVE_PLACEMENT], completion: COMPLETION })
      renderDashboard()
      const section = await hero()
      expect(within(section).getByRole('heading', { name: 'Your internship is active' })).toBeInTheDocument()
      expect(within(section).getByRole('link', { name: 'Backend Intern' })).toHaveAttribute('href', '/student/placements/plc-1')
      expect(within(section).getByRole('link', { name: 'Open internship' })).toHaveAttribute('href', '/student/placements/plc-1')
      expect(within(section).getByText(/CloudWorks/)).toBeInTheDocument()
    })
  })

  describe('what needs me', () => {
    it('shows a calm confirmation, not an empty warning, when nothing needs action', async () => {
      stubApi()
      renderDashboard()
      expect(await screen.findByText('Nothing needs your attention')).toBeInTheDocument()
    })

    it('lists an offer with its deadline and a nomination awaiting consent, each with one action', async () => {
      stubApi({
        candidacies: [{ ...CANDIDACY, status: 'OFFERED', liveOffer: { id: 'o1', status: 'PENDING', responseDeadline: '2026-11-20' } }],
        nominations: [{ id: 'n1', status: 'PENDING_STUDENT_CONSENT', opportunityTitle: 'Data Intern', organizationName: 'DataSmart', createdAt: '2026-08-01T00:00:00Z' }],
      })
      renderDashboard()

      const offer = await screen.findByText('Respond to the offer for Frontend Developer Intern')
      expect(offer.closest('li')).toHaveTextContent(/Respond by/)
      expect(within(offer.closest('li')!).getByRole('link', { name: 'Review offer' })).toHaveAttribute('href', '/student/applications/c1')

      const nomination = screen.getByText('Agree to be considered for Data Intern')
      expect(within(nomination.closest('li')!).getByRole('link', { name: 'Respond' })).toHaveAttribute('href', '/student/nominations')
    })

    it('surfaces returned weekly logs, attendance to confirm and a report needing revision from the live internship', async () => {
      stubApi({
        placements: [ACTIVE_PLACEMENT],
        completion: COMPLETION,
        weeklyLogs: [
          { id: 'w1', weekNumber: 1, state: 'REVIEWED' },
          { id: 'w2', weekNumber: 2, state: 'RETURNED_FOR_CHANGES' },
        ],
        attendance: [
          { id: 'a1', confirmationStatus: 'CONFIRMED' },
          { id: 'a2', confirmationStatus: 'RECORDED' },
        ],
      })
      renderDashboard()

      expect(await screen.findByText('Week 2 log was returned for changes')).toBeInTheDocument()
      // Recorded attendance waits on the organization supervisor, not the student.
      expect(screen.queryByText(/attendance day/i)).not.toBeInTheDocument()
      expect(screen.getByText('Your final report needs revision')).toBeInTheDocument()
      // An application under review is not "attention" — the student cannot act on it.
      expect(screen.queryByText(/under review/i)).not.toBeInTheDocument()
    })
  })

  describe('how far along', () => {
    it('without a placement, shows the road to one — not an empty internship progress bar', async () => {
      stubApi()
      renderDashboard()
      const road = await screen.findByRole('list', { name: 'Steps to an internship' })
      expect(within(road).getByText('Verified enrollment')).toHaveTextContent('(completed)')
      expect(within(road).getByText('Apply, or accept a nomination')).toHaveTextContent('(in progress)')
      expect(screen.queryByRole('list', { name: 'Internship progress' })).not.toBeInTheDocument()
    })

    it('with a live placement, tracks the real requirements in one unordered group and leaves out what the policy does not require', async () => {
      stubApi({ placements: [ACTIVE_PLACEMENT], completion: COMPLETION, weeklyLogs: [{ id: 'w2', weekNumber: 2, state: 'RETURNED_FOR_CHANGES' }] })
      renderDashboard()
      const tracker = await screen.findByRole('list', { name: 'Internship progress' })

      expect(await within(tracker).findByText('Requirements — in any order')).toBeInTheDocument()
      expect(within(tracker).getByText('Placement confirmed', { selector: 'p' })).toHaveTextContent('(completed)')
      expect(within(tracker).getByText('Internship started', { selector: 'p' })).toHaveTextContent('(completed)')
      // Needs attention once the returned log arrives (the log list loads after the checklist).
      await waitFor(() => expect(within(tracker).getByText('Weekly logs', { selector: 'p' })).toHaveTextContent('(needs attention)'))
      expect(within(tracker).getByText('1 of 10 weeks reviewed')).toBeInTheDocument()
      expect(within(tracker).getByText('Final report', { selector: 'p' })).toHaveTextContent('(needs attention)')
      expect(within(tracker).getByText('Not scheduled yet')).toBeInTheDocument()
      expect(within(tracker).getByText('Completion', { selector: 'p' })).toHaveTextContent('(not started)')
      // ORGANIZATION_EVALUATION is not required by this placement's policy: never drawn as unmet.
      expect(within(tracker).queryByText('Organization evaluation')).not.toBeInTheDocument()
      // The open-internships list is irrelevant once the student is placed.
      expect(screen.queryByRole('heading', { name: 'Open internships' })).not.toBeInTheDocument()
    })
  })

  it('lists real open internships and links each into the student shell', async () => {
    stubApi({
      opportunities: [
        {
          id: 'opp-9',
          title: 'Data Analysis Intern',
          organization: { id: 'org-1', name: 'DataSmart', verified: true },
          mode: 'PUBLIC',
          workMode: 'REMOTE',
          location: 'Mogadishu',
          skills: [],
        },
      ],
    })
    renderDashboard()
    const link = await screen.findByRole('link', { name: /data analysis intern/i })
    expect(link).toHaveAttribute('href', '/student/opportunities/opp-9')
  })

  describe('partial failures', () => {
    it('keeps the page when the stage cannot be decided: an inline error with retry, not a blank screen', { timeout: 8000 }, async () => {
      stubApi({ fail: ['/students/me/nominations'] })
      renderDashboard()
      // The core lists retry once (AppProviders: retry 1) before the section reports failure.
      expect(await screen.findByText("This section couldn't be loaded.", {}, { timeout: 4000 })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument()
    })

    it('one failed secondary section stays one failed section', async () => {
      stubApi({ fail: ['/public/opportunities'] })
      renderDashboard()
      expect(await screen.findByRole('heading', { name: "You're ready to apply" })).toBeInTheDocument()
      expect(await screen.findByRole('heading', { name: 'Open internships' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    })
  })

  it('asks for nothing it does not show: no separate offers list, no saved count, no module lists without a placement', async () => {
    stubApi()
    renderDashboard()
    await screen.findByRole('heading', { name: "You're ready to apply" })
    expect(requested.some((url) => url.includes('/students/me/offers'))).toBe(false)
    expect(requested.some((url) => url.includes('saved-opportunities'))).toBe(false)
    expect(requested.some((url) => url.includes('/weekly-logs') || url.includes('/attendance') || url.includes('/completion'))).toBe(false)
  })

  it('renders in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubApi()
    renderDashboard()
    expect(await screen.findByText('Halka aad joogto')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Waad diyaar u tahay inaad codsato' })).toBeInTheDocument()
    expect(screen.queryByText('Where you are')).not.toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})
