import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CompletionPanel } from '../../../src/features/placements/components/CompletionPanel'
import i18n from '../../../src/lib/i18n'
import type {
  CompletionStatusResponse,
  PlacementResponse,
  PlacementStatus,
} from '../../../src/features/placements/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function placement(status: PlacementStatus = 'COMPLETION_PENDING'): PlacementResponse {
  return {
    id: 'pl-1',
    candidacyId: 'cand-1',
    opportunityId: 'opp-1',
    opportunityTitle: 'Backend Intern',
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
    status,
    startedAt: '2026-10-01T00:00:00Z',
    completionRequestedAt: '2026-12-20T00:00:00Z',
    completedAt: null,
    cancelledAt: null,
    terminatedAt: null,
    cancellationReason: null,
    terminationReason: null,
    universitySupervisor: null,
    organizationSupervisor: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-12-20T00:00:00Z',
  }
}

function completionStatus(canComplete: boolean): CompletionStatusResponse {
  return {
    canComplete,
    policySource: 'UNIVERSITY',
    requirements: [
      {
        type: 'FINAL_REPORT',
        required: true,
        satisfied: canComplete,
        detail: canComplete ? 'APPROVED' : 'SUBMITTED',
        unmetCode: 'FINAL_REPORT_NOT_APPROVED',
      },
      {
        type: 'WEEKLY_LOGS',
        required: false,
        satisfied: true,
        detail: null,
        unmetCode: 'WEEKLY_LOGS_INCOMPLETE',
      },
      {
        type: 'ATTENDANCE',
        required: false,
        satisfied: true,
        detail: null,
        unmetCode: 'ATTENDANCE_INCOMPLETE',
      },
      {
        type: 'ORGANIZATION_EVALUATION',
        required: false,
        satisfied: true,
        detail: null,
        unmetCode: 'ORGANIZATION_EVALUATION_INCOMPLETE',
      },
      {
        type: 'DEFENSE',
        required: false,
        satisfied: true,
        detail: null,
        unmetCode: 'DEFENSE_NOT_PASSED',
      },
    ],
  }
}

function stubFetch(status: CompletionStatusResponse, onComplete?: () => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST' && url.endsWith('/complete')) {
      return onComplete ? onComplete() : jsonResponse(placement('COMPLETED'))
    }
    if (url.endsWith('/completion')) {
      return jsonResponse(status)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPanel(canComplete: boolean, target = placement()) {
  return render(
    <MemoryRouter>
      <AppProviders>
        <CompletionPanel placement={target} canComplete={canComplete} />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('CompletionPanel', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('shows the checklist without an action to a viewer who cannot complete', async () => {
    stubFetch(completionStatus(false))
    renderPanel(false)

    expect(await screen.findByText('Final report approved')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete internship' })).not.toBeInTheDocument()
  })

  it('disables the action while a requirement is outstanding and says why', async () => {
    stubFetch(completionStatus(false))
    renderPanel(true)

    const button = await screen.findByRole('button', { name: 'Complete internship' })
    expect(button).toBeDisabled()
    expect(screen.getByText('Every requirement above must be completed first.')).toBeInTheDocument()
  })

  it('enables the action once every enabled requirement is satisfied', async () => {
    stubFetch(completionStatus(true))
    renderPanel(true)

    expect(await screen.findByRole('button', { name: 'Complete internship' })).toBeEnabled()
    expect(screen.getByText('Ready to complete')).toBeInTheDocument()
  })

  it('lists every unmet requirement from the error codes, not from the message', async () => {
    stubFetch(completionStatus(true), () =>
      jsonResponse(
        {
          code: 'PLACEMENT_COMPLETION_REQUIREMENTS_NOT_MET',
          message: 'Server-side English that the UI must not display.',
          status: 409,
          path: '/api/v1/placements/pl-1/complete',
          timestamp: '2026-12-20T00:00:00Z',
          fieldErrors: [
            { field: 'FINAL_REPORT', code: 'FINAL_REPORT_NOT_APPROVED', message: '...' },
            { field: 'DEFENSE', code: 'DEFENSE_NOT_PASSED', message: '...' },
          ],
        },
        409,
      ),
    )
    renderPanel(true)

    await userEvent.click(await screen.findByRole('button', { name: 'Complete internship' }))

    // Both are reported at once, so the user is never sent away to fix one thing at a time.
    expect(await screen.findByText('The final report must be approved.')).toBeInTheDocument()
    expect(screen.getByText('A defense must be passed.')).toBeInTheDocument()
    expect(
      screen.queryByText('Server-side English that the UI must not display.'),
    ).not.toBeInTheDocument()
  })

  it('offers no action on a placement that is not awaiting completion', async () => {
    stubFetch(completionStatus(true))
    renderPanel(true, placement('ACTIVE'))

    await screen.findByText('Final report approved')
    expect(screen.queryByRole('button', { name: 'Complete internship' })).not.toBeInTheDocument()
  })

  it('shows a settled completed state rather than a repeating animation', async () => {
    stubFetch(completionStatus(true))
    renderPanel(true, placement('COMPLETED'))

    // The one-time confirmation plays only for the viewer who performed the transition; anyone
    // arriving afterwards sees the stable state.
    expect(await screen.findByText('This internship is complete.')).toBeInTheDocument()
    expect(screen.queryByText('Internship completed successfully')).not.toBeInTheDocument()
  })

  it('renders in Somali when the language is Somali', async () => {
    await i18n.changeLanguage('so')
    stubFetch(completionStatus(false))
    renderPanel(true)

    expect(await screen.findByText('Dhammaystirka tababarka')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dhammaystir tababarka' })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
