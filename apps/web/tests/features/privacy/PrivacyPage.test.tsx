import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { PrivacyPage } from '../../../src/features/privacy/pages/PrivacyPage'
import i18n from '../../../src/lib/i18n'
import type { ConsentRecord, PrivacyRequest } from '../../../src/features/privacy/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function consent(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    consentType: 'PRODUCT_UPDATE_EMAIL',
    granted: false,
    grantedAt: null,
    withdrawnAt: null,
    ...overrides,
  }
}

function request(overrides: Partial<PrivacyRequest> = {}): PrivacyRequest {
  return {
    id: 'pr-1',
    requestType: 'ACCESS',
    state: 'SUBMITTED',
    details: 'Please send me a copy of my data.',
    submittedAt: '2026-10-01T09:00:00Z',
    reviewedAt: null,
    resolutionNote: null,
    ...overrides,
  }
}

interface StubOptions {
  consents?: ConsentRecord[]
  requests?: PrivacyRequest[]
  onCommand?: (url: string, init?: RequestInit) => Promise<Response>
}

function stubFetch({ consents = [consent()], requests = [], onCommand }: StubOptions = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url, init) : jsonResponse(consent({ granted: true }))
    }
    if (url.includes('/me/consents')) return jsonResponse(consents)
    if (url.includes('/me/privacy-requests')) return jsonResponse(requests)
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <PrivacyPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('PrivacyPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('states that consent is separate from accepting the Terms', async () => {
    stubFetch()
    renderPage()

    expect(
      await screen.findByText(
        /Accepting the Terms does not grant any of them, and turning one off has no effect/i,
      ),
    ).toBeInTheDocument()
  })

  it('shows an unanswered consent as off rather than assuming it', async () => {
    stubFetch({ consents: [consent({ granted: false })] })
    renderPage()

    const checkbox = await screen.findByRole('checkbox', { name: /Off/i })
    expect(checkbox).not.toBeChecked()
  })

  it('sends a withdrawal when a granted consent is switched off', async () => {
    const fetchMock = stubFetch({ consents: [consent({ granted: true, grantedAt: '2026-09-01T00:00:00Z' })] })
    renderPage()

    await userEvent.click(await screen.findByRole('checkbox'))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/me/consents/PRODUCT_UPDATE_EMAIL'),
      )
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ granted: false })
    })
  })

  it('submits a privacy request without ever sending a user id', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.selectOptions(
      await screen.findByLabelText('What are you asking for?'),
      'ERASURE',
    )
    await userEvent.type(screen.getByLabelText('Tell us more'), 'Please delete my account data.')
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      // Matched on URL *and* method: this path is also fetched with GET to list past requests, and
      // AuthContext separately POSTs to /auth/refresh on mount.
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes('/me/privacy-requests') && (init as RequestInit)?.method === 'POST',
      )
      expect(call).toBeDefined()
      const body = JSON.parse((call![1] as RequestInit).body as string)
      expect(body).toEqual({ requestType: 'ERASURE', details: 'Please delete my account data.' })
      // The subject is the authenticated caller — never something the browser supplies.
      expect(body).not.toHaveProperty('userId')
    })
  })

  it('shows the outcome of a resolved request', async () => {
    stubFetch({
      requests: [
        request({
          state: 'REJECTED',
          resolutionNote: 'Records are tied to an active placement.',
        }),
      ],
    })
    renderPage()

    expect(await screen.findByText('Not accepted')).toBeInTheDocument()
    expect(screen.getByText(/Records are tied to an active placement\./)).toBeInTheDocument()
  })

  it('surfaces a machine-readable API error rather than its raw message', async () => {
    stubFetch({
      onCommand: () =>
        jsonResponse(
          {
            code: 'VALIDATION_FAILED',
            message: 'One or more fields are invalid.',
            status: 400,
            path: '/api/v1/me/privacy-requests',
            timestamp: '2026-10-01T09:00:00Z',
            fieldErrors: [],
          },
          400,
        ),
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Send request' }))

    // Translated from the stable `code`, never the English prose the API happened to return.
    expect(await screen.findByRole('alert')).toHaveTextContent('Please check the details you entered.')
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByText('Doorashooyinkaaga asturnaanta')).toBeInTheDocument()
    expect(screen.getByText('Codsiyada xogtaada')).toBeInTheDocument()
  })
})
