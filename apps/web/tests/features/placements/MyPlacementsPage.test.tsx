import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { MyPlacementsPage } from '../../../src/features/placements/pages/MyPlacementsPage'
import { StudentPlacementDetailPage } from '../../../src/features/placements/pages/StudentPlacementDetailPage'
import { PlacementWorkspace } from '../../../src/features/placements/components/PlacementWorkspace'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const placement = {
  id: 'pl-1',
  candidacyId: 'cand-1',
  opportunityId: 'opp-1',
  opportunityTitle: 'Backend Engineering Intern',
  organizationId: 'org-1',
  organizationName: 'Hormuud',
  universityId: 'uni-1',
  universityName: 'Jamhuriya University',
  departmentId: 'dep-1',
  departmentName: 'Computer Science',
  studentUserId: 'stu-1',
  studentFullName: 'Amina Yusuf',
  studentEmail: 'amina@example.test',
  startDate: '2026-10-01',
  endDate: '2027-01-01',
  location: 'Mogadishu',
  status: 'ACTIVE',
  startedAt: '2026-10-01T00:00:00Z',
  completionRequestedAt: null,
  completedAt: null,
  cancelledAt: null,
  terminatedAt: null,
  cancellationReason: null,
  terminationReason: null,
  universitySupervisor: {
    id: 'a-1',
    supervisorUserId: 'sup-1',
    supervisorEmail: 'supervisor@uni.test',
    type: 'UNIVERSITY',
    assignedAt: '2026-10-01T00:00:00Z',
    removedAt: null,
    active: true,
  },
  organizationSupervisor: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
}

function stubFetch(body: unknown) {
  const fetchMock = vi.fn(() => jsonResponse(body))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('MyPlacementsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  /** The route carries no student id — the backend scopes to the session (CLAUDE.md section 12). */
  it('requests the self-service endpoint with no student id', async () => {
    const fetchMock = stubFetch([placement])
    render(
      <MemoryRouter>
        <AppProviders>
          <MyPlacementsPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Backend Engineering Intern')).toBeInTheDocument()
    expect(String(fetchMock.mock.calls[0][0])).toContain('/students/me/placements')
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('stu-1')
  })

  it('shows an empty state before any offer is accepted', async () => {
    stubFetch([])
    render(
      <MemoryRouter>
        <AppProviders>
          <MyPlacementsPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/do not have an internship placement yet/i)).toBeInTheDocument()
  })
})

describe('StudentPlacementDetailPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  /** The student reads their placement; the hosting organization drives the lifecycle. */
  it('shows supervisors but offers the student no lifecycle commands', async () => {
    // URL-aware: the overview now also loads its completion checklist and the organization's
    // evaluation, which the backend withholds until the evaluation is FINAL (hence the 204).
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/completion')) {
          return jsonResponse({ canComplete: true, policySource: 'PLATFORM_DEFAULT', requirements: [] })
        }
        if (url.endsWith('/evaluation')) {
          return Promise.resolve(new Response(null, { status: 204 }))
        }
        return jsonResponse(placement)
      }),
    )
    render(
      <MemoryRouter initialEntries={['/student/placements/pl-1']}>
        <AppProviders>
          <Routes>
            {/*
              Phase 6 nests the student's internship sections under a workspace shell that loads the
              placement once and hands it down — this is how the app actually mounts the overview.
            */}
            <Route
              path="/student/placements/:placementId"
              element={<PlacementWorkspace area="student" />}
            >
              <Route index element={<StudentPlacementDetailPage />} />
            </Route>
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Backend Engineering Intern')).toBeInTheDocument()
    expect(screen.getByText('supervisor@uni.test')).toBeInTheDocument()
    expect(screen.getByText('Not assigned yet')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Start internship' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'End early' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request completion' })).not.toBeInTheDocument()
  })
})
