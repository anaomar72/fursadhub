import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { CandidacyDetailPage } from '../../../src/features/recruitment/pages/CandidacyDetailPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const pendingOffer = {
  id: 'offer-1',
  candidacyId: 'cand-1',
  startDate: '2027-03-01',
  endDate: '2027-06-01',
  responseDeadline: '2027-02-15',
  location: 'Mogadishu',
  details: 'Full-time internship.',
  status: 'PENDING',
  createdAt: '2026-08-01T00:00:00Z',
  respondedAt: null,
}

const candidacyWithOffer = {
  id: 'cand-1',
  opportunityId: 'opp-1',
  opportunityTitle: 'Backend Intern',
  source: 'SELF_APPLICATION',
  status: 'OFFERED',
  createdAt: '2026-08-01T00:00:00Z',
  liveOffer: pendingOffer,
}

const acceptedResponse = {
  offer: { ...pendingOffer, status: 'ACCEPTED' },
  candidacy: { ...candidacyWithOffer, status: 'ACCEPTED' },
  placement: {
    id: 'place-1',
    status: 'PLANNED',
    startDate: '2027-03-01',
    endDate: '2027-06-01',
    location: 'Mogadishu',
  },
  alreadyAccepted: false,
}

function stubFetch(candidacy: unknown, offerHandler?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST' && url.includes('/offers/')) {
      return offerHandler ? offerHandler(url) : jsonResponse(acceptedResponse)
    }
    if (url.includes('/students/me/candidacies/')) {
      return jsonResponse(candidacy)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/student/applications/cand-1']}>
      <AppProviders>
        <Routes>
          <Route path="/student/applications/:candidacyId" element={<CandidacyDetailPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('CandidacyDetailPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  it('shows the offer terms and both response actions', async () => {
    stubFetch(candidacyWithOffer)
    renderPage()

    expect(await screen.findByText('Backend Intern')).toBeInTheDocument()
    expect(screen.getByText('2027-02-15')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept offer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /decline offer/i })).toBeInTheDocument()
  })

  it('accepts the offer and confirms the placement was created', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch(candidacyWithOffer)
    renderPage()

    await screen.findByText('Backend Intern')
    await user.click(screen.getByRole('button', { name: /accept offer/i }))

    expect(await screen.findByText(/offer accepted/i)).toBeInTheDocument()
    expect(screen.getByText(/placement has been created/i)).toBeInTheDocument()

    const acceptCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/offers/offer-1/accept'))
    expect(acceptCalls).toHaveLength(1)
    // No student id is sent — ownership is proven from the session.
    expect((acceptCalls[0][1] as RequestInit | undefined)?.body).toBeUndefined()
  })

  /** Double-click protection: the accept button must not fire a second request while in flight. */
  it('prevents a second accept request while one is in flight', async () => {
    const user = userEvent.setup()
    let release: (value: Response) => void = () => {}
    const fetchMock = stubFetch(
      candidacyWithOffer,
      () => new Promise<Response>((resolve) => (release = resolve)),
    )
    renderPage()

    await screen.findByText('Backend Intern')
    const acceptButton = screen.getByRole('button', { name: /accept offer/i })

    await user.click(acceptButton)
    await waitFor(() => expect(acceptButton).toBeDisabled())
    await user.click(acceptButton)

    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/accept'))).toHaveLength(1)
    // Declining is blocked too, so the two actions cannot race each other.
    expect(screen.getByRole('button', { name: /decline offer/i })).toBeDisabled()

    release(new Response(JSON.stringify(acceptedResponse), { status: 200 }))
  })

  it('renders an expired-offer error from its backend code', async () => {
    const user = userEvent.setup()
    stubFetch(candidacyWithOffer, () =>
      jsonResponse(
        {
          code: 'OFFER_NOT_PENDING',
          message: 'raw backend text',
          status: 409,
          path: '/api/v1/offers/offer-1/accept',
          timestamp: '2026-08-22T00:00:00Z',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderPage()

    await screen.findByText('Backend Intern')
    await user.click(screen.getByRole('button', { name: /accept offer/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer awaiting a response/i)
    expect(screen.queryByText(/raw backend text/i)).not.toBeInTheDocument()
  })

  it('offers no withdraw action once the candidacy is accepted', async () => {
    stubFetch({ ...candidacyWithOffer, status: 'ACCEPTED', liveOffer: { ...pendingOffer, status: 'ACCEPTED' } })
    renderPage()

    await screen.findByText('Backend Intern')
    expect(screen.queryByRole('button', { name: /withdraw application/i })).not.toBeInTheDocument()
  })

  it('offers a withdraw action while the candidacy is still open', async () => {
    stubFetch({ ...candidacyWithOffer, status: 'SUBMITTED', liveOffer: null })
    renderPage()

    await screen.findByText('Backend Intern')
    expect(screen.getByRole('button', { name: /withdraw application/i })).toBeInTheDocument()
  })

  it('renders Somali translations when the language is Somali', async () => {
    stubFetch(candidacyWithOffer)
    await i18n.changeLanguage('so')

    renderPage()

    expect(await screen.findByRole('button', { name: /aqbal dalabka/i })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
