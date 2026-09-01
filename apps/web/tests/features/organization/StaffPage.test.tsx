import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { StaffPage } from '../../../src/features/organization/pages/StaffPage'
import { OrganizationMembershipContext } from '../../../src/features/organization/components/OrganizationMembershipContext'
import i18n from '../../../src/lib/i18n'
import type { OrganizationMemberResponse } from '../../../src/features/organization/types'

const ORGANIZATION_ID = 'org-1'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function member(overrides: Partial<OrganizationMemberResponse> = {}): OrganizationMemberResponse {
  return { membershipId: 'member-1', email: 'recruiter@example.test', role: 'RECRUITER', status: 'ACTIVE', ...overrides }
}

function stubFetch(members: OrganizationMemberResponse[] = [member()], onCommand?: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method && init.method !== 'GET') {
      return onCommand ? onCommand(url, init) : jsonResponse({ message: 'ok' })
    }
    if (url.includes('/members')) {
      return jsonResponse(members)
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
        <OrganizationMembershipContext.Provider value={{ organizationId: ORGANIZATION_ID, role: 'ORGANIZATION_ADMIN' }}>
          <StaffPage />
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('StaffPage (organization)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('offers only the assignable roles, never Organization Admin', async () => {
    stubFetch()
    renderPage()

    const select = (await screen.findByLabelText('Role')) as HTMLSelectElement
    const optionValues = Array.from(select.options).map((option) => option.value)
    expect(optionValues).toEqual(['RECRUITER', 'ORGANIZATION_SUPERVISOR'])
  })

  it('blocks submission when password and confirmation differ', async () => {
    stubFetch()
    renderPage()

    await userEvent.type(await screen.findByLabelText('Email address'), 'new-recruiter@example.test')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password124')
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('creates a staff account and clears the password fields', async () => {
    const fetchMock = stubFetch()
    renderPage()

    await userEvent.type(await screen.findByLabelText('Email address'), 'new-recruiter@example.test')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith('/members') && (init as RequestInit)?.method === 'POST',
      )
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
        email: 'new-recruiter@example.test',
        password: 'Password123',
        confirmPassword: 'Password123',
        role: 'RECRUITER',
      })
    })
    expect((screen.getByLabelText('Temporary password') as HTMLInputElement).value).toBe('')
  })

  it('shows a mapped error when the email already exists', async () => {
    stubFetch([member()], (url) =>
      url.endsWith('/members')
        ? jsonResponse(
            { code: 'STAFF_EMAIL_ALREADY_EXISTS', message: 'x', status: 409, path: '/x', timestamp: 'now', fieldErrors: [] },
            409,
          )
        : jsonResponse({ message: 'ok' }),
    )
    renderPage()

    await userEvent.type(await screen.findByLabelText('Email address'), 'dup@example.test')
    await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  })

  it('shows a status badge for each staff member', async () => {
    stubFetch([member({ status: 'PENDING_CONTACT_VERIFICATION' })])
    renderPage()

    expect(await screen.findByText('Awaiting email verification')).toBeInTheDocument()
  })

  it('suspends an active member', async () => {
    const fetchMock = stubFetch([member({ status: 'ACTIVE' })])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/member-1/suspend'))).toBe(true)
    })
  })

  it('offers reactivation for a suspended member instead of suspend', async () => {
    stubFetch([member({ status: 'SUSPENDED' })])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument()
  })

  it('reveals a one-time credential panel after resetting a password, and dismiss clears it', async () => {
    const fetchMock = stubFetch([member()], (url) =>
      url.includes('/reset-password')
        ? jsonResponse({ membershipId: 'member-1', email: 'recruiter@example.test', temporaryPassword: 'TempPass123' })
        : jsonResponse({ message: 'ok' }),
    )
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('TempPass123')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/member-1/reset-password'))).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('TempPass123')

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('TempPass123')).not.toBeInTheDocument()
  })

  it('posts the new role from the inline role-change form', async () => {
    const fetchMock = stubFetch([member({ role: 'RECRUITER' })])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Change role' }))
    const roleSelect = screen.getByLabelText('Role', { selector: '#role-member-1' })
    await userEvent.selectOptions(roleSelect, 'ORGANIZATION_SUPERVISOR')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/member-1/role'))
      expect(call).toBeDefined()
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({ role: 'ORGANIZATION_SUPERVISOR' })
    })
  })
})
