import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AppShell } from '../../../src/app/layouts/AppShell'
import type { NavSection } from '../../../src/app/layouts/navigation'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

const sections: NavSection[] = [
  {
    items: [
      { to: '/university/dashboard', label: 'Dashboard', icon: 'home' },
      { to: '/university/placements', label: 'Placements', icon: 'badgeCheck' },
    ],
  },
  { label: 'Manage', items: [{ to: '/university/staff', label: 'Staff', icon: 'users' }] },
]

let logoutCalls = 0

function renderShell(initialPath = '/university/placements') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppProviders>
        <Routes>
          <Route path="/university" element={<AppShell areaLabel="University" sections={sections} />}>
            <Route path="dashboard" element={<p>Dashboard page</p>} />
            <Route path="placements" element={<p>Placements page</p>} />
            <Route path="staff" element={<p>Staff page</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(async () => {
    logoutCalls = 0
    window.localStorage.clear()
    await i18n.changeLanguage('en')

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/logout')) {
          logoutCalls++
          return jsonResponse({ message: 'ok' })
        }
        if (url.includes('/auth/refresh')) {
          return jsonResponse({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 600 })
        }
        if (url.includes('/me')) {
          return jsonResponse({
            id: 'user-1',
            email: 'staff@example.test',
            status: 'ACTIVE',
            preferredLocale: 'en',
            emailVerifiedAt: '2026-01-01T00:00:00Z',
            hasAvatar: false,
          })
        }
        if (url.includes('/notifications/unread-count')) return jsonResponse({ unreadCount: 0 })
        return jsonResponse({})
      }),
    )
  })

  afterEach(async () => {
    await i18n.changeLanguage('en')
    window.localStorage.clear()
  })

  it('renders the sidebar destinations and the routed page inside the shell', async () => {
    renderShell()

    expect(await screen.findByText('Placements page')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(nav).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).toHaveAttribute('href', '/university/dashboard')
    expect(screen.getAllByRole('link', { name: 'Staff' })[0]).toHaveAttribute('href', '/university/staff')
  })

  it('marks the current destination active and shows it as the topbar page context', async () => {
    renderShell('/university/staff')

    await screen.findByText('Staff page')
    expect(screen.getAllByRole('link', { name: 'Staff' })[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).not.toHaveAttribute('aria-current')
    // The topbar title is derived from the active destination, so the two can never disagree.
    expect(screen.getByRole('banner')).toHaveTextContent('Staff')
  })

  it('keeps a nested route pointing at its parent destination', async () => {
    renderShell('/university/placements')

    await screen.findByText('Placements page')
    expect(screen.getAllByRole('link', { name: 'Placements' })[0]).toHaveAttribute('aria-current', 'page')
  })

  it('opens the mobile navigation drawer and closes it with Escape, restoring focus', async () => {
    const user = userEvent.setup()
    renderShell()
    await screen.findByText('Placements page')

    const trigger = screen.getByRole('button', { name: 'Open navigation' })
    await user.click(trigger)

    const drawer = await screen.findByRole('dialog', { name: 'Main navigation' })
    expect(drawer).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Main navigation' })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('closes the drawer once a destination is chosen', async () => {
    const user = userEvent.setup()
    renderShell()
    await screen.findByText('Placements page')

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = await screen.findByRole('dialog', { name: 'Main navigation' })

    await user.click(within(drawer).getByRole('link', { name: 'Dashboard' }))

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Main navigation' })).not.toBeInTheDocument()
  })

  it('signs out through the real logout endpoint and returns to login', async () => {
    const user = userEvent.setup()
    renderShell()
    await screen.findByText('Placements page')

    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0])

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(logoutCalls).toBe(1)
  })

  it('collapses and expands the desktop sidebar, remembering the choice', async () => {
    const user = userEvent.setup()
    renderShell()
    await screen.findByText('Placements page')

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(await screen.findByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(window.localStorage.getItem('fursadhub-sidebar-collapsed')).toBe('true')
  })

  it('translates its own chrome into Somali', async () => {
    await i18n.changeLanguage('so')
    renderShell()

    await screen.findByText('Placements page')
    expect(screen.getByRole('navigation', { name: 'Habraaca weyn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fur habraaca' })).toBeInTheDocument()
  })
})
