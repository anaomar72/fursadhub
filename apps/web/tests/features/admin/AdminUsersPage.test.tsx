import { render, screen, within } from '@testing-library/react'
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

function stubFetch(users: AdminUser[] = [user()]) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/admin/users')) {
      return jsonResponse({
        content: users,
        page: 0,
        size: 25,
        totalElements: users.length,
        totalPages: 1,
      })
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

  it('links each account to its own page rather than acting on it in the row', async () => {
    stubFetch()
    renderPage()

    expect(await screen.findByRole('link', { name: 'student@example.test' })).toHaveAttribute(
      'href',
      '/admin/users/u-1',
    )
    // Suspension moved to the account page, where the administrator can see what they are changing.
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument()
  })

  it('offers no impersonation control anywhere', async () => {
    stubFetch()
    renderPage()

    await screen.findByText('student@example.test')
    expect(
      screen.queryByRole('button', { name: /impersonate|sign in as|act as/i }),
    ).not.toBeInTheDocument()
  })

  it('sends the search and status filters to the server instead of filtering a page locally', async () => {
    const fetchMock = stubFetch()
    renderPage()
    await screen.findByText('student@example.test')

    await userEvent.selectOptions(screen.getByLabelText('Account status'), 'SUSPENDED')

    const requested = fetchMock.mock.calls.map(([url]) => String(url))
    expect(requested.some((url) => url.includes('status=SUSPENDED'))).toBe(true)
  })

  it('renders in Somali when the UI language is Somali', async () => {
    stubFetch()
    await i18n.changeLanguage('so')
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Akoonnada' })).toBeInTheDocument()
    expect(within(await screen.findByRole('table')).getByText('Firfircoon')).toBeInTheDocument()
  })
})
