import { render, screen, waitFor, within } from '@testing-library/react'
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
  return {
    membershipId: 'member-1',
    displayName: 'Aisha Noor',
    username: 'aisha.noor',
    email: 'aisha@example.test',
    role: 'RECRUITER',
    status: 'ACTIVE',
    ...overrides,
  }
}

let commands: { url: string; body: unknown }[] = []

function stubFetch(
  members: OrganizationMemberResponse[] = [member()],
  onCommand?: (url: string, init: RequestInit) => Promise<Response> | null,
) {
  commands = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method && init.method !== 'GET') {
        commands.push({ url, body: init.body ? JSON.parse(String(init.body)) : null })
        const handled = onCommand?.(url, init)
        if (handled) return handled
        return jsonResponse(member())
      }
      if (url.includes('/members')) return jsonResponse(members)
      if (url.includes('/placements')) return jsonResponse([])
      return jsonResponse({})
    }),
  )
}

function renderPage(role: 'ORGANIZATION_ADMIN' | 'RECRUITER' = 'ORGANIZATION_ADMIN') {
  return render(
    <MemoryRouter>
      <AppProviders>
        <OrganizationMembershipContext.Provider value={{ organizationId: ORGANIZATION_ID, role }}>
          <StaffPage />
        </OrganizationMembershipContext.Provider>
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('Managed staff identity (Backend Phase B5 / B5.5)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  describe('display name', () => {
    it('shows the display name as the primary identity, with the email beside it', async () => {
      stubFetch([member({ displayName: 'Aisha Noor', email: 'aisha@example.test' })])
      renderPage()

      const name = await screen.findByText('Aisha Noor')
      expect(name).toBeInTheDocument()
      expect(screen.getByText('aisha@example.test')).toBeInTheDocument()
    })

    /**
     * A pre-B5 account genuinely has no name and FursadHub does not know one. Deriving "A. Hassan"
     * from `ahassan@…` would invent an identity for a real person out of a mailbox string.
     */
    it('falls back to the email verbatim for a legacy account, never a name derived from it', async () => {
      stubFetch([member({ displayName: null, email: 'ahassan@example.test' })])
      renderPage()

      expect(await screen.findByText('ahassan@example.test')).toBeInTheDocument()
      expect(screen.queryByText(/^A\.? ?Hassan$/i)).not.toBeInTheDocument()
      expect(screen.queryByText('ahassan')).not.toBeInTheDocument()
    })

    it('sends an explicit null when an admin clears the name', async () => {
      stubFetch([member({ displayName: 'Aisha Noor' })])
      renderPage()

      // Wait on the roster itself, then query the control synchronously. This is the file's first
      // *ByRole query, and the first one in a worker is expensive (accessible-name and computed-style
      // warm-up); inside findByRole's 1s polling budget it timed out under full-suite CPU load.
      await screen.findByText('Aisha Noor')
      await userEvent.click(screen.getByRole('button', { name: 'Change name' }))
      const field = screen.getByLabelText('Full name')
      await userEvent.clear(field)
      await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

      await waitFor(() => expect(commands.some((command) => command.url.includes('/display-name'))).toBe(true))
      const command = commands.find((entry) => entry.url.includes('/display-name'))!
      expect(command.body).toEqual({ displayName: null })
    })
  })

  describe('username', () => {
    it('shows an existing username read-only, with no rename control', async () => {
      stubFetch([member({ username: 'aisha.noor' })])
      renderPage()

      expect(await screen.findByText('aisha.noor')).toBeInTheDocument()
      // B5.5 makes the username permanent — the server answers a second attempt with
      // USERNAME_IMMUTABLE, so no control offers one.
      expect(screen.queryByRole('button', { name: 'Assign username' })).not.toBeInTheDocument()
    })

    it('offers assignment only while the account has none', async () => {
      stubFetch([member({ username: null })])
      renderPage()

      expect(await screen.findByText('No username yet')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Assign username' })).toBeInTheDocument()
    })

    it('assigns a username to a legacy account through the B5.5 command', async () => {
      stubFetch([member({ username: null })])
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: 'Assign username' }))
      await userEvent.type(screen.getByLabelText('Username'), 'aisha.noor')
      await userEvent.click(screen.getByRole('button', { name: 'Assign permanently' }))

      await waitFor(() => expect(commands.some((command) => command.url.endsWith('/username'))).toBe(true))
      expect(commands.find((entry) => entry.url.endsWith('/username'))!.body).toEqual({ username: 'aisha.noor' })
    })

    it('surfaces the backend duplicate-username error by its stable code', async () => {
      stubFetch([member({ username: null })], (url) =>
        url.endsWith('/username')
          ? jsonResponse(
              { code: 'USERNAME_ALREADY_EXISTS', message: 'Taken.', status: 409, path: '', timestamp: '', fieldErrors: [] },
              409,
            )
          : null,
      )
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: 'Assign username' }))
      await userEvent.type(screen.getByLabelText('Username'), 'taken.name')
      await userEvent.click(screen.getByRole('button', { name: 'Assign permanently' }))

      expect(await screen.findByText('That username is already taken.')).toBeInTheDocument()
    })
  })

  describe('who may be managed', () => {
    /**
     * Every staff command calls `requireAssignableRole` on the membership's CURRENT role, so an
     * ORGANIZATION_ADMIN founder is refused with STAFF_ROLE_NOT_ASSIGNABLE. Offering the controls
     * would only produce a 403.
     */
    it('offers no identity controls on the founding admin row', async () => {
      stubFetch([member({ membershipId: 'admin-1', role: 'ORGANIZATION_ADMIN', displayName: 'Founder' })])
      renderPage()

      await screen.findByText('Founder')
      expect(screen.queryByRole('button', { name: 'Change name' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Assign username' })).not.toBeInTheDocument()
    })

    it('offers no identity controls to a recruiter reading the roster', async () => {
      stubFetch([member({ username: null })])
      renderPage('RECRUITER')

      await screen.findByText('Aisha Noor')
      expect(screen.queryByRole('button', { name: 'Change name' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Assign username' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add staff account' })).not.toBeInTheDocument()
    })
  })

  describe('the roster never leaks credentials', () => {
    it('renders no stored credential for any staff member', async () => {
      // A response that wrongly carried credential material must not reach the page. The roster
      // renders identity, role and status — never a password, a hash or a token.
      stubFetch([
        {
          ...member(),
          password: 'Password123',
          passwordHash: 'bcrypt-hash-abcdefghijklmnop',
          refreshToken: 'rt-secret',
        } as never,
      ])
      const { container } = renderPage()

      await screen.findByText('Aisha Noor')
      expect(container.textContent).not.toContain('Password123')
      expect(container.textContent).not.toContain('bcrypt-hash-')
      expect(container.textContent).not.toContain('rt-secret')
      expect(container.querySelector('input[type="password"]')).toBeNull()
    })
  })

  describe('creation', () => {
    it('sends the display name when one was typed', async () => {
      stubFetch([])
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: 'Add staff account' }))
      await userEvent.type(screen.getByLabelText('Full name'), 'New Recruiter')
      await userEvent.type(screen.getByLabelText('Email address'), 'new@example.test')
      await userEvent.type(screen.getByLabelText('Username'), 'new.recruiter')
      await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
      await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
      await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

      const created = await waitFor(() => {
        const call = commands.find((command) => command.url.endsWith('/members'))
        expect(call).toBeDefined()
        return call!
      })
      expect(created.body).toMatchObject({ displayName: 'New Recruiter', username: 'new.recruiter' })
    })

    it('omits the display name entirely when it was left blank', async () => {
      stubFetch([])
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: 'Add staff account' }))
      await userEvent.type(screen.getByLabelText('Email address'), 'new@example.test')
      await userEvent.type(screen.getByLabelText('Username'), 'new.recruiter')
      await userEvent.type(screen.getByLabelText('Temporary password'), 'Password123')
      await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
      await userEvent.click(screen.getByRole('button', { name: 'Create staff account' }))

      const created = await waitFor(() => {
        const call = commands.find((command) => command.url.endsWith('/members'))
        expect(call).toBeDefined()
        return call!
      })
      // Backend Phase B5 makes displayName optional; an empty string is not a name the admin chose.
      expect(created.body).not.toHaveProperty('displayName')
    })
  })

  describe('one-time credential surface', () => {
    it('names the credential the account actually signs in with', async () => {
      stubFetch([member({ username: 'aisha.noor' })], (url) =>
        url.endsWith('/reset-password')
          ? jsonResponse({
              membershipId: 'member-1',
              username: 'aisha.noor',
              email: 'aisha@example.test',
              temporaryPassword: 'Temp-9xQ2',
            })
          : null,
      )
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }))
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset password' }))

      const panel = await screen.findByRole('status')
      expect(within(panel).getByText('aisha.noor')).toBeInTheDocument()
      expect(within(panel).getByText('Temp-9xQ2')).toBeInTheDocument()
    })

    it('falls back to the email for a legacy account that still signs in by email', async () => {
      stubFetch([member({ username: null })], (url) =>
        url.endsWith('/reset-password')
          ? jsonResponse({
              membershipId: 'member-1',
              username: null,
              email: 'legacy@example.test',
              temporaryPassword: 'Temp-9xQ2',
            })
          : null,
      )
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }))
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset password' }))

      const panel = await screen.findByRole('status')
      expect(within(panel).getByText('legacy@example.test')).toBeInTheDocument()
    })
  })
})
