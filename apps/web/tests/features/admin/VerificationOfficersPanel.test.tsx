import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../../src/app/providers/AppProviders'
import { VerificationOfficersPanel } from '../../../src/features/admin/components/VerificationOfficersPanel'
import i18n from '../../../src/lib/i18n'
import type { VerificationOfficer } from '../../../src/features/admin/types'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function officer(overrides: Partial<VerificationOfficer> = {}): VerificationOfficer {
  return {
    userId: 'officer-1',
    displayName: 'Amina Yusuf Cali',
    username: 'amina.yusuf',
    email: 'amina@fursadhub.test',
    role: 'VERIFICATION_OFFICER',
    status: 'ACTIVE',
    ...overrides,
  }
}

function stubFetch(officers: VerificationOfficer[] = [officer()], overrides: Record<string, unknown> = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.includes('/admin/verification-officers') && method === 'GET') {
      return jsonResponse(officers)
    }
    if (url.includes('/reset-password')) {
      return jsonResponse(
        overrides.credential ?? {
          userId: 'officer-1',
          username: 'amina.yusuf',
          email: 'amina@fursadhub.test',
          temporaryPassword: 'Temp0rary99',
        },
      )
    }
    return jsonResponse(officer())
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <VerificationOfficersPanel />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('VerificationOfficersPanel', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('lists officers with the username they sign in with', async () => {
    stubFetch()
    renderPanel()

    expect(await screen.findByText('Amina Yusuf Cali')).toBeInTheDocument()
    expect(screen.getByText('amina.yusuf')).toBeInTheDocument()
  })

  /**
   * The escalation this whole phase is shaped around. The create form must offer no way to ask for
   * SUPER_ADMIN — not a disabled option, not a hidden one, nothing. The API has no role field, and
   * the form must not imply otherwise.
   */
  it('offers no role selector and no super admin option', async () => {
    stubFetch()
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'New officer' }))

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/super admin/i)).not.toBeInTheDocument()
    // The five fields B5.6 defines, and nothing else.
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Initial password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('sends no role field when creating an officer', async () => {
    const fetchMock = stubFetch()
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'New officer' }))
    await userEvent.type(screen.getByLabelText('Full name'), 'Nuur Maxamed')
    await userEvent.type(screen.getByLabelText('Username'), 'nuur.maxamed')
    await userEvent.type(screen.getByLabelText('Email'), 'nuur@fursadhub.test')
    await userEvent.type(screen.getByLabelText('Initial password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create officer' }))

    await waitFor(() => {
      // Matched on the URL too: AppProviders fires its own POST /auth/refresh on mount.
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          (init as RequestInit)?.method === 'POST' &&
          String(input).endsWith('/admin/verification-officers'),
      )
      expect(post).toBeDefined()
      const body = JSON.parse(String((post![1] as RequestInit).body))
      expect(body).not.toHaveProperty('role')
      expect(body.username).toBe('nuur.maxamed')
    })
  })

  /** The admin typed the password, so nothing is echoed back — and nothing is left in form state. */
  it('does not display the typed password after a successful create', async () => {
    stubFetch()
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'New officer' }))
    await userEvent.type(screen.getByLabelText('Full name'), 'Nuur Maxamed')
    await userEvent.type(screen.getByLabelText('Username'), 'nuur.maxamed')
    await userEvent.type(screen.getByLabelText('Email'), 'nuur@fursadhub.test')
    await userEvent.type(screen.getByLabelText('Initial password'), 'Password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create officer' }))

    await waitFor(() => expect(screen.queryByLabelText('Initial password')).not.toBeInTheDocument())
    expect(screen.queryByText('Password123')).not.toBeInTheDocument()
  })

  /**
   * An officer who still signs in by email gets the assignment control instead of the reset one,
   * because the backend refuses to reset a credential for an account with no username.
   */
  it('offers username assignment only to officers who lack one', async () => {
    stubFetch([officer({ username: null })])
    renderPanel()

    expect(await screen.findByRole('button', { name: 'Assign username' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument()
    expect(screen.getByText('Signs in with email — no username yet')).toBeInTheDocument()
  })

  it('warns that assigning a username is permanent before it happens', async () => {
    stubFetch([officer({ username: null })])
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Assign username' }))

    expect(screen.getByText(/permanent and cannot be changed later/i)).toBeInTheDocument()
  })

  /**
   * CLAUDE.md section 26A: the one-time credential lives in component state and nowhere durable.
   * A copy of it in browser storage would outlive the screen that warned it is shown once.
   */
  it('shows a reset password once without writing it to browser storage', async () => {
    stubFetch()
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }))
    // Scoped to the dialog: its confirm button carries the same label as the row button.
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('Temp0rary99')).toBeInTheDocument()
    expect(JSON.stringify(localStorage)).not.toContain('Temp0rary99')
    expect(JSON.stringify(sessionStorage)).not.toContain('Temp0rary99')

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Temp0rary99')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------- display name

  it('offers to set a name on a legacy officer who has none', async () => {
    stubFetch([officer({ displayName: null })])
    renderPanel()

    expect(await screen.findByText('No name set')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set name' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit name' })).not.toBeInTheDocument()
  })

  it('offers to replace a name an officer already has', async () => {
    stubFetch()
    renderPanel()

    expect(await screen.findByRole('button', { name: 'Edit name' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set name' })).not.toBeInTheDocument()
  })

  it('sends the corrected name and pre-fills the current one', async () => {
    const fetchMock = stubFetch()
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Edit name' }))
    const field = screen.getByLabelText('Full name')
    expect(field).toHaveValue('Amina Yusuf Cali')

    await userEvent.clear(field)
    await userEvent.type(field, 'Amina Yuusuf Cali')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          (init as RequestInit)?.method === 'POST' && String(input).endsWith('/display-name'),
      )
      expect(post).toBeDefined()
      expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({
        displayName: 'Amina Yuusuf Cali',
      })
    })
  })

  /** Replacement only: an empty name is rejected in the browser and never reaches the server. */
  it('refuses to submit a blank name', async () => {
    const fetchMock = stubFetch()
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Edit name' }))
    await userEvent.clear(screen.getByLabelText('Full name'))
    await userEvent.type(screen.getByLabelText('Full name'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('This field is required.')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith('/display-name')),
    ).toBe(false)
  })

  it('offers no way to clear a name', async () => {
    stubFetch()
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Edit name' }))

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove name/i })).not.toBeInTheDocument()
  })

  it('translates a protected root account into a specific message', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/reset-password')) {
        return jsonResponse({ code: 'PLATFORM_ROOT_ACCOUNT_PROTECTED', message: 'no' }, 403)
      }
      if (String(init?.method ?? 'GET') === 'GET') return jsonResponse([officer()])
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText(/Super admin accounts cannot be managed here/i)).toBeInTheDocument()
  })
})
