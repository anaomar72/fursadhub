import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CandidateDetailPage } from '../../../src/features/recruitment/pages/CandidateDetailPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const candidate = {
  candidacyId: 'cand-1',
  opportunityId: 'opp-1',
  studentUserId: 'stu-1',
  studentEmail: 'amina@example.test',
  studentFullName: 'Amina Yusuf',
  source: 'BOTH',
  status: 'SHORTLISTED',
  createdAt: '2026-08-01T00:00:00Z',
  answers: [{ questionId: 'q1', answer: 'I want to learn backend engineering.' }],
  offers: [],
  history: [],
}

function stubFetch(detail: unknown, postHandler?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST' && url.includes('/candidacies/')) {
      return postHandler ? postHandler(url) : jsonResponse({ id: 'cand-1', status: 'OFFERED' })
    }
    if (url.includes('/candidacies/cand-1')) {
      return jsonResponse(detail)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/organization/candidacies/cand-1']}>
      <AppProviders>
        <Routes>
          <Route path="/organization/candidacies/:candidacyId" element={<CandidateDetailPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('CandidateDetailPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  it('shows the candidate, their merged source and screening answers', async () => {
    stubFetch(candidate)
    renderPage()

    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument()
    expect(screen.getByText('Applied and nominated')).toBeInTheDocument()
    expect(screen.getByText(/i want to learn backend engineering/i)).toBeInTheDocument()
  })

  /** Commands are explicit business actions — there is deliberately no status dropdown. */
  it('offers only the stage commands valid from the current status', async () => {
    stubFetch(candidate)
    renderPage()

    await screen.findByText('Amina Yusuf')

    expect(screen.getByRole('button', { name: /move to interview/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
    // Already shortlisted, so moving back to review/shortlist is not offered.
    expect(screen.queryByRole('button', { name: /move to review/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /status/i })).not.toBeInTheDocument()
  })

  it('rejects an offer whose end date precedes the start date', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch(candidate)
    renderPage()

    await screen.findByText('Amina Yusuf')
    await user.type(screen.getByLabelText(/start date/i), '2027-06-01')
    await user.type(screen.getByLabelText(/end date/i), '2027-03-01')
    await user.type(screen.getByLabelText(/respond by/i), '2027-02-01')
    await user.click(screen.getByRole('button', { name: /send offer/i }))

    expect(await screen.findByText(/end date must be after the start date/i)).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/offer'))).toHaveLength(0)
  })

  it('rejects a response deadline after the start date', async () => {
    const user = userEvent.setup()
    stubFetch(candidate)
    renderPage()

    await screen.findByText('Amina Yusuf')
    await user.type(screen.getByLabelText(/start date/i), '2027-03-01')
    await user.type(screen.getByLabelText(/end date/i), '2027-06-01')
    await user.type(screen.getByLabelText(/respond by/i), '2027-04-01')
    await user.click(screen.getByRole('button', { name: /send offer/i }))

    expect(await screen.findByText(/deadline must not be after the start date/i)).toBeInTheDocument()
  })

  it('sends a valid offer', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch(candidate)
    renderPage()

    await screen.findByText('Amina Yusuf')
    await user.type(screen.getByLabelText(/start date/i), '2027-03-01')
    await user.type(screen.getByLabelText(/end date/i), '2027-06-01')
    await user.type(screen.getByLabelText(/respond by/i), '2027-02-15')
    await user.click(screen.getByRole('button', { name: /send offer/i }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/candidacies/cand-1/offer'))).toHaveLength(1)
    })
  })

  it('renders a backend conflict from its error code', async () => {
    const user = userEvent.setup()
    stubFetch(candidate, (url) =>
      url.endsWith('/offer')
        ? jsonResponse(
            {
              code: 'OFFER_ALREADY_EXISTS',
              message: 'raw backend text',
              status: 409,
              path: '/api/v1/candidacies/cand-1/offer',
              timestamp: '2026-08-22T00:00:00Z',
              fieldErrors: [],
            },
            409,
          )
        : jsonResponse({}),
    )
    renderPage()

    await screen.findByText('Amina Yusuf')
    await user.type(screen.getByLabelText(/start date/i), '2027-03-01')
    await user.type(screen.getByLabelText(/end date/i), '2027-06-01')
    await user.type(screen.getByLabelText(/respond by/i), '2027-02-15')
    await user.click(screen.getByRole('button', { name: /send offer/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already has an outstanding offer/i)
  })

  it('renders Somali translations when the language is Somali', async () => {
    stubFetch(candidate)
    await i18n.changeLanguage('so')

    renderPage()

    expect(await screen.findByRole('button', { name: /dir dalabka/i })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
