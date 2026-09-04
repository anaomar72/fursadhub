import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { VerificationCaseDetailPage } from '../../../src/features/university/pages/VerificationCaseDetailPage'
import { UniversityMembershipContext } from '../../../src/features/university/components/UniversityMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { MyMembershipResponse, VerificationCaseResponse } from '../../../src/features/university/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const MEMBERSHIP = {
  universityId: 'uni-1',
  universityName: 'Jamhuriya University',
  role: 'DEPARTMENT_COORDINATOR',
  departmentIds: ['dep-1'],
} as unknown as MyMembershipResponse

function verificationCase(overrides: Partial<VerificationCaseResponse> = {}): VerificationCaseResponse {
  return {
    id: 'case-1',
    enrollmentId: 'enr-1',
    status: 'UNDER_REVIEW',
    reviewNotes: null,
    submittedAt: '2026-08-01T00:00:00Z',
    reviewedAt: null,
    studentEmail: 'hodan@student.jamhuriya.edu.so',
    universityId: 'uni-1',
    departmentId: 'dep-1',
    studentNumber: 'JU-2023-0412',
    program: 'BSc Information Technology',
    academicYear: '2025/2026',
    hasEvidence: true,
    escalatedAt: null,
    escalationReason: null,
    ...overrides,
  }
}

function stubFetch(record = verificationCase(), onCommand?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url) : jsonResponse({ message: 'ok' })
    }
    if (url.includes('/evidence/document')) {
      return Promise.resolve(new Response(new Blob(['pdf']), { status: 200 }))
    }
    if (url.includes('/verification-cases/case-1')) return jsonResponse(record)
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/university/verification-cases/case-1']}>
      <AppProviders>
        <UniversityMembershipContext.Provider value={MEMBERSHIP}>
          <Routes>
            <Route
              path="/university/verification-cases/:caseId"
              element={<VerificationCaseDetailPage />}
            />
          </Routes>
        </UniversityMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('VerificationCaseDetailPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stub')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    await i18n.changeLanguage('en')
  })

  it('shows the claim the reviewer is being asked to judge', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('JU-2023-0412')).toBeInTheDocument()
    expect(screen.getByText('BSc Information Technology')).toBeInTheDocument()
  })

  it('opens the evidence through the audited API route, never a storage URL', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Open evidence' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes('/universities/uni-1/verification-cases/case-1/evidence/document'),
        ),
      ).toBe(true)
    })
  })

  it('offers no evidence control when the student attached nothing', async () => {
    stubFetch(verificationCase({ hasEvidence: false }))
    renderPage()

    expect(await screen.findByText('The student attached no document to this case.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open evidence' })).not.toBeInTheDocument()
  })

  it('escalates to the platform with the reason the reviewer typed', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Escalate to FursadHub' }))
    await userEvent.type(
      screen.getByLabelText('Why can this case not be settled here?'),
      'Student number not in our register',
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Escalate to FursadHub' }),
    )

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/universities/uni-1/verification-cases/case-1/escalate'),
      )
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
        notes: 'Student number not in our register',
      })
    })
  })

  it('requires a reason before it will escalate', async () => {
    stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Escalate to FursadHub' }))
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Escalate to FursadHub' }),
    ).toBeDisabled()
  })

  it('says a case is already escalated rather than offering it twice', async () => {
    stubFetch(verificationCase({ escalatedAt: '2026-08-20T00:00:00Z', escalationReason: 'Disputed' }))
    renderPage()

    expect(await screen.findByText('Escalated to FursadHub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Already escalated' })).toBeDisabled()
  })

  it('keeps the review controls after escalation, because access does not change', async () => {
    stubFetch(verificationCase({ escalatedAt: '2026-08-20T00:00:00Z' }))
    renderPage()

    // The backend leaves the state machine and the university's own access untouched.
    expect(await screen.findByRole('button', { name: 'Verify' })).toBeEnabled()
  })

  it('translates a machine-readable failure rather than showing the API message', async () => {
    stubFetch(verificationCase(), () =>
      jsonResponse(
        {
          code: 'VERIFICATION_CASE_ALREADY_RESOLVED',
          message: 'raw backend text',
          status: 409,
          path: '/x',
          timestamp: '',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Verify' }))

    const alert = await screen.findByRole('alert')
    expect(alert).not.toHaveTextContent('raw backend text')
  })

  it('shows an error state instead of a blank page when the case cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse(
          { code: 'ACCESS_DENIED', message: 'x', status: 403, path: '/x', timestamp: '', fieldErrors: [] },
          403,
        ),
      ),
    )
    renderPage()

    expect(
      await screen.findByText('This verification case could not be found.', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByText('Waxa ardaygu sheegayo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fur caddaynta' })).toBeInTheDocument()
  })
})
