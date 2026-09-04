import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AccountProfilePage } from '../../../src/features/account/pages/AccountProfilePage'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function stubFetch(options: { meFails?: boolean } = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/me')) {
      if (options.meFails) {
        return jsonResponse(
          { code: 'ACCESS_DENIED', message: 'x', status: 403, path: '/me', timestamp: '', fieldErrors: [] },
          403,
        )
      }
      return jsonResponse({ id: 'u-1', email: 'student@example.test', hasAvatar: false })
    }
    return jsonResponse({ message: 'ok' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <AccountProfilePage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AccountProfilePage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('shows the account it loaded', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('student@example.test')).toBeInTheDocument()
  })

  it('confirms before ending every session', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out everywhere' }))

    // Nothing is sent until the dialog is confirmed.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/auth/logout-all'))).toBe(false)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls the real logout-all endpoint on confirmation', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out everywhere' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Sign out everywhere' }),
    )

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/auth/logout-all'))
      expect(call).toBeDefined()
      expect((call![1] as RequestInit).method).toBe('POST')
    })
  })

  it('shows an error state rather than a blank page when the account cannot be read', async () => {
    stubFetch({ meFails: true })
    renderPage()

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByRole('button', { name: 'Meel kasta ka bax' })).toBeInTheDocument()
  })
})
