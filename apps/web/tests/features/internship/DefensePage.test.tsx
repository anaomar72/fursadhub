import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { DefensePage } from '../../../src/features/defense/pages/DefensePage'
import i18n from '../../../src/lib/i18n'
import type { DefenseAttemptResponse } from '../../../src/features/defense/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function attempt(overrides: Partial<DefenseAttemptResponse> = {}): DefenseAttemptResponse {
  return {
    id: 'df-1',
    placementId: 'pl-1',
    attemptNumber: 1,
    scheduledAt: '2027-01-15T09:00:00Z',
    locationDetails: 'Main hall',
    state: 'SCHEDULED',
    result: null,
    panelNotes: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: '2027-01-01T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(attempts: DefenseAttemptResponse[]) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST' && url.includes('defense')) {
      return jsonResponse(attempts[0] ?? attempt())
    }
    if (url.includes('/defense-attempts')) {
      return jsonResponse(attempts)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(audience: 'university' | 'student') {
  return render(
    <MemoryRouter initialEntries={['/university/placements/pl-1/defense']}>
      <AppProviders>
        <Routes>
          <Route
            path="/university/placements/:placementId/defense"
            element={<DefensePage audience={audience} />}
          />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('DefensePage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('renders every previous attempt, not just the latest one', async () => {
    stubFetch([
      attempt({ id: 'df-1', attemptNumber: 1, state: 'COMPLETED', result: 'RETAKE_REQUIRED' }),
      attempt({ id: 'df-2', attemptNumber: 2, state: 'COMPLETED', result: 'PASSED' }),
    ])
    renderPage('student')

    // History is the whole point of the model: a retake never overwrites the attempt before it.
    expect(await screen.findByText('Attempt 1')).toBeInTheDocument()
    expect(screen.getByText('Attempt 2')).toBeInTheDocument()
    expect(screen.getByText('Retake required')).toBeInTheDocument()
    expect(screen.getByText('Passed')).toBeInTheDocument()
  })

  it('shows a cancelled attempt rather than hiding it', async () => {
    stubFetch([
      attempt({ id: 'df-1', attemptNumber: 1, state: 'CANCELLED', cancelledAt: '2027-01-10T00:00:00Z' }),
    ])
    renderPage('student')

    expect(await screen.findByText('Attempt 1')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('gives a student no scheduling or result controls', async () => {
    stubFetch([attempt()])
    renderPage('student')

    await screen.findByText('Attempt 1')
    expect(screen.queryByRole('button', { name: 'Schedule defense' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record result' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel this attempt' })).not.toBeInTheDocument()
  })

  it('does not offer a second attempt while one is still scheduled', async () => {
    stubFetch([attempt({ state: 'SCHEDULED' })])
    renderPage('university')

    await screen.findByText('Attempt 1')
    expect(screen.queryByRole('button', { name: 'Schedule a retake' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record result' })).toBeInTheDocument()
  })

  it('offers a retake once the previous attempt is closed, and says the old one is kept', async () => {
    stubFetch([attempt({ state: 'COMPLETED', result: 'RETAKE_REQUIRED' })])
    renderPage('university')

    expect(await screen.findByRole('button', { name: 'Schedule a retake' })).toBeInTheDocument()
    expect(screen.getByText('Every attempt is kept, including previous ones.')).toBeInTheDocument()
  })

  it('sends the scheduled time as an absolute instant', async () => {
    const fetchMock = stubFetch([])
    renderPage('university')

    await userEvent.click(await screen.findByRole('button', { name: 'Schedule defense' }))
    await userEvent.type(screen.getByLabelText('Date and time'), '2027-01-15T09:00')
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))

    const call = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).endsWith('/defense-attempts'),
    )
    expect(call).toBeDefined()
    const body = JSON.parse(String(call![1]?.body))
    // A wall-clock string would be ambiguous; the backend stores an Instant in UTC.
    expect(body.scheduledAt).toMatch(/Z$/)
  })

  it('warns that recording a retake completes this attempt', async () => {
    stubFetch([attempt()])
    renderPage('university')

    await userEvent.click(await screen.findByRole('button', { name: 'Record result' }))

    expect(
      screen.getByText(
        'Recording a retake completes this attempt. Schedule a new one afterwards; this one is kept as it is.',
      ),
    ).toBeInTheDocument()
  })

  it('renders in Somali when the language is Somali', async () => {
    await i18n.changeLanguage('so')
    stubFetch([attempt({ state: 'COMPLETED', result: 'PASSED' })])
    renderPage('student')

    expect(await screen.findByText('Difaaca')).toBeInTheDocument()
    expect(screen.getByText('Wuu gudbay')).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
