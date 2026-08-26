import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { TermsAcceptanceGate } from '../../../src/features/legal/components/TermsAcceptanceGate'
import i18n from '../../../src/lib/i18n'
import type { LegalDocument } from '../../../src/features/legal/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function document(overrides: Partial<LegalDocument> = {}): LegalDocument {
  return {
    id: 'ld-1',
    documentType: 'TERMS',
    version: '2026-01',
    locale: 'en',
    title: 'Terms and Conditions',
    body: null,
    effectiveFrom: '2026-01-01',
    publishedAt: '2026-01-01T00:00:00Z',
    requiresAcceptance: true,
    ...overrides,
  }
}

function stubFetch(outstanding: LegalDocument[], onAccept?: () => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST') {
      return onAccept ? onAccept() : jsonResponse({ message: 'Accepted.' })
    }
    if (url.includes('/me/legal-status')) {
      return jsonResponse({ acceptanceRequired: outstanding.length > 0, outstanding })
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderGate() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <TermsAcceptanceGate>
          <p>Protected content</p>
        </TermsAcceptanceGate>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('TermsAcceptanceGate', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('stays out of the way when nothing is outstanding', async () => {
    stubFetch([])
    renderGate()

    expect(await screen.findByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('prompts for an unaccepted version', async () => {
    stubFetch([document()])
    renderGate()

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByText(/FursadHub has published Terms and Conditions version 2026-01/),
    ).toBeInTheDocument()
  })

  it('accepts the exact document version, not just its type', async () => {
    const fetchMock = stubFetch([document({ id: 'ld-99' })])
    renderGate()

    await userEvent.click(await screen.findByRole('button', { name: 'I accept' }))

    await waitFor(() => {
      // Matched by URL: AuthContext also POSTs to /auth/refresh on mount.
      const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/me/terms-acceptances'))
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ legalDocumentId: 'ld-99' })
    })
  })

  it('says how many more documents are still to come', async () => {
    stubFetch([document(), document({ id: 'ld-2', documentType: 'PRIVACY_POLICY' })])
    renderGate()

    expect(await screen.findByText('There is 1 more document to accept after this one.')).toBeInTheDocument()
  })

  it('fails open when the status call errors, rather than locking the user out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse(
          {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred.',
            status: 500,
            path: '/api/v1/me/legal-status',
            timestamp: '2026-10-01T09:00:00Z',
            fieldErrors: [],
          },
          500,
        ),
      ),
    )
    renderGate()

    // The prompt is a compliance courtesy, not an authorization boundary — an outage must not make
    // FursadHub unusable.
    expect(await screen.findByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch([document()])
    await i18n.changeLanguage('so')
    renderGate()

    expect(await screen.findByRole('button', { name: 'Waan aqbalay' })).toBeInTheDocument()
  })
})
