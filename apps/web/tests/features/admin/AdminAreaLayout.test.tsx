import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminAreaLayout } from '../../../src/features/admin/components/AdminAreaLayout'
import i18n from '../../../src/lib/i18n'
import type { PlatformRole } from '../../../src/features/admin/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function stubSession(roles: PlatformRole[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => jsonResponse({ platformAdmin: roles.length > 0, roles })),
  )
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin/organizations']}>
      <AppProviders>
        <Routes>
          <Route path="/admin" element={<AdminAreaLayout />}>
            <Route path="organizations" element={<p>Organizations page</p>} />
          </Route>
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('AdminAreaLayout', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('tells someone with no platform role that they have no access', async () => {
    stubSession([])
    renderLayout()

    expect(await screen.findByText('You do not have platform administration access.')).toBeInTheDocument()
    expect(screen.queryByText('Organizations page')).not.toBeInTheDocument()
  })

  it('shows every tab to a super admin', async () => {
    stubSession(['SUPER_ADMIN'])
    renderLayout()

    expect(await screen.findByRole('link', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Audit' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Platform roles' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Legal documents' })).toBeInTheDocument()
  })

  it('shows a verification officer only the verification tabs', async () => {
    stubSession(['VERIFICATION_OFFICER'])
    renderLayout()

    // What the role exists for.
    expect(await screen.findByRole('link', { name: 'Organizations' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escalations' })).toBeInTheDocument()

    // Not theirs. Note this is navigation only — the backend refuses these endpoints regardless,
    // so hiding them is a courtesy rather than the boundary (CLAUDE.md section 24).
    expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Audit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Platform roles' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
  })

  it('renders the routed page for an authorized admin', async () => {
    stubSession(['SUPER_ADMIN'])
    renderLayout()

    expect(await screen.findByText('Organizations page')).toBeInTheDocument()
  })
})
