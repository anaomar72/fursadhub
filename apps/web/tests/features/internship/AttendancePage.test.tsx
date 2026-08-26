import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AttendancePage } from '../../../src/features/attendance/pages/AttendancePage'
import i18n from '../../../src/lib/i18n'
import type { AttendanceResponse } from '../../../src/features/attendance/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function record(overrides: Partial<AttendanceResponse> = {}): AttendanceResponse {
  return {
    id: 'att-1',
    placementId: 'pl-1',
    attendanceDate: '2026-10-05',
    attendanceValue: 'PRESENT',
    confirmationStatus: 'RECORDED',
    notes: null,
    disputeReason: null,
    resolutionNote: null,
    confirmedAt: null,
    disputedAt: null,
    resolvedAt: null,
    createdAt: '2026-10-05T00:00:00Z',
    updatedAt: '2026-10-05T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(records: AttendanceResponse[], onCommand?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST' && url.includes('attendance')) {
      return onCommand ? onCommand(url) : jsonResponse(records[0] ?? record())
    }
    if (url.includes('/attendance')) {
      return jsonResponse(records)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(audience: 'supervisor' | 'student' | 'observer') {
  return render(
    <MemoryRouter initialEntries={['/organization/placements/pl-1/attendance']}>
      <AppProviders>
        <Routes>
          <Route
            path="/organization/placements/:placementId/attendance"
            element={<AttendancePage audience={audience} />}
          />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AttendancePage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('offers the recording form only to the assigned supervisor', async () => {
    stubFetch([record()])
    renderPage('supervisor')

    expect(await screen.findByRole('button', { name: 'Record' })).toBeInTheDocument()
  })

  it('gives a student no recording form and no confirm control', async () => {
    stubFetch([record()])
    renderPage('student')

    await screen.findByText('Awaiting confirmation')
    expect(screen.queryByRole('button', { name: 'Record' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    // The student's one command is to challenge a record.
    expect(screen.getByRole('button', { name: 'Dispute' })).toBeInTheDocument()
  })

  it('lets a student dispute a record that has already been confirmed', async () => {
    stubFetch([record({ confirmationStatus: 'CONFIRMED', confirmedAt: '2026-10-06T00:00:00Z' })])
    renderPage('student')

    // An error is often noticed only after confirmation; an unchallengeable record is not acceptable.
    expect(await screen.findByRole('button', { name: 'Dispute' })).toBeInTheDocument()
  })

  it('will not send a dispute without a reason', async () => {
    const fetchMock = stubFetch([record()])
    renderPage('student')

    await userEvent.click(await screen.findByRole('button', { name: 'Dispute' }))
    expect(screen.getByRole('button', { name: 'Submit dispute' })).toBeDisabled()
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/dispute'))).toHaveLength(0)
  })

  it('keeps the student reason visible after a dispute', async () => {
    stubFetch([
      record({ confirmationStatus: 'DISPUTED', disputeReason: 'I was at the client site.' }),
    ])
    renderPage('supervisor')

    expect(await screen.findByText('Disputed: I was at the client site.')).toBeInTheDocument()
    // A disputed record offers resolution, not a quiet re-confirmation.
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
  })

  it('gives an observer read access with no controls at all', async () => {
    stubFetch([record({ confirmationStatus: 'DISPUTED', disputeReason: 'Wrong day.' })])
    renderPage('observer')

    await screen.findByText('Disputed')
    expect(screen.queryByRole('button', { name: 'Record' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dispute' })).not.toBeInTheDocument()
  })

  it('sends a recorded day with no location or device data', async () => {
    const fetchMock = stubFetch([])
    renderPage('supervisor')

    await userEvent.type(await screen.findByLabelText('Date'), '2026-10-05')
    await userEvent.click(screen.getByRole('button', { name: 'Record' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => init?.method === 'POST' && String(url).endsWith('/attendance'),
      )
      expect(call).toBeDefined()
      const body = JSON.parse(String(call![1]?.body))
      expect(body).toEqual({ attendanceDate: '2026-10-05', attendanceValue: 'PRESENT', notes: null })
    })
  })

  it('translates a duplicate-date conflict from its machine-readable code', async () => {
    stubFetch([], () =>
      jsonResponse(
        {
          code: 'ATTENDANCE_ALREADY_RECORDED',
          message: 'Server-side English that the UI must not display.',
          status: 409,
          path: '/api/v1/placements/pl-1/attendance',
          timestamp: '2026-10-05T00:00:00Z',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderPage('supervisor')

    await userEvent.type(await screen.findByLabelText('Date'), '2026-10-05')
    await userEvent.click(screen.getByRole('button', { name: 'Record' }))

    expect(
      await screen.findByText('Attendance for that date has already been recorded.'),
    ).toBeInTheDocument()
  })

  it('renders in Somali when the language is Somali', async () => {
    await i18n.changeLanguage('so')
    stubFetch([record({ confirmationStatus: 'CONFIRMED' })])
    renderPage('observer')

    expect(await screen.findByRole('heading', { name: 'Xaadirinta' })).toBeInTheDocument()
    expect(screen.getByText('La xaqiijiyay')).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
