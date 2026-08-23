import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { MyNominationsPage } from '../../../src/features/recruitment/pages/MyNominationsPage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

const pendingNomination = {
  id: 'nom-1',
  opportunityId: 'opp-1',
  opportunityTitle: 'Backend Intern',
  organizationName: 'Hormuud',
  status: 'PENDING_STUDENT_CONSENT',
  note: 'You are a strong fit.',
  createdAt: '2026-08-01T00:00:00Z',
  respondedAt: null,
}

const declinedNomination = {
  ...pendingNomination,
  id: 'nom-2',
  opportunityTitle: 'Data Intern',
  status: 'DECLINED',
  note: null,
  respondedAt: '2026-08-02T00:00:00Z',
}

function stubFetch(nominations: unknown[], consentHandler?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST' && (url.includes('/accept') || url.includes('/decline'))) {
      return consentHandler ? consentHandler(url) : jsonResponse({ id: 'cand-1' })
    }
    if (url.includes('/students/me/nominations')) {
      return jsonResponse(nominations)
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <MyNominationsPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('MyNominationsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.unstubAllGlobals()
  })

  it('shows pending nominations with the consent explainer', async () => {
    stubFetch([pendingNomination])
    renderPage()

    expect(await screen.findByText('Backend Intern')).toBeInTheDocument()
    // The student must understand that consent is what exposes them to the organization.
    expect(screen.getByText(/will not see your details until you accept/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept nomination/i })).toBeInTheDocument()
  })

  it('separates resolved nominations from ones needing consent', async () => {
    stubFetch([pendingNomination, declinedNomination])
    renderPage()

    await screen.findByText('Backend Intern')
    expect(screen.getByText(/awaiting your consent/i)).toBeInTheDocument()
    expect(screen.getByText(/past nominations/i)).toBeInTheDocument()
    expect(screen.getByText('Declined')).toBeInTheDocument()
  })

  it('accepts a nomination and shows the one-time confirmation', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch([pendingNomination])
    renderPage()

    await screen.findByText('Backend Intern')
    await user.click(screen.getByRole('button', { name: /accept nomination/i }))

    expect(await screen.findByText(/nomination accepted/i)).toBeInTheDocument()

    const acceptCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/nominations/nom-1/accept'))
    expect(acceptCall).toBeDefined()
    // No student id is ever sent — the backend derives it from the session.
    expect((acceptCall![1] as RequestInit | undefined)?.body).toBeUndefined()
  })

  it('disables both buttons while a consent request is in flight', async () => {
    const user = userEvent.setup()
    let release: (value: Response) => void = () => {}
    stubFetch([pendingNomination], () => new Promise<Response>((resolve) => (release = resolve)))
    renderPage()

    await screen.findByText('Backend Intern')
    await user.click(screen.getByRole('button', { name: /accept nomination/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /decline/i })).toBeDisabled()
    })
    expect(screen.getByRole('button', { name: /accept nomination/i })).toBeDisabled()

    release(new Response(JSON.stringify({ id: 'cand-1' }), { status: 200 }))
  })

  it('renders a backend error code as translated copy', async () => {
    const user = userEvent.setup()
    stubFetch([pendingNomination], () =>
      jsonResponse(
        {
          code: 'NOMINATION_ALREADY_RESOLVED',
          message: 'raw backend text',
          status: 409,
          path: '/api/v1/nominations/nom-1/accept',
          timestamp: '2026-08-22T00:00:00Z',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderPage()

    await screen.findByText('Backend Intern')
    await user.click(screen.getByRole('button', { name: /accept nomination/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already responded to this nomination/i)
  })

  it('renders Somali translations when the language is Somali', async () => {
    stubFetch([pendingNomination])
    await i18n.changeLanguage('so')

    renderPage()

    expect(await screen.findByRole('button', { name: /aqbal magacaabista/i })).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
