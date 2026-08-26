import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { WeeklyLogsPage } from '../../../src/features/weekly-logs/pages/WeeklyLogsPage'
import i18n from '../../../src/lib/i18n'
import type { WeeklyLogResponse } from '../../../src/features/weekly-logs/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function log(overrides: Partial<WeeklyLogResponse> = {}): WeeklyLogResponse {
  return {
    id: 'log-1',
    placementId: 'pl-1',
    weekNumber: 1,
    periodStart: '2026-10-01',
    periodEnd: '2026-10-07',
    summary: 'Set up the development environment.',
    activities: null,
    challenges: null,
    learningOutcomes: null,
    state: 'DRAFT',
    submittedAt: null,
    reviewedAt: null,
    reviewComment: null,
    editable: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

interface StubOptions {
  logs?: WeeklyLogResponse[]
  expectedWeeks?: number
  onCommand?: (url: string) => Promise<Response>
}

function stubFetch({ logs = [], expectedWeeks = 12, onCommand }: StubOptions = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url) : jsonResponse(logs[0] ?? log())
    }
    if (url.includes('expected-weeks')) {
      return jsonResponse({ expectedWeekCount: expectedWeeks })
    }
    if (url.includes('/weekly-logs')) {
      return jsonResponse(logs)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(audience: 'student' | 'reviewer') {
  return render(
    <MemoryRouter initialEntries={['/student/placements/pl-1/weekly-logs']}>
      <AppProviders>
        <Routes>
          <Route
            path="/student/placements/:placementId/weekly-logs"
            element={<WeeklyLogsPage audience={audience} />}
          />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('WeeklyLogsPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('tells a student with no logs yet what to expect', async () => {
    stubFetch()
    renderPage('student')

    expect(await screen.findByText('You have not written any weekly logs yet.')).toBeInTheDocument()
  })

  it('offers only the weeks this internship actually has', async () => {
    stubFetch({ logs: [log({ weekNumber: 1 })], expectedWeeks: 3 })
    renderPage('student')

    await userEvent.click(await screen.findByRole('button', { name: 'Add a weekly log' }))

    const select = screen.getByLabelText('Week')
    // Week 1 already has a log, so only the remaining weeks of a three-week internship are offered.
    expect(select).toHaveDisplayValue('Week 2')
    expect(screen.getByRole('option', { name: 'Week 3' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Week 4' })).not.toBeInTheDocument()
  })

  it('requires a summary before it will send anything', async () => {
    const fetchMock = stubFetch({ expectedWeeks: 2 })
    renderPage('student')

    await userEvent.click(await screen.findByRole('button', { name: 'Add a weekly log' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create log' }))

    expect(await screen.findByText('Write a short summary of your week.')).toBeInTheDocument()
    // Nothing was sent. (The auth refresh the app makes on start is a POST too, so this filters on
    // the weekly-log route rather than on the method alone.)
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => init?.method === 'POST' && String(url).endsWith('/weekly-logs'),
      ),
    ).toHaveLength(0)
  })

  it('shows the supervisor feedback on a returned log and lets the student edit it', async () => {
    stubFetch({
      logs: [
        log({
          state: 'RETURNED_FOR_CHANGES',
          editable: true,
          reviewComment: 'Add detail on what you built.',
        }),
      ],
    })
    renderPage('student')

    expect(
      await screen.findByText('Supervisor feedback: Add detail on what you built.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Changes requested')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeInTheDocument()
  })

  it('gives a student no review controls, even on their own submitted log', async () => {
    stubFetch({ logs: [log({ state: 'SUBMITTED', editable: false })] })
    renderPage('student')

    await screen.findByText('Awaiting review')
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument()
  })

  it('lets a reviewer review a submitted log', async () => {
    const fetchMock = stubFetch({ logs: [log({ state: 'SUBMITTED', editable: false })] })
    renderPage('reviewer')

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }))

    await waitFor(() => {
      const reviewCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/review'))
      expect(reviewCall).toBeDefined()
    })
  })

  it('will not send a return without an explanation', async () => {
    const fetchMock = stubFetch({ logs: [log({ state: 'SUBMITTED', editable: false })] })
    renderPage('reviewer')

    await userEvent.click(await screen.findByRole('button', { name: 'Request changes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send back to student' }))

    expect(await screen.findByText('Explain what the student needs to change.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/return'))).toHaveLength(0)
  })

  it('renders a machine-readable duplicate-week error as translated copy', async () => {
    stubFetch({
      expectedWeeks: 4,
      onCommand: () =>
        jsonResponse(
          {
            code: 'WEEKLY_LOG_ALREADY_EXISTS',
            message: 'A log for that week already exists.',
            status: 409,
            path: '/api/v1/placements/pl-1/weekly-logs',
            timestamp: '2026-10-01T00:00:00Z',
            fieldErrors: [],
          },
          409,
        ),
    })
    renderPage('student')

    await userEvent.click(await screen.findByRole('button', { name: 'Add a weekly log' }))
    await userEvent.type(screen.getByLabelText('Summary of the week'), 'A productive week.')
    await userEvent.click(screen.getByRole('button', { name: 'Create log' }))

    // Keyed off the stable code, never the English message.
    expect(await screen.findByText('A log for that week already exists.')).toBeInTheDocument()
  })

  it('renders in Somali when the language is Somali', async () => {
    await i18n.changeLanguage('so')
    stubFetch({ logs: [log({ state: 'REVIEWED', editable: false })] })
    renderPage('student')

    expect(await screen.findByText('Diiwaanka toddobaadka')).toBeInTheDocument()
    expect(screen.getByText('La eegay')).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
