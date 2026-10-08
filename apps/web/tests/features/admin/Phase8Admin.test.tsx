import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { AdminOrganizationsPage } from '../../../src/features/admin/pages/AdminOrganizationsPage'
import { AdminOrganizationDetailPage } from '../../../src/features/admin/pages/AdminOrganizationDetailPage'
import { AdminUserDetailPage } from '../../../src/features/admin/pages/AdminUserDetailPage'
import { AdminPlatformRolesPage } from '../../../src/features/admin/pages/AdminPlatformRolesPage'
import { AdminPrivacyRequestsPage } from '../../../src/features/admin/pages/AdminPrivacyRequestsPage'
import { AdminLegalDocumentsPage } from '../../../src/features/admin/pages/AdminLegalDocumentsPage'
import { buildAdminNav } from '../../../src/features/admin/components/adminNavigation'
import i18n from '../../../src/lib/i18n'
import type { PlatformRole } from '../../../src/features/admin/types'

/** Phase 8: an operations-first console, explicit privilege changes and consequence-stating actions. */

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

let calls: { url: string; method: string; body?: string }[] = []

function stub(routes: [RegExp, unknown][]) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body as string | undefined })
      if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 't', tokenType: 'Bearer', expiresIn: 600 })
      if (method !== 'GET') return jsonResponse({})
      const hit = routes.find(([pattern]) => pattern.test(url))
      return jsonResponse(hit ? hit[1] : {})
    }),
  )
}

const posted = (fragment: string) => calls.find((call) => call.method === 'POST' && call.url.includes(fragment))
const page = (content: unknown[]) => ({ content, page: 0, size: 25, totalElements: content.length, totalPages: 1 })

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function renderAt(path: string, route: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <Routes>
          <Route path={route} element={<>{element}<Location /></>} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  vi.restoreAllMocks()
  await i18n.changeLanguage('en')
})

describe('navigation', () => {
  const labels = (roles: PlatformRole[]) => buildAdminNav(i18n.t, { platformAdmin: true, roles }).map((section) => section.label)

  it('groups the Super Admin console by kind of work, in a fixed order', () => {
    expect(labels(['SUPER_ADMIN'])).toEqual([undefined, 'Verification', 'Operations', 'Platform', 'Account'])
  })

  it('gives a verification officer only their queues — no empty overview group, nothing Super Admin', () => {
    const sections = buildAdminNav(i18n.t, { platformAdmin: true, roles: ['VERIFICATION_OFFICER'] })
    expect(sections.map((section) => section.label)).toEqual(['Verification', 'Account'])
    expect(sections.flatMap((section) => section.items.map((item) => item.to))).not.toContain('/admin/platform-roles')
  })
})

describe('filters in the URL', () => {
  it('opens the organization queue on SUBMITTED, and writes other choices to the URL', async () => {
    stub([[/\/admin\/organizations/, page([])]])
    renderAt('/admin/organizations', '/admin/organizations', <AdminOrganizationsPage />)

    await waitFor(() => expect(calls.some((call) => call.url.includes('status=SUBMITTED'))).toBe(true))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), '')
    expect(screen.getByTestId('location')).toHaveTextContent('?status=ALL')
    await waitFor(() => expect(calls.some((call) => call.url.includes('/admin/organizations?page=0'))).toBe(true))
  })

  it('reads the status from the URL, so a dashboard link lands on a filtered list', async () => {
    stub([[/\/admin\/organizations/, page([])]])
    renderAt('/admin/organizations?status=VERIFIED', '/admin/organizations', <AdminOrganizationsPage />)

    await waitFor(() => expect(calls.some((call) => call.url.includes('status=VERIFIED'))).toBe(true))
    expect(calls.some((call) => call.url.includes('status=SUBMITTED'))).toBe(false)
  })
})

describe('institution decisions', () => {
  const verified = {
    id: 'org-1', name: 'TechSolutions', slug: 't', type: 'COMPANY', registrationNumber: null, website: null,
    verificationStatus: 'VERIFIED', verifiedAt: '2026-08-01T00:00:00Z', hasEvidence: true,
    evidenceUploadedAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
  }

  it('keeps suspension and revocation apart, and states that suspension cannot be reversed', async () => {
    stub([[/\/admin\/organizations\/org-1$/, verified]])
    renderAt('/admin/organizations/org-1', '/admin/organizations/:organizationId', <AdminOrganizationDetailPage />)

    const decision = await screen.findByRole('complementary', { name: 'Verification decision' })
    expect(within(decision).getByText('Withdraw verification')).toBeInTheDocument()
    await userEvent.click(within(decision).getByRole('button', { name: 'Suspend' }))

    const dialog = await screen.findByRole('dialog', { name: 'Suspend this organization?' })
    expect(dialog).toHaveTextContent(/no reinstatement from suspension/)
    expect(within(dialog).getByRole('button', { name: 'Suspend' })).toBeDisabled()
    expect(posted('/suspend')).toBeUndefined()
  })
})

