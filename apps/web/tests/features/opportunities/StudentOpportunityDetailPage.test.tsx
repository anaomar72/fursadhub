import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { StudentOpportunityDetailPage } from '../../../src/features/opportunities/pages/StudentOpportunityDetailPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

const OPPORTUNITY = {
  id: 'opp-1',
  title: 'Frontend Developer Intern',
  organization: { id: 'org-1', name: 'TechSolutions', verified: true },
  description: 'Build interfaces.',
  responsibilities: 'Ship features.',
  requirements: 'React.',
  mode: 'PUBLIC',
  numberOfOpenings: 2,
  workMode: 'ONSITE',
  location: 'Mogadishu',
  startDate: '2026-10-01',
  endDate: '2026-12-31',
  applicationDeadline: null,
  publishedAt: '2026-08-01T00:00:00Z',
}

function stubApi({
  opportunity = OPPORTUNITY,
  enrollmentStatus = 'VERIFIED' as string | null,
  placements = [] as unknown[],
  candidacies = [] as unknown[],
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (url.includes('/students/me/enrollment')) {
        return enrollmentStatus === null
          ? jsonResponse({ code: 'NOT_FOUND', message: '', status: 404, path: '', timestamp: '', fieldErrors: [] }, 404)
          : jsonResponse({ id: 'e1', universityId: 'u', departmentId: 'd', studentNumber: 'S1', program: 'CS', academicYear: '4', verificationStatus: enrollmentStatus })
      }
      if (url.includes('/students/me/candidacies')) return jsonResponse(candidacies)
      if (url.includes('/students/me/placements')) return jsonResponse(placements)
      if (url.includes('/public/opportunities/')) return jsonResponse(opportunity)
      return jsonResponse({})
    }),
  )
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/student/opportunities/opp-1']}>
      <AppProviders>
        <Routes>
          <Route path="/student/opportunities/:opportunityId" element={<StudentOpportunityDetailPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('StudentOpportunityDetailPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('offers Apply to a verified, available student', async () => {
    stubApi()
    renderDetail()

    const apply = await screen.findByRole('link', { name: /apply now/i })
    expect(apply).toHaveAttribute('href', '/student/opportunities/opp-1/apply')
  })

  it('explains an unverified enrollment instead of offering Apply', async () => {
    stubApi({ enrollmentStatus: 'SUBMITTED' })
    renderDetail()

    expect(await screen.findByText(/enrollment must be verified/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /apply now/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to enrollment/i })).toHaveAttribute('href', '/student/enrollment')
  })

  it('explains an existing live placement instead of offering Apply', async () => {
    stubApi({ placements: [{ id: 'plc-1', status: 'ACTIVE' }] })
    renderDetail()

    expect(await screen.findByText(/already have an active internship placement/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /apply now/i })).not.toBeInTheDocument()
  })

  it('links to the existing application when the student already applied', async () => {
    stubApi({
      candidacies: [{ id: 'c1', opportunityId: 'opp-1', opportunityTitle: 'x', source: 'SELF_APPLICATION', status: 'SUBMITTED', createdAt: '2026-08-01T00:00:00Z', liveOffer: null }],
    })
    renderDetail()

    expect(await screen.findByText(/already applied to this internship/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view my application/i })).toHaveAttribute('href', '/student/applications/c1')
  })

  it('reports a passed deadline rather than letting the student try', async () => {
    stubApi({ opportunity: { ...OPPORTUNITY, applicationDeadline: '2020-01-01' } })
    renderDetail()

    expect(await screen.findByText(/deadline for this internship has passed/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /apply now/i })).not.toBeInTheDocument()
  })
})
