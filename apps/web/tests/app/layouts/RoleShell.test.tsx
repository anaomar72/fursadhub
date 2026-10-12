import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { RoleShell } from '../../../src/app/layouts/RoleShell'
import i18n from '../../../src/lib/i18n'

/**
 * Phase 5 / Phase 4.1 follow-up. The account pages render inside the person's own portal. An
 * account with no workspace at all — no membership anywhere, no student enrollment or profile — used
 * to fall through to the STUDENT sidebar, presenting an organization or university founder who had
 * not set anything up yet as a student. It now gets a neutral account shell instead.
 */

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(body === null ? 'null' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}
const notFound = () => jsonResponse({ code: 'NOT_FOUND', message: '', status: 404, path: '', timestamp: '', fieldErrors: [] }, 404)

let requested: string[] = []

function stub({ organization = false, enrollment = 'none' as 'none' | 'yes' | 'error', profile = false } = {}) {
  requested = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      requested.push(url)
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (url.includes('/admin/me')) return jsonResponse({ platformAdmin: false, roles: [] })
      if (url.includes('/organization-memberships/me')) {
        return jsonResponse(organization ? [{ membershipId: 'm', organizationId: 'org-1', role: 'RECRUITER', status: 'ACTIVE' }] : [])
      }
      if (url.includes('/university-memberships/me')) return notFound()
      if (url.includes('/students/me/enrollment')) {
        if (enrollment === 'yes') return jsonResponse({ id: 'e', verificationStatus: 'DRAFT' })
        if (enrollment === 'error') return jsonResponse({ code: 'X', message: '', status: 500, path: '', timestamp: '', fieldErrors: [] }, 500)
        return notFound()
      }
      if (url.includes('/students/me/profile')) return profile ? jsonResponse({ userId: 'u', fullName: 'Amina' }) : notFound()
      return jsonResponse({})
    }),
  )
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <AppProviders>
        <RoleShell>
          <p>Account page content</p>
        </RoleShell>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('RoleShell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('gives an account with no workspace a neutral account shell — never Student navigation', async () => {
    stub()
    renderShell()
    expect(await screen.findByText('Account page content')).toBeInTheDocument()

    const getStarted = screen.getAllByRole('link', { name: 'Get Started' })[0]
    expect(getStarted).toHaveAttribute('href', '/get-started')
    expect(screen.queryByRole('link', { name: 'Explore internships' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My applications' })).not.toBeInTheDocument()
  })

  it('keeps Student navigation for a student with an enrollment', async () => {
    stub({ enrollment: 'yes' })
    renderShell()
    expect(await screen.findAllByRole('link', { name: 'Explore internships' })).not.toHaveLength(0)
  })

  it('keeps Student navigation for a student with only a saved profile', async () => {
    stub({ profile: true })
    renderShell()
    expect(await screen.findAllByRole('link', { name: 'Explore internships' })).not.toHaveLength(0)
  })

  it('fails safe: a server error on the student lookup keeps the Student shell', async () => {
    stub({ enrollment: 'error' })
    renderShell()
    expect(await screen.findAllByRole('link', { name: 'Explore internships' }, { timeout: 4000 })).not.toHaveLength(0)
  })

  it('staff keep their own portal, and the student records are never probed for them', async () => {
    stub({ organization: true })
    renderShell()
    expect(await screen.findByText('Account page content')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Get Started' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Explore internships' })).not.toBeInTheDocument()
    expect(requested.some((url) => url.includes('/students/me/'))).toBe(false)
    const nav = screen.getAllByRole('navigation')[0]
    expect(within(nav).getAllByRole('link').length).toBeGreaterThan(0)
  })
})