describe('accounts', () => {
  const account = { id: 'u-1', email: 'officer@example.test', status: 'ACTIVE', preferredLocale: 'en', emailVerifiedAt: null, createdAt: '2026-07-01T00:00:00Z' }

  it('shows the platform grants this account holds, and keeps suspension in its own danger panel', async () => {
    stub([
      [/\/admin\/users\/u-1$/, account],
      [/\/admin\/platform-roles/, [
        { id: 'g1', userId: 'u-1', email: account.email, role: 'VERIFICATION_OFFICER', grantedAt: '2026-08-01T00:00:00Z', revokedAt: null, active: true },
        { id: 'g2', userId: 'someone-else', email: 'x@example.test', role: 'SUPER_ADMIN', grantedAt: '2026-08-01T00:00:00Z', revokedAt: null, active: true },
      ]],
    ])
    renderAt('/admin/users/u-1', '/admin/users/:userId', <AdminUserDetailPage />)

    const roles = (await screen.findByRole('heading', { name: 'Platform roles' })).closest('section') as HTMLElement
    await waitFor(() => expect(within(roles).getByText('Verification officer')).toBeInTheDocument())
    // Only this account's grants.
    expect(within(roles).queryByText('Super admin')).not.toBeInTheDocument()

    const danger = screen.getByRole('heading', { name: 'Suspend access' }).closest('section') as HTMLElement
    expect(within(danger).getByRole('button', { name: 'Suspend account' })).toBeInTheDocument()
  })
})

describe('privilege changes and terminal outcomes are confirmed', () => {
  it('confirms a platform-role grant, naming the account and what the role can do', async () => {
    stub([[/\/admin\/platform-roles/, []], [/\/admin\/verification-officers/, []]])
    renderAt('/admin/platform-roles', '/admin/platform-roles', <AdminPlatformRolesPage />)

    await userEvent.type(await screen.findByLabelText('Account ID'), 'acc-42')
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'SUPER_ADMIN')
    await userEvent.click(screen.getByRole('button', { name: 'Grant role' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('acc-42')
    expect(dialog).toHaveTextContent(/full platform authority/)
    expect(posted('/admin/platform-roles')).toBeUndefined()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Grant role' }))
    await waitFor(() => expect(posted('/admin/platform-roles')).toBeDefined())
  })

  it('confirms completing a privacy request, with the action named on the button', async () => {
    stub([[/\/admin\/privacy-requests/, page([{ id: 'p1', requestType: 'ACCESS', state: 'IN_REVIEW', details: 'Please send my data', submittedAt: '2026-09-01T00:00:00Z', reviewedAt: null, resolutionNote: null, userId: 'u', userEmail: 'p@example.test' }])]])
    renderAt('/admin/privacy-requests?status=IN_REVIEW', '/admin/privacy-requests', <AdminPrivacyRequestsPage />)

    await userEvent.click(await screen.findByRole('button', { name: /Open request/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Mark completed' }))
    expect(await screen.findByText(/Marking the request completed is final/)).toBeInTheDocument()
    expect(posted('/complete')).toBeUndefined()
  })

  it('confirms publishing a legal document, because a published version is immutable', async () => {
    stub([[/\/admin\/legal-documents/, []]])
    renderAt('/admin/legal-documents', '/admin/legal-documents', <AdminLegalDocumentsPage />)

    await userEvent.type(await screen.findByLabelText('Version'), '2026-10')
    await userEvent.type(screen.getByLabelText('Title'), 'Terms')
    await userEvent.type(screen.getByLabelText('Text'), 'The terms.')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))

    const dialog = await screen.findByRole('dialog', { name: 'Publish this version?' })
    expect(dialog).toHaveTextContent(/can never be edited or deleted/)
    expect(posted('/admin/legal-documents')).toBeUndefined()
  })
})

describe('English / Somali parity', () => {
  function leaves(value: unknown, prefix = ''): string[] {
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k))
    return [prefix]
  }

  it('has every admin console string in Somali', () => {
    const en = leaves(i18n.getResourceBundle('en', 'admin'))
    const so = new Set(leaves(i18n.getResourceBundle('so', 'admin')))
    expect(en.filter((key) => !so.has(key))).toEqual([])
  })
})
