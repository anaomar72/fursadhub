import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { PlacementDetailPage } from '../../../src/features/placements/pages/PlacementDetailPage'
import i18n from '../../../src/lib/i18n'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import type { PlacementResponse, PlacementStatus } from '../../../src/features/placements/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function placement(overrides: Partial<PlacementResponse> = {}): PlacementResponse {
  return {
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
    status: 'PLANNED',
    startedAt: null,
    completionRequestedAt: null,
    completedAt: null,
    cancelledAt: null,
    terminatedAt: null,
    cancellationReason: null,
    terminationReason: null,
    universitySupervisor: null,
    organizationSupervisor: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

interface StubOptions {
  detail?: PlacementResponse
  onCommand?: (url: string) => Promise<Response>
  eligible?: { userId: string; email: string }[]
  history?: unknown[]
}

function stubFetch({ detail = placement(), onCommand, eligible = [], history = [] }: StubOptions = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST') {
      return onCommand ? onCommand(url) : jsonResponse(detail)
    }
    if (url.includes('/eligible-')) {
      return jsonResponse(eligible)
    }
    if (url.includes('/supervisors')) {
      return jsonResponse(history)
    }
    if (url.includes('/placements/pl-1')) {
      return jsonResponse(detail)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * Renders the page inside the membership context its area layout would provide. The role matters:
 * the page mirrors the backend by offering management controls only to roles that may actually use
 * them, so tests must state who is looking.
 */
function renderPage(
  area: 'organization' | 'university' = 'organization',
  role?: string,
) {
  const page = (
    <Routes>
      <Route path={`/${area}/placements/:placementId`} element={<PlacementDetailPage area={area} />} />
    </Routes>
  )

  const withMembership =
    area === 'organization' ? (
      <OrganizationMembershipContext.Provider
        value={{ organizationId: 'org-1', role: (role ?? 'RECRUITER') as never }}
      >
        {page}
      </OrganizationMembershipContext.Provider>
    ) : (
      <UniversityMembershipContext.Provider
        value={{
          universityId: 'uni-1',
          role: (role ?? 'UNIVERSITY_ADMIN') as never,
          departmentIds: ['dep-1'],
        }}
      >
        {page}
      </UniversityMembershipContext.Provider>
    )

  return render(
    <MemoryRouter initialEntries={[`/${area}/placements/pl-1`]}>
      <AppProviders>{withMembership}</AppProviders>
    </MemoryRouter>,
  )
}

describe('PlacementDetailPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  it('shows the placement with its own academic context', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.getByText('Backend Engineering Intern')).toBeInTheDocument()
    expect(screen.getByText('Jamhuriya University')).toBeInTheDocument()
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------- lifecycle

  it('offers start and cancel on a PLANNED placement, and never terminate', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByRole('button', { name: 'Start internship' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel placement' })).toBeInTheDocument()
    // A placement that never started cannot be "ended early" — the two are not interchangeable.
    expect(screen.queryByRole('button', { name: 'End early' })).not.toBeInTheDocument()
  })

  it('offers terminate and request-completion on an ACTIVE placement, and never cancel', async () => {
    stubFetch({ detail: placement({ status: 'ACTIVE', startedAt: '2026-10-01T00:00:00Z' }) })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Request completion' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End early' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel placement' })).not.toBeInTheDocument()
  })

  it('sends the explicit start command', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Start internship' }))

    await waitFor(() => {
      const started = fetchMock.mock.calls.some(
        ([url, init]) => String(url).endsWith('/placements/pl-1/start') && (init as RequestInit)?.method === 'POST',
      )
      expect(started).toBe(true)
    })
  })

  /** Ending a placement asks for confirmation and a reason rather than firing on the first click. */
  it('requires confirmation before cancelling', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel placement' }))

    expect(screen.getByText(/this placement has not started/i)).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith('/cancel')),
    ).toBe(false)

    await userEvent.type(screen.getByLabelText(/reason/i), 'Position withdrawn.')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))

    await waitFor(() => {
      const cancelled = fetchMock.mock.calls.some(
        ([url, init]) => String(url).endsWith('/placements/pl-1/cancel') && (init as RequestInit)?.method === 'POST',
      )
      expect(cancelled).toBe(true)
    })
  })

  it('shows no lifecycle commands once the placement is terminal', async () => {
    stubFetch({ detail: placement({ status: 'COMPLETED', completedAt: '2027-01-02T00:00:00Z' }) })
    renderPage()

    expect(await screen.findByText('This internship is complete.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start internship' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'End early' })).not.toBeInTheDocument()
  })

  /** CANCELLED and TERMINATED must never collapse into one "ended" label. */
  it('distinguishes a cancelled placement from one that ended early', async () => {
    stubFetch({
      detail: placement({
        status: 'TERMINATED',
        startedAt: '2026-10-01T00:00:00Z',
        terminatedAt: '2026-11-01T00:00:00Z',
        terminationReason: 'Student withdrew in week 3.',
      }),
    })
    renderPage()

    expect(await screen.findByText('Ended early')).toBeInTheDocument()
    expect(screen.getByText(/student withdrew in week 3/i)).toBeInTheDocument()
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------- authority split

  /**
   * The university area must not render organization-side controls, mirroring the backend split.
   * This is UX only — the backend refuses the call regardless — but the UI should not invite it.
   */
  it('does not offer lifecycle commands in the university area', async () => {
    stubFetch()
    renderPage('university')

    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start internship' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel placement' })).not.toBeInTheDocument()
  })

  it('lets the university area assign only the university supervisor', async () => {
    stubFetch({ eligible: [{ userId: 'sup-1', email: 'supervisor@uni.test' }] })
    renderPage('university')

    await screen.findByText('Amina Yusuf')
    // One picker only: the organization post is shown, but not editable from here.
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'Assign' })).toBeInTheDocument()
  })

  it('lets the organization area assign only the organization supervisor', async () => {
    stubFetch({ eligible: [{ userId: 'sup-2', email: 'mentor@org.test' }] })
    renderPage('organization')

    await screen.findByText('Amina Yusuf')
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(1))
  })

  /**
   * Supervising an internship is not authority over it. A supervisor may read the placement they
   * are assigned to, but the backend refuses lifecycle and assignment commands from them, so the
   * page must not present those controls at all.
   */
  it('offers an organization supervisor no lifecycle or assignment controls', async () => {
    stubFetch()
    renderPage('organization', 'ORGANIZATION_SUPERVISOR')

    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start internship' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel placement' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('offers a university supervisor no assignment controls', async () => {
    stubFetch()
    renderPage('university', 'UNIVERSITY_SUPERVISOR')

    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    // They still see who holds each post.
    expect(screen.getByText('University supervisor')).toBeInTheDocument()
  })

  it('lets a department coordinator assign the university supervisor', async () => {
    stubFetch({ eligible: [{ userId: 'sup-1', email: 'supervisor@uni.test' }] })
    renderPage('university', 'DEPARTMENT_COORDINATOR')

    await screen.findByText('Amina Yusuf')
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(1))
  })

  // ---------------------------------------------------------------- supervisors

  it('surfaces a supervisor eligibility error using the stable code, not the message', async () => {
    stubFetch({
      eligible: [{ userId: 'sup-1', email: 'supervisor@uni.test' }],
      onCommand: () =>
        jsonResponse(
          {
            code: 'SUPERVISOR_WRONG_UNIVERSITY',
            message: 'raw backend english that the UI must not show',
            status: 422,
            path: '/api/v1/placements/pl-1/university-supervisor',
            timestamp: '2026-09-01T00:00:00Z',
            fieldErrors: [],
          },
          422,
        ),
    })
    renderPage('university')

    await screen.findByText('Amina Yusuf')
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(1))

    await userEvent.selectOptions(screen.getByRole('combobox'), 'sup-1')
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That supervisor belongs to a different university.',
    )
  })

  it('shows past and current supervision periods together', async () => {
    stubFetch({
      history: [
        {
          id: 'a-1',
          supervisorUserId: 'sup-1',
          supervisorEmail: 'first@uni.test',
          type: 'UNIVERSITY',
          assignedAt: '2026-10-01T00:00:00Z',
          removedAt: '2026-11-01T00:00:00Z',
          active: false,
        },
        {
          id: 'a-2',
          supervisorUserId: 'sup-2',
          supervisorEmail: 'second@uni.test',
          type: 'UNIVERSITY',
          assignedAt: '2026-11-01T00:00:00Z',
          removedAt: null,
          active: true,
        },
      ],
    })
    renderPage()

    expect(await screen.findByText('Supervision history')).toBeInTheDocument()
    // The replaced supervisor is still on record — the whole point of append-only history.
    expect(screen.getByText('first@uni.test')).toBeInTheDocument()
    expect(screen.getByText('second@uni.test')).toBeInTheDocument()
    expect(screen.getByText('Past')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
  })
})

describe('PlacementDetailPage in Somali', () => {
  beforeEach(async () => {
    vi.unstubAllGlobals()
  })

  it('renders placement status in Somali without falling back to English', async () => {
    await i18n.changeLanguage('so')
    stubFetch({ detail: placement({ status: 'ACTIVE', startedAt: '2026-10-01T00:00:00Z' }) })
    renderPage()

    expect(await screen.findByText('Socda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Codso dhammaystirka' })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})

/** Status tones are shared so a placement never reads differently between areas. */
describe('placement status tones', () => {
  it('keeps cancelled and terminated visually distinct', async () => {
    const { PLACEMENT_STATUS_TONE } = await import(
      '../../../src/features/placements/components/statusTone'
    )
    expect(PLACEMENT_STATUS_TONE.CANCELLED).not.toEqual(PLACEMENT_STATUS_TONE.TERMINATED)
    const statuses: PlacementStatus[] = [
      'PLANNED',
      'ACTIVE',
      'COMPLETION_PENDING',
      'COMPLETED',
      'CANCELLED',
      'TERMINATED',
    ]
    statuses.forEach((status) => expect(PLACEMENT_STATUS_TONE[status]).toBeDefined())
  })
})
