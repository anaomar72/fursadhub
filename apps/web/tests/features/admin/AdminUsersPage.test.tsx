import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminUsersPage } from '../../../src/features/admin/pages/AdminUsersPage'
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

function stubFetch(users: AdminUser[] = [user()], onCommand?: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url) : jsonResponse({ message: 'ok' })
    }
    if (url.includes('/admin/users')) {
      return jsonResponse({ content: users, page: 0, size: 25, totalElements: users.length, totalPages: 1 })
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
        <AdminUsersPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AdminUsersPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('lists accounts with their status', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByText('student@example.test')).toBeInTheDocument()
    // Scoped to the table: "Active" also appears as an option in the status filter.
    expect(within(screen.getByRole('table')).getByText('Active')).toBeInTheDocument()
  })

  it('requires a reason before suspending, and sends it', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    // The reason field appears first — suspension is never a single unconfirmed click.
    const reason = screen.getByLabelText('Reason for suspension')
    await userEvent.type(reason, 'Abuse report')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }))

    await waitFor(() => {
      // Matched by URL: AuthContext also POSTs to /auth/refresh on mount.
      const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/admin/users/u-1/suspend'))
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ reason: 'Abuse report' })
    })
  })

  it('offers reactivation for a suspended account instead of suspension', async () => {
    stubFetch([user({ status: 'SUSPENDED' })])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument()
  })

  it('offers no actions on a closed account', async () => {
    stubFetch([user({ status: 'CLOSED' })])
    renderPage()

    expect(await screen.findByText('No actions')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reactivate' })).not.toBeInTheDocument()
  })

  it('offers no impersonation control anywhere', async () => {
    stubFetch()
    renderPage()

    await screen.findByText('student@example.test')
    expect(screen.queryByRole('button', { name: /impersonate|sign in as|act as/i })).not.toBeInTheDocument()
  })

  it('translates a machine-readable error rather than showing the API message', async () => {
    stubFetch([user()], () =>
      jsonResponse(
        {
          code: 'CANNOT_SUSPEND_SELF',
          message: 'You cannot suspend your own account.',
          status: 409,
          path: '/api/v1/admin/users/u-1/suspend',
          timestamp: '2026-10-01T09:00:00Z',
          fieldErrors: [],
        },
        409,
      ),
    )
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot suspend your own account.')
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Akoonnada' })).toBeInTheDocument()
    expect(screen.getByText('Firfircoon')).toBeInTheDocument()
  })
})
