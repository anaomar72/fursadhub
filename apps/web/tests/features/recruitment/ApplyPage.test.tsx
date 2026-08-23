import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { ApplyPage } from '../../../src/features/recruitment/pages/ApplyPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const opportunity = {
  id: 'opp-1',
  organization: { id: 'org-1', name: 'Hormuud', slug: 'hormuud', type: 'COMPANY' },
  title: 'Backend Intern',
  description: 'Work on the FursadHub API.',
  responsibilities: null,
  requirements: null,
  mode: 'PUBLIC',
  numberOfOpenings: 3,
  workMode: 'ONSITE',
  location: 'Mogadishu',
  startDate: '2027-03-01',
  endDate: '2027-06-01',
  applicationDeadline: '2027-02-01',
  publishedAt: '2026-08-01T00:00:00Z',
}

const questions = [
  { id: 'q1', prompt: 'Why this internship?', type: 'SHORT_TEXT', required: true, position: 0, choices: [] },
  {
    id: 'q2',
    prompt: 'Preferred track?',
    type: 'SINGLE_CHOICE',
    required: true,
    position: 1,
    choices: ['Backend', 'Frontend'],
  },
  { id: 'q3', prompt: 'Anything else?', type: 'LONG_TEXT', required: false, position: 2, choices: [] },
]

/** Routes GETs to the opportunity/questions endpoints and POSTs to the given application handler. */
function stubFetch(applicationHandler: (body: unknown) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/screening-questions')) {
      return jsonResponse(questions)
    }
    if (init?.method === 'POST' && url.includes('/applications')) {
      return applicationHandler(init.body ? JSON.parse(String(init.body)) : null)
    }
    return jsonResponse(opportunity)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * Finds the application POST specifically. AppProviders mounts AuthProvider, which fires its own
 * `POST /auth/refresh` on mount, so matching on method alone would pick up that call instead.
 */
function applicationPostCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    ([input, init]) =>
      (init as RequestInit | undefined)?.method === 'POST' && String(input).includes('/applications'),
  )
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/student/opportunities/opp-1/apply']}>
      <AppProviders>
        <Routes>
          <Route path="/student/opportunities/:opportunityId/apply" element={<ApplyPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('ApplyPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  it('renders the screening questions for the opportunity', async () => {
    stubFetch(() => jsonResponse({}, 201))
    renderPage()

    expect(await screen.findByText(/why this internship\?/i)).toBeInTheDocument()
    expect(screen.getByText(/preferred track\?/i)).toBeInTheDocument()
    // Single-choice questions render their allowed choices, not a free-text box.
    expect(screen.getByRole('option', { name: 'Backend' })).toBeInTheDocument()
  })

  it('blocks submission and shows an error when a required answer is missing', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch(() => jsonResponse({}, 201))
    renderPage()

    await screen.findByText(/why this internship\?/i)
    await user.click(screen.getByRole('button', { name: /submit application/i }))

    expect(await screen.findAllByText(/this question requires an answer/i)).toHaveLength(2)
    expect(applicationPostCalls(fetchMock)).toHaveLength(0)
  })

  it('submits answers without any student identifier in the payload', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch(() => jsonResponse({ id: 'cand-1', source: 'SELF_APPLICATION', status: 'SUBMITTED' }, 201))
    renderPage()

    await screen.findByText(/why this internship\?/i)
    await user.type(screen.getByLabelText(/why this internship/i), 'To learn.')
    await user.selectOptions(screen.getByLabelText(/preferred track/i), 'Backend')
    await user.click(screen.getByRole('button', { name: /submit application/i }))

    await waitFor(() => {
      expect(applicationPostCalls(fetchMock)).toHaveLength(1)
    })

    const body = JSON.parse(String((applicationPostCalls(fetchMock)[0][1] as RequestInit).body))

    expect(body.answers).toEqual([
      { questionId: 'q1', answer: 'To learn.' },
      { questionId: 'q2', answer: 'Backend' },
    ])
    // The applicant comes from the session — the UI must never send a student id.
    expect(JSON.stringify(body)).not.toMatch(/studentId|studentUserId/)
  })

  it('shows a one-time success confirmation after submitting', async () => {
    const user = userEvent.setup()
    stubFetch(() => jsonResponse({ id: 'cand-1', source: 'SELF_APPLICATION', status: 'SUBMITTED' }, 201))
    renderPage()

    await screen.findByText(/why this internship\?/i)
    await user.type(screen.getByLabelText(/why this internship/i), 'To learn.')
    await user.selectOptions(screen.getByLabelText(/preferred track/i), 'Backend')
    await user.click(screen.getByRole('button', { name: /submit application/i }))

    expect(await screen.findByText(/application submitted/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit application/i })).not.toBeInTheDocument()
  })

  it('renders the backend error code, not a parsed English message', async () => {
    const user = userEvent.setup()
    stubFetch(() =>
      jsonResponse(
        {
          code: 'STUDENT_NOT_VERIFIED',
          message: 'raw backend text that must not be shown',
          status: 403,
          path: '/api/v1/opportunities/opp-1/applications',
          timestamp: '2026-08-22T00:00:00Z',
          fieldErrors: [],
        },
        403,
      ),
    )
    renderPage()

    await screen.findByText(/why this internship\?/i)
    await user.type(screen.getByLabelText(/why this internship/i), 'To learn.')
    await user.selectOptions(screen.getByLabelText(/preferred track/i), 'Backend')
    await user.click(screen.getByRole('button', { name: /submit application/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /your university enrollment must be verified/i,
    )
    expect(screen.queryByText(/raw backend text/i)).not.toBeInTheDocument()
  })

  it('renders Somali translations when the language is Somali', async () => {
    stubFetch(() => jsonResponse({}, 201))
    await i18n.changeLanguage('so')

    renderPage()

    expect(await screen.findByRole('button', { name: /gudbi codsiga/i })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
