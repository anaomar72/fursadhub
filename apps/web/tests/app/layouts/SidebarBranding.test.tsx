import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AppShell } from '../../../src/app/layouts/AppShell'
import type { SidebarBrand } from '../../../src/app/layouts/Sidebar'
import type { NavSection } from '../../../src/app/layouts/navigation'
import i18n from '../../../src/lib/i18n'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

const sections: NavSection[] = [
  {
    label: 'Main navigation',
    items: [
      { to: '/university/dashboard', label: 'Dashboard', icon: 'home' },
      { to: '/university/students', label: 'Students', icon: 'users' },
    ],
  },
]

function renderShell(brand?: SidebarBrand, tone: 'light' | 'navy' = 'navy') {
  return render(
    <MemoryRouter initialEntries={['/university/dashboard']}>
      <AppProviders>
        <Routes>
          <Route
            path="/university"
            element={<AppShell areaLabel="University" sections={sections} tone={tone} brand={brand} />}
          >
            <Route path="dashboard" element={<p>Dashboard page</p>} />
            <Route path="students" element={<p>Students page</p>} />
          </Route>
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

/**
 * The approved tenant-branded rail (design-reference/presentation-refresh-2026, references 08/09).
 *
 * <p>What matters here is not the styling but the RULE the reference README sets: tenant branding
 * must be data-driven, and no tenant from the mockups may ever be hard-coded.
 */
describe('tenant-branded sidebar', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('en')
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/refresh')) {
          return jsonResponse({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 600 })
        }
        if (url.includes('/me')) {
          return jsonResponse({
            id: 'u1',
            email: 'staff@example.edu',
            status: 'ACTIVE',
            preferredLocale: 'en',
            emailVerifiedAt: '2026-01-01T00:00:00Z',
            hasAvatar: false,
          })
        }
        return jsonResponse({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
      }),
    )
  })

  it('shows the tenant that the caller is actually a member of, not FursadHub', () => {
    renderShell({ name: 'Jamhuriya University', portalLabel: 'University Portal' })

    const rail = screen.getAllByRole('navigation', { name: 'Main navigation' })[0].closest('div')!
      .parentElement!
    expect(within(rail).getByText('Jamhuriya University')).toBeInTheDocument()
    expect(within(rail).getByText('University Portal')).toBeInTheDocument()
    // FursadHub attribution stays present, but subordinate to the tenant.
    expect(within(rail).getByText('Powered by')).toBeInTheDocument()
  })

  it('renders the tenant logo only when the backend reports one', () => {
    const { rerender } = renderShell({ name: 'Jamhuriya University', portalLabel: 'University Portal' })
    // No logo uploaded: the initial stands in rather than a broken image.
    expect(screen.queryByRole('img', { name: 'Jamhuriya University' })).not.toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/university/dashboard']}>
        <AppProviders>
          <Routes>
            <Route
              path="/university"
              element={
                <AppShell
                  areaLabel="University"
                  sections={sections}
                  tone="navy"
                  brand={{
                    name: 'Jamhuriya University',
                    portalLabel: 'University Portal',
                    logoUrl: 'https://api.example/public/universities/u-1/logo/document',
                  }}
                />
              }
            >
              <Route path="dashboard" element={<p>Dashboard page</p>} />
            </Route>
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    )

    const logos = document.querySelectorAll('img[src="https://api.example/public/universities/u-1/logo/document"]')
    expect(logos.length).toBeGreaterThan(0)
  })

  it('falls back to the FursadHub lockup when no tenant owns the area', () => {
    renderShell(undefined, 'light')

    // No tenant name, so no "powered by" strip — FursadHub is the primary identity here.
    expect(screen.queryByText('Powered by')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Fursad/).length).toBeGreaterThan(0)
  })

  it('marks the current destination for assistive technology, not by colour alone', () => {
    renderShell({ name: 'Jamhuriya University', portalLabel: 'University Portal' })

    expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link', { name: 'Students' })[0]).not.toHaveAttribute('aria-current')
  })
})
