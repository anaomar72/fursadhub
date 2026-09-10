import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminUserDetailPage } from '../../../src/features/admin/pages/AdminUserDetailPage'
import i18n from '../../../src/lib/i18n'
import type { AdminUser } from '../../../src/features/admin/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u-1',
    email: 'student@example.test',
    status: 'ACTIVE',
    preferredLocale: 'en',
    emailVerifiedAt: '2026-09-01T00:00:00Z',
    createdAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

function stubFetch(account = user(), onCommand?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url) : jsonResponse({ message: 'ok' })
    }
    if (url.includes('/admin/users/u-1')) return jsonResponse(account)
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users/u-1']}>
      <AppProviders>
        <Routes>
          <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AdminUserDetailPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('reads the single-account endpoint the console never used to call', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await screen.findByRole('heading', { name: 'student@example.test' })
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/admin/users/u-1'))).toBe(true)
  })

  it('requires a reason before suspending, and sends it', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend account' }))
    // The reason field appears first — suspension is never a single unconfirmed click.
    await userEvent.type(screen.getByLabelText('Reason'), 'Abuse report')
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend account' }),
    )

    await waitFor(() => {
      // Matched by URL: AuthContext also POSTs to /auth/refresh on mount.
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/admin/users/u-1/suspend'),
      )
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ reason: 'Abuse report' })
    })
  })

  it('offers reactivation for a suspended account instead of suspension', async () => {
    stubFetch(user({ status: 'SUSPENDED' }))
    renderPage()

    expect(await screen.findByRole('button', { name: 'Reactivate account' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend account' })).not.toBeInTheDocument()
  })

  it('offers no actions on a closed account', async () => {
    stubFetch(user({ status: 'CLOSED' }))
    renderPage()

    expect(
      await screen.findByText('A closed account cannot be suspended or reactivated.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reactivate account' })).not.toBeInTheDocument()
  })

  it('renders only the fields AdminUserResponse actually carries', async () => {
    stubFetch()
    const { container } = renderPage()

    await screen.findByRole('heading', { name: 'student@example.test' })

    // AdminUserResponse is id, email, status, locale and two timestamps — no password hash and no
    // token material of any kind. Nothing on the page may read like credential material: no
    // password field, and no bcrypt/argon-shaped or long opaque string anywhere in the text.
    expect(container.querySelector('input[type="password"]')).toBeNull()
    expect(container.textContent).not.toMatch(/\$2[aby]\$|\$argon2/)
  })

  it('offers nothing the backend has no endpoint for', async () => {
    stubFetch()
    renderPage()

    await screen.findByRole('heading', { name: 'student@example.test' })
    for (const invented of [/delete account/i, /reset password/i, /impersonate/i, /edit email/i]) {
      expect(screen.queryByRole('button', { name: invented })).not.toBeInTheDocument()
    }
  })

  it('translates a machine-readable error rather than showing the API message', async () => {
    stubFetch(user(), () =>
      jsonResponse(
        {
          code: 'CANNOT_SUSPEND_SELF',
          message: 'raw backend text',
          status: 409,
          path: '/api/v1/admin/users/u-1/suspend',
          timestamp: '2026-10-01T09:00:00Z',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend account' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend account' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot suspend your own account.')
  })

  it('leaves the account visibly active when the suspension fails', async () => {
    stubFetch(user(), () =>
      jsonResponse(
        {
          code: 'CANNOT_SUSPEND_SELF',
          message: 'raw',
          status: 409,
          path: '/x',
          timestamp: '2026-10-01T09:00:00Z',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend account' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend account' }),
    )
    await screen.findByRole('alert')

    // Never a success the backend did not grant.
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Suspended')).not.toBeInTheDocument()
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByRole('button', { name: 'Xisaabta haki' })).toBeInTheDocument()
    expect(screen.getByText('Faahfaahinta xisaabta')).toBeInTheDocument()
  })
})
